"use client";
import {useEffect,useState} from "react";
import type {CandidateRecord} from "@/packages/candidates";
import {placementPolygon} from "@/packages/roof-geometry";
import {
 addDesignShape,addOwnerFootprintShape,emptyDesignDocument,removeDesignShape,addDraftDoor,setDraftRoofParameters,
 sourceBuildingOwners,validateDesignDocument,updateDesignShapePolygon,snapDesignPoint,partitionDesignShape,packDraftRooms,moveDesignWall,type DesignDocument,type DesignShape,type P2
} from "@/packages/candidates/design-document";
import {solveUniversalDesign} from "@/packages/candidates/design-solving";
type Props={candidate:CandidateRecord;document?:DesignDocument;onSave:(doc:DesignDocument)=>void};
export function UniversalDesignEditorV2({candidate,document,onSave}:Props){
 const owners=sourceBuildingOwners(candidate);
 const [ownerId,setOwnerId]=useState(owners[0]?.id??"");
 const [kind,setKind]=useState<DesignShape["kind"]>("FLOOR_PLATE");
 const [story,setStory]=useState<"GROUND"|"UPPER"|"OTHER">("GROUND");
 const [label,setLabel]=useState("New shape");
 const [vertices,setVertices]=useState("[[0,0],[10,0],[10,10],[0,10]]");
 const [note,setNote]=useState("");
 const [editingShapeId,setEditingShapeId]=useState("");
 const [snapGrid,setSnapGrid]=useState("0.5");
 const [partitionAxis,setPartitionAxis]=useState<"X"|"Y">("X");
 const [partitionOffset,setPartitionOffset]=useState("");
 const [roomLabels,setRoomLabels]=useState("Living, Kitchen, Bedroom");
 const [packAxis,setPackAxis]=useState<"X"|"Y">("X");
 const [drag,setDrag]=useState<{shapeId:string;index:number;point:P2}|null>(null);
 const [wallDrag,setWallDrag]=useState<{shapeId:string;index:number;start:P2;delta:P2}|null>(null);
 const [wallIndex,setWallIndex]=useState(0);
 const [doorWidth,setDoorWidth]=useState("3");
 const [selectedRoofId,setSelectedRoofId]=useState("");
 const [plateZ,setPlateZ]=useState("");
 const [pitchRise,setPitchRise]=useState("");
 const [pitchRun,setPitchRun]=useState("");
 const [overhang,setOverhang]=useState("");
 const [fasciaDepth,setFasciaDepth]=useState("");
 const [fasciaThickness,setFasciaThickness]=useState("");
 const [ridgeDirection,setRidgeDirection]=useState<"LONG_AXIS"|"SHORT_AXIS">("LONG_AXIS");
 useEffect(()=>{setOwnerId(owners[0]?.id??"");setNote("");},[candidate.id]);
 const activeOwner=owners.find(o=>o.id===ownerId);
 const roof=kind==="ROOF_ZONE"||kind==="GABLE_ZONE";
 const base=document??emptyDesignDocument(candidate);
 const stale=Boolean(document&&(()=>{try{validateDesignDocument(candidate,document);return false}catch{return true}})());
 const solution=stale?null:solveUniversalDesign(candidate,base);
 const walls=solution?.floors.filter(f=>f.ownerId===ownerId&&f.story===story).flatMap(f=>f.wallSegments)??[];
 const wall=walls[wallIndex]??walls[0];
 const roofShapes=base.shapes.filter(s=>s.ownerId===ownerId&&s.kind==="GABLE_ZONE");
 const chosenRoof=roofShapes.find(s=>s.id===selectedRoofId)??roofShapes[0];
 const preview=solution?.roofs.find(r=>r.ownerId===ownerId);
 function putDoor(){
  try{
   if(stale||!wall)throw Error("No shared wall. Create two adjacent room/circulation shapes first.");
   const width=Number(doorWidth);
   if(!Number.isFinite(width)||width<=0||width>wall.lengthFt)throw Error("Door width must fit inside the shared modeled wall.");
   const center:P2=[(wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2];
   const next=addDraftDoor(candidate,base,{fromRoomId:wall.roomA,toRoomId:wall.roomB,center,widthFt:width,story});
   const checked=solveUniversalDesign(candidate,next);
   const status=checked.floors.find(f=>f.ownerId===ownerId&&f.story===story)?.doors.at(-1)?.status;
   if(status!=="GEOMETRY_CHECKED")throw Error("Door does not fit modeled shared wall.");
   onSave(next);setNote("Door geometry checked. Egress and building-code sizing are still unverified.");
  }catch(e){setNote(e instanceof Error?e.message:"Door placement invalid");}
 }
 function setRoof(){
  try{
   if(stale||!chosenRoof)throw Error("Create a GABLE ZONE draft first.");
   if([plateZ,pitchRise,pitchRun,overhang].some(x=>!x.trim()))throw Error("Enter source plate height, roof rise, run and chosen overhang; no defaults are assumed.");
   const next=setDraftRoofParameters(candidate,base,{shapeId:chosenRoof.id,plateZFt:Number(plateZ),pitchRise:Number(pitchRise),pitchRun:Number(pitchRun),overhangFt:Number(overhang),ridgeDirection,
    fasciaDepthFt:fasciaDepth.trim()?Number(fasciaDepth):undefined,
    fasciaThicknessFt:fasciaThickness.trim()?Number(fasciaThickness):undefined});
   onSave(next);setNote("Roof design parameters saved for this owner. Solver previews its real ridge/sections when topology is supported; no locked roof is created.");
  }catch(e){setNote(e instanceof Error?e.message:"Roof design parameters invalid");}
 }
 function save(fullFootprint:boolean){
  try{
   if(stale)throw Error("Candidate changed; create a new design document or reconcile the old shapes before editing.");
   if(!activeOwner)throw Error("Choose a building owner.");
   let next:DesignDocument;
   const args={ownerId,label:label.trim()||kind,kind,story:roof?null:story} as const;
   if(fullFootprint)next=addOwnerFootprintShape(candidate,base,args);
   else {
    const parsed:unknown=JSON.parse(vertices);
    if(!Array.isArray(parsed))throw Error("Enter a valid array of model XY points.");
    const polygon=parsed as P2[];
    next=addDesignShape(candidate,base,{...args,polygon});
   }
   onSave(next);setNote("Saved source-bound draft shape. Regenerate the report to attach it.");
  }catch(e){setNote(e instanceof Error?e.message:"Cannot save shape.");}
 }
 function drop(id:string){
  try{if(stale)throw Error("Source geometry changed; prior shapes cannot be edited.");onSave(removeDesignShape(candidate,base,id));setNote("Shape removed from the design document.");}
  catch(e){setNote(e instanceof Error?e.message:"Cannot remove shape.");}
 }
 function partitionSelected(){
  try{
   if(stale)throw Error("Design source changed; partition unavailable");
   if(!editingShapeId)throw Error("Choose a floor shape to partition");
   if(!partitionOffset.trim())throw Error("Enter the model-space cut coordinate");
   const value=Number(partitionOffset);
   const next=partitionDesignShape(candidate,base,editingShapeId,partitionAxis,value);
   onSave(next);setEditingShapeId("");setNote("Floor split into two source-validated polygons; affected doors cleared for re-authoring.");
  }catch(error){setNote(error instanceof Error?error.message:"Partition failed");}
 }
 function packRooms(){
  try{
   if(stale)throw Error("Design source changed; packing unavailable");
   if(!editingShapeId)throw Error("Select a rectangular FLOOR PLATE");
   const labels=roomLabels.split(",").map(s=>s.trim()).filter(Boolean);
   const next=packDraftRooms(candidate,base,editingShapeId,labels,packAxis);
   onSave(next);setEditingShapeId("");setNote("Created source-contained room seed polygons; adjust walls and author doors/stairs before claiming program feasibility.");
  }catch(error){setNote(error instanceof Error?error.message:"Unable to pack rooms");}
 }
 function pointerPoint(e:React.PointerEvent<SVGCircleElement|SVGLineElement>):P2|null{
  const svg=e.currentTarget.ownerSVGElement;
  const matrix=svg?.getScreenCTM();
  if(!svg||!matrix)return null;
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const mapped=p.matrixTransform(matrix.inverse());
  return [mapped.x,mapped.y];
 }
 function beginWall(e:React.PointerEvent<SVGLineElement>,shapeId:string,index:number){
  if(stale||drag)return;
  const start=pointerPoint(e);if(!start)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  setWallDrag({shapeId,index,start,delta:[0,0]});
 }
 function moveWall(e:React.PointerEvent<SVGLineElement>){
  if(!wallDrag)return;
  const point=pointerPoint(e);if(!point)return;
  try{setWallDrag({...wallDrag,delta:snapDesignPoint([point[0]-wallDrag.start[0],point[1]-wallDrag.start[1]],Number(snapGrid))});}
  catch(error){setNote(error instanceof Error?error.message:"Invalid wall drag");}
 }
 function endWall(e:React.PointerEvent<SVGLineElement>){
  if(!wallDrag)return;
  const point=pointerPoint(e);
  const current={...wallDrag,delta:point?snapDesignPoint([point[0]-wallDrag.start[0],point[1]-wallDrag.start[1]],Number(snapGrid)):wallDrag.delta};setWallDrag(null);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  try{
   if(stale)throw Error("Source changed; wall drag cancelled");
   if(Math.hypot(...current.delta)<1e-6)return;
   onSave(moveDesignWall(candidate,base,current.shapeId,current.index,current.delta));
   setNote("Wall endpoints moved; all derived roof/floor previews require re-solve.");
  }catch(error){setNote(error instanceof Error?error.message:"Invalid wall movement rejected");}
 }
 function keyMoveVertex(e:React.KeyboardEvent<SVGCircleElement>,shapeId:string,index:number){
  const offsets:Record<string,P2>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=offsets[e.key];
  if(!direction||stale)return;
  e.preventDefault();
  const shape=base.shapes.find(x=>x.id===shapeId);
  if(!shape)return;
  try{
   const increment=Number(snapGrid);
   const start=shape.polygon[index];
   const p=snapDesignPoint([start[0]+direction[0]*increment,start[1]+direction[1]*increment],increment);
   onSave(updateDesignShapePolygon(candidate,base,shapeId,shape.polygon.map((v,i)=>i===index?p:v)));
   setNote("Vertex moved by keyboard grid step; dependent solutions must be rechecked.");
  }catch(error){setNote(error instanceof Error?error.message:"Keyboard move rejected");}
 }
 function beginVertex(e:React.PointerEvent<SVGCircleElement>,shapeId:string,index:number){
  if(stale)return;
  const shape=base.shapes.find(s=>s.id===shapeId);if(!shape)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  setDrag({shapeId,index,point:[...shape.polygon[index]] as P2});
 }
 function moveVertex(e:React.PointerEvent<SVGCircleElement>){
  if(!drag)return;
  try{
   const point=pointerPoint(e);if(!point)return;
   setDrag({...drag,point:snapDesignPoint(point,Number(snapGrid))});
  }catch(error){setNote(error instanceof Error?error.message:"Invalid vertex coordinate");}
 }
 function endVertex(e:React.PointerEvent<SVGCircleElement>){
  if(!drag)return;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  const finalPoint=pointerPoint(e);
  const current={...drag,point:finalPoint?snapDesignPoint(finalPoint,Number(snapGrid)):drag.point};setDrag(null);
  try{
   if(stale)throw Error("Design source changed; vertex edit cancelled.");
   const shape=base.shapes.find(s=>s.id===current.shapeId);
   if(!shape)throw Error("Edited shape no longer exists.");
   const polygon=shape.polygon.map((p,i)=>i===current.index?current.point:p);
   const next=updateDesignShapePolygon(candidate,base,shape.id,polygon);
   onSave(next);setNote("Vertex moved on "+snapGrid+" ft grid; design revision incremented. Dependent geometry must be solved again.");
  }catch(error){setNote(error instanceof Error?error.message:"Vertex violates source geometry; change rejected.");}
 }
 const shell=activeOwner?placementPolygon(activeOwner):[];
 const coords=shell.flatMap(p=>[p[0],p[1]]);
 const xs=shell.map(p=>p[0]),ys=shell.map(p=>p[1]);
 const bb=xs.length?[Math.min(...xs)-3,Math.min(...ys)-3,Math.max(...xs)-Math.min(...xs)+6,Math.max(...ys)-Math.min(...ys)+6]:[0,0,100,100];
 const pts=(polygon:ReadonlyArray<readonly[number,number]>)=>polygon.map(p=>p[0]+","+p[1]).join(" ");
 return <section id="universal-design-editor" className="wb-panel" data-universal-design-editor="v1">
  <div className="section-heading"><div><p className="eyebrow">UNIVERSAL DESIGN WORKSPACE · PHASE 0</p><h2>Create shapes for any saved design</h2></div><span className="mode-pill">{base.shapes.length} DRAFT SHAPES</span></div>
  <p className="microcopy">One editor for every candidate: attach footprint-derived floor plates, rooms, circulation areas, stairs, garage regions and roof-zone concepts to the exact source revision. Nothing is treated as a verified room plan or solved roof until separately validated.</p>
  {stale&&<div className="candidate-warning-box"><strong>Source revision changed</strong><p>Attached shapes are stale. Reconcile against the new footprint before reuse. The customer report will refuse stale geometry.</p></div>}
  <div className="candidate-detail-grid">
   <div>
    <label className="microcopy" htmlFor="design-owner">Building owner</label>
    <select id="design-owner" value={ownerId} onChange={e=>setOwnerId(e.target.value)}>{owners.map(o=><option key={o.id} value={o.id}>{o.label} · {o.kind}</option>)}</select>
    <label className="microcopy" htmlFor="design-kind">New shape type</label>
    <select id="design-kind" value={kind} onChange={e=>setKind(e.target.value as DesignShape["kind"])}>
     {(["FLOOR_PLATE","ROOM","GARAGE_AREA","CIRCULATION","STAIR_ZONE","ROOF_ZONE","GABLE_ZONE"] as const).map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}
    </select>
    {!roof&&<><label className="microcopy" htmlFor="design-story">Floor</label><select id="design-story" value={story} onChange={e=>setStory(e.target.value as typeof story)}><option value="GROUND">Ground</option><option value="UPPER">Upper</option><option value="OTHER">Other level</option></select></>}
    <label className="microcopy" htmlFor="design-label">Label</label>
    <input id="design-label" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Kitchen concept" />
    <div className="hero-actions"><button className="primary-button" type="button" disabled={stale||!activeOwner} onClick={()=>save(true)}>Create shape from owner footprint</button></div>
    <p className="microcopy">For a smaller shape, enter source world-coordinate polygon vertices as model XY pairs; the engine checks containment inside the selected owner.</p>
    <label className="microcopy" htmlFor="design-points">Custom vertices (model feet, no mirror)</label>
    <textarea id="design-points" rows={3} value={vertices} onChange={e=>setVertices(e.target.value)}/>
    <button className="secondary-button" type="button" disabled={stale||!activeOwner} onClick={()=>save(false)}>Add custom polygon</button>
    {note&&<p role="status" className="microcopy lifecycle-message">{note}</p>}
   </div>
   <div><p className="eyebrow">SOURCE FOOTPRINT · DRAFT SHAPES</p>
    <svg viewBox={bb.join(" ")} role="img" aria-label="Source building owner polygon with draft floor and roof zones" style={{width:"100%",maxHeight:330,background:"#f0f4f7"}}>
     {shell.length>0&&<polygon points={pts(shell)} fill="#dce7ed" stroke="#31566d" strokeWidth={.6}/>}
     {!stale&&base.shapes.filter(s=>s.ownerId===ownerId).map(s=>{
      const poly=s.polygon.map((p,i)=>{
       if(drag?.shapeId===s.id&&drag.index===i)return drag.point;
       if(wallDrag?.shapeId===s.id&&(i===wallDrag.index||i===(wallDrag.index+1)%s.polygon.length))
        return [p[0]+wallDrag.delta[0],p[1]+wallDrag.delta[1]] as P2;
       return p;
      });
      return <g key={s.id}>
       <polygon points={pts(poly)} fill={s.story===null?"#e9bc81":"#95c3cb"} fillOpacity={.35} stroke={s.story===null?"#a16f35":"#326b84"} strokeDasharray="1.8 1" strokeWidth={.7}><title>{s.label} · {s.kind} · draft</title></polygon>
       {editingShapeId===s.id&&poly.map((p,i)=><line key={"wall-"+i} x1={p[0]} y1={p[1]}
        x2={poly[(i+1)%poly.length][0]} y2={poly[(i+1)%poly.length][1]}
        stroke="#175a7e" strokeOpacity={0.4} strokeWidth={1.1} style={{cursor:"move",touchAction:"none"}}
        onPointerDown={e=>beginWall(e,s.id,i)} onPointerMove={moveWall} onPointerUp={endWall}
        onPointerCancel={()=>setWallDrag(null)}><title>Drag wall {i+1} of {s.label}</title></line>)}
       {editingShapeId===s.id&&poly.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={0.55} fill="#163d55" stroke="#fff" strokeWidth={0.2}
        style={{cursor:"grab",touchAction:"none"}} role="button" tabIndex={0} aria-label={`Move vertex ${i+1} of ${s.label}; arrow keys move by ${snapGrid} feet`} onKeyDown={e=>keyMoveVertex(e,s.id,i)}
        onPointerDown={e=>beginVertex(e,s.id,i)} onPointerMove={moveVertex} onPointerUp={endVertex}
        onPointerCancel={()=>setDrag(null)} />)}
      </g>;
     })}
    </svg>
    <label className="microcopy" htmlFor="design-edit-shape">Drag vertices on source XY grid</label>
    <select id="design-edit-shape" value={editingShapeId} onChange={e=>{setEditingShapeId(e.target.value);setDrag(null);}}>
     <option value="">Choose a draft shape to edit</option>
     {base.shapes.filter(s=>s.ownerId===ownerId).map(s=><option value={s.id} key={s.id}>{s.label} · {s.story??"ROOF"}</option>)}
    </select>
    <label className="microcopy" htmlFor="design-snap">Grid snapping (ft)</label>
    <select id="design-snap" value={snapGrid} onChange={e=>setSnapGrid(e.target.value)}>
     <option value="0.25">0.25 ft</option><option value="0.5">0.5 ft</option><option value="1">1 ft</option>
    </select>
    <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:8}}>
     <label className="microcopy">Partition axis<select value={partitionAxis} onChange={e=>setPartitionAxis(e.target.value as "X"|"Y")}><option value="X">Vertical cut (X)</option><option value="Y">Horizontal cut (Y)</option></select></label>
     <label className="microcopy">Cut coordinate (model ft)<input inputMode="decimal" value={partitionOffset} onChange={e=>setPartitionOffset(e.target.value)} placeholder="Absolute model coordinate" /></label>
    </div>
    <button className="secondary-button" type="button" onClick={partitionSelected} disabled={stale||!editingShapeId}>Split selected floor shape</button>
    <label className="microcopy">Room names (comma separated)<input value={roomLabels} onChange={e=>setRoomLabels(e.target.value)} /></label>
    <label className="microcopy">Room seed direction<select value={packAxis} onChange={e=>setPackAxis(e.target.value as "X"|"Y")}><option value="X">Across X</option><option value="Y">Across Y</option></select></label>
    <button className="secondary-button" type="button" onClick={packRooms} disabled={stale||!editingShapeId}>Seed rooms from selected floor plate</button>
    <p className="microcopy">Drag any highlighted wall or vertex; invalid moves outside the source owner or through polygon edges are rejected. Partition divides the selected floor polygon along a model X or Y line, validates both halves and clears dependent draft doors. Blue: floor concepts. Amber: roof-zone proposals.</p>
   </div>
  </div>
  <div className="candidate-detail-grid" style={{marginBlock:20}}>
   <article className="wb-panel">
    <p className="eyebrow">FLOOR SOLVER · WALLS, ROOM RELATIONSHIPS AND DOORS</p>
    <h3>Derived shared wall segments</h3>
    <p className="microcopy">Generated from authored room/circulation polygons on the selected building and floor. This is geometry checking, not an approved room/egress plan.</p>
    <label htmlFor="shared-wall-selector" className="microcopy">Shared room wall</label>
    <select id="shared-wall-selector" value={Math.min(wallIndex,Math.max(0,walls.length-1))} onChange={e=>setWallIndex(Number(e.target.value))}>
     {walls.length===0?<option value={0}>No adjacency — create rooms first</option>:walls.map((w,i)=><option key={i} value={i}>{w.roomA} ↔ {w.roomB} · {w.lengthFt.toFixed(2)} ft</option>)}
    </select>
    <label className="microcopy" htmlFor="door-width">Door opening width, feet (designer-specified)</label>
    <input id="door-width" inputMode="decimal" value={doorWidth} onChange={e=>setDoorWidth(e.target.value)}/>
    <button className="secondary-button" type="button" disabled={stale||!wall} onClick={putDoor}>Create centered door on shared wall</button>
    <div className="component-list">
     {solution?.floors.filter(f=>f.ownerId===ownerId).map(f=><div key={f.story}><span>{f.story} · {f.status}</span><strong>{f.roomIds.length} rooms · {f.wallSegments.length} shared walls · {f.doors.length} doors</strong>{f.issues.map((issue,i)=><small key={i}>{issue.code}: {issue.detail}</small>)}</div>)}
    </div>
   </article>
   <article className="wb-panel">
    <p className="eyebrow">ROOF SOLVER · SOURCE-GEOMETRY PREVIEW</p>
    <h3>Gable pitch, ridge and sections</h3>
    <label className="microcopy" htmlFor="gable-draft-selector">Roof-zone draft</label>
    <select id="gable-draft-selector" value={chosenRoof?.id??""} onChange={e=>setSelectedRoofId(e.target.value)}>
     {roofShapes.length?roofShapes.map(s=><option key={s.id} value={s.id}>{s.label} · {s.id}</option>):<option value="">Create a GABLE ZONE shape first</option>}
    </select>
    <label className="microcopy" htmlFor="ridge-direction">Ridge orientation relative to zone</label>
    <select id="ridge-direction" value={ridgeDirection} onChange={e=>setRidgeDirection(e.target.value as typeof ridgeDirection)}><option value="LONG_AXIS">Along longer rectangle axis</option><option value="SHORT_AXIS">Along shorter rectangle axis / cross-gable</option></select>
    <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:8}}>
     <label>Plate Z ft<input value={plateZ} inputMode="decimal" onChange={e=>setPlateZ(e.target.value)}/></label>
     <label>Pitch rise<input value={pitchRise} inputMode="decimal" onChange={e=>setPitchRise(e.target.value)}/></label>
     <label>Pitch run<input value={pitchRun} inputMode="decimal" onChange={e=>setPitchRun(e.target.value)}/></label>
     <label>Proposed eave overhang ft<input value={overhang} inputMode="decimal" onChange={e=>setOverhang(e.target.value)}/></label>
     <label>Fascia depth ft (optional)<input value={fasciaDepth} inputMode="decimal" onChange={e=>setFasciaDepth(e.target.value)}/></label>
     <label>Fascia thickness ft (optional)<input value={fasciaThickness} inputMode="decimal" onChange={e=>setFasciaThickness(e.target.value)}/></label>
    </div>
    <button className="secondary-button" type="button" disabled={stale||!chosenRoof} onClick={setRoof}>Solve draft roof parameters</button>
    <p className="microcopy"><strong>{preview?.status??"WITHHELD"}</strong> · {preview?.ridges.length??0} ridge(s), {preview?.junctions.length??0} junction segment(s), {preview?.sections.length??0} actual surface intersection cuts.</p>
    {preview?.fascia&&<p className="microcopy">Fascia: {preview.fascia.status} · {preview.fascia.segments.length} model edges. {preview.fascia.reason}</p>}
    {preview?.ridges.map(r=><p className="microcopy" key={r.zoneId}>{r.zoneId}: plate {r.plateZFt.toFixed(2)} ft · ridge {r.ridgeZFt.toFixed(2)} ft · pitch {(r.pitch*12).toFixed(2)}/12</p>)}
    {preview?.issues.map((issue,i)=><p className="microcopy" key={i}>{issue.code}: {issue.detail}</p>)}
    <p className="microcopy">The computed preview cannot create a locked roof or approve valley drainage, structure, fascia or permit geometry.</p>
   </article>
  </div>
  <div className="component-list">
   {base.shapes.map(s=><div key={s.id}><span>{s.story??"ROOF"} · DRAFT</span><strong>{s.label}</strong><small>{s.ownerId} · {s.kind} · {s.polygon.length} vertices</small><button className="tiny-action" type="button" disabled={stale} onClick={()=>drop(s.id)}>Remove</button></div>)}
  </div>
 </section>;
}
