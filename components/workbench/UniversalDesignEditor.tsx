"use client";
import {useEffect,useId,useMemo,useRef,useState} from "react";
import type {CandidateRecord} from "@/packages/candidates";
import {placementPolygon} from "@/packages/roof-geometry";
import {
 addDesignShape,addOwnerFootprintShape,emptyDesignDocument,removeDesignShape,addDraftDoor,setDraftRoofParameters,
 sourceBuildingOwners,validateDesignDocument,updateDesignShapePolygon,snapDesignPoint,partitionDesignShape,prepareDraftRoomAlternatives,rankDraftRoomLayouts,moveDesignWall,type RoomSeedDirection,type RankedDraftLayout,type DesignDocument,type DesignShape,type P2
} from "@/packages/candidates/design-document";
import {solveUniversalDesign} from "@/packages/candidates/design-solving";
type Props={candidate:CandidateRecord;document?:DesignDocument;onSave:(doc:DesignDocument)=>void};
type Story="GROUND"|"UPPER"|"OTHER";
const defaultRoomProgram="Living, Kitchen, Bedroom";
const commonRoomOptions=[
 {id:"laundry",label:"Laundry"},{id:"primary-bedroom",label:"Primary Bedroom"},
 {id:"primary-bath",label:"Primary Bath"},{id:"full-bath",label:"Full Bath"},
 {id:"dining",label:"Dining Room"},{id:"office",label:"Office"},
 {id:"pantry",label:"Pantry"},{id:"mudroom",label:"Mudroom"}
] as const;
const roomNamesFrom=(value:string)=>value.split(",").map(name=>name.trim()).filter(Boolean);
const roomNameKey=(name:string)=>name.trim().replace(/\s+/g," ").toLowerCase();
function savedRoomProgram(document:DesignDocument|undefined,ownerId:string,story:Story){
 return document?.shapes.filter(shape=>shape.ownerId===ownerId&&shape.story===story&&shape.kind==="ROOM").map(shape=>shape.label).join(", ")||defaultRoomProgram;
}
export function UniversalDesignEditor({candidate,document,onSave}:Props){
 const owners=sourceBuildingOwners(candidate);
 const firstOwnerId=owners[0]?.id??"";
 const previousCandidate=useRef(candidate.id);
 const canvasRef=useRef<SVGSVGElement>(null);
 const [zoom,setZoom]=useState(1);
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
 const [roomLabels,setRoomLabels]=useState(()=>savedRoomProgram(document,firstOwnerId,"GROUND"));
 const [packAxis,setPackAxis]=useState<RoomSeedDirection>("BEST_FIT");
 const roomOptionsId=useId();
 const roomNames=roomNamesFrom(roomLabels);
 const includedRoomNames=new Set(roomNames.map(roomNameKey));
 const roomCountValid=roomNames.length>=2&&roomNames.length<=8;
 const [layoutOptions,setLayoutOptions]=useState<RankedDraftLayout[]>([]);
 const [selectedLayout,setSelectedLayout]=useState(0);
 const [layoutSource,setLayoutSource]=useState("");
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
 useEffect(()=>{
  if(previousCandidate.current===candidate.id)return;
  previousCandidate.current=candidate.id;
  setOwnerId(firstOwnerId);setStory("GROUND");setRoomLabels(savedRoomProgram(document,firstOwnerId,"GROUND"));
  setEditingShapeId("");setZoom(1);setNote("");setLayoutOptions([]);setLayoutSource("");
 },[candidate.id,firstOwnerId,document]);
 const activeOwner=owners.find(o=>o.id===ownerId);
 const roof=kind==="ROOF_ZONE"||kind==="GABLE_ZONE";
 // Unsaved alternatives are source-bound too. A fresh empty document on each
 // render changes updatedAt and instantly invalidates a generated comparison.
 const base=useMemo(()=>document??emptyDesignDocument(candidate),[document,candidate]);
 const stale=Boolean(document&&(()=>{try{validateDesignDocument(candidate,document);return false}catch{return true}})());
 const selectedShape=base.shapes.find(shape=>shape.id===editingShapeId);
 // Inspecting a room must not become a different floor seed or invalidate a comparison.
 const floorSelectionId=selectedShape?.kind==="FLOOR_PLATE"?selectedShape.id:"";
 const sourceKey=JSON.stringify([candidate.id,base.sourceSignature,base.revision,base.updatedAt,ownerId,story,floorSelectionId,roomLabels,packAxis]);
 const alternativesCurrent=layoutOptions.length>0&&!stale&&layoutSource===sourceKey;
 const activeLayout=alternativesCurrent?layoutOptions[selectedLayout]:undefined;
 const solution=stale?null:solveUniversalDesign(candidate,base);
 const walls=solution?.floors.filter(f=>f.ownerId===ownerId&&f.story===story).flatMap(f=>f.wallSegments)??[];
 const wall=walls[wallIndex]??walls[0];
 const roofShapes=base.shapes.filter(s=>s.ownerId===ownerId&&s.kind==="GABLE_ZONE");
 const chosenRoof=roofShapes.find(s=>s.id===selectedRoofId)??roofShapes[0];
 const preview=solution?.roofs.find(r=>r.ownerId===ownerId);
 function selectShape(id:string){if(stale)return;setEditingShapeId(id);setDrag(null);setWallDrag(null);}
 function doneEditing(){setEditingShapeId("");setDrag(null);setWallDrag(null);canvasRef.current?.focus();}
 function chooseOwner(id:string){setOwnerId(id);setRoomLabels(savedRoomProgram(document,id,story));setEditingShapeId("");setDrag(null);setWallDrag(null);setZoom(1);setLayoutOptions([]);setLayoutSource("");}
 function chooseStory(next:Story){setStory(next);setRoomLabels(savedRoomProgram(document,ownerId,next));setEditingShapeId("");setDrag(null);setWallDrag(null);setZoom(1);setLayoutOptions([]);setLayoutSource("");}
 function chooseCommonRoom(name:string,include:boolean){
  setRoomLabels(current=>{
   const names=roomNamesFrom(current),key=roomNameKey(name);
   if(include&&names.length>=8&&!names.some(item=>roomNameKey(item)===key))return current;
   return (include?(names.some(item=>roomNameKey(item)===key)?names:[...names,name]):names.filter(item=>roomNameKey(item)!==key)).join(", ");
  });
 }
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
   if(!activeOwner||activeOwner.kind!=="home")throw Error("Select a home building owner to generate a floor plan");
   const labels=roomNamesFrom(roomLabels);
   const selected=base.shapes.find(x=>x.id===floorSelectionId);
   if(selected&&(selected.ownerId!==ownerId||selected.story!==story||selected.kind!=="FLOOR_PLATE"))throw Error("Selected shape is not a floor plate for this home and story");
   const existing=base.shapes.filter(x=>x.ownerId===ownerId&&x.story===story&&x.kind==="FLOOR_PLATE");
   // Reject distinct same-story plates: one source story must not be silently discarded.
   // Exact duplicate plates created by the old editor can be reconciled in the
   // selected proposal, without changing the saved design until explicit Save.
   const plate=selected??existing[0];
   if(existing.length>1&&existing.some(x=>JSON.stringify(x.polygon)!==JSON.stringify(plate?.polygon)))
    throw Error("This home/story contains different floor plates. Choose and reconcile the correct footprint before generating rooms.");
   let candidateDoc=prepareDraftRoomAlternatives(candidate,base,ownerId,story);
   if(existing.length>1&&plate){
    const duplicates=new Set(existing.filter(x=>x.id!==plate.id).map(x=>x.id));
    const duplicateDependents=base.shapes.some(x=>duplicates.has(x.ownerId))||
     (base.doors??[]).some(x=>duplicates.has(x.fromRoomId)||duplicates.has(x.toRoomId))||
     (base.roofParameters??[]).some(x=>duplicates.has(x.shapeId));
    if(duplicateDependents)throw Error("Duplicate plates have attached geometry. Reconcile those dependencies manually before generating rooms.");
    candidateDoc={...candidateDoc,shapes:candidateDoc.shapes.filter(x=>!duplicates.has(x.id)),
     revision:base.revision+1,updatedAt:new Date().toISOString()};
    validateDesignDocument(candidate,candidateDoc);
   }
   let resolvedPlate=plate;
   if(!resolvedPlate){
    candidateDoc=addOwnerFootprintShape(candidate,candidateDoc,{ownerId,label:activeOwner.label+" · source floor plate",kind:"FLOOR_PLATE",story});
    resolvedPlate=candidateDoc.shapes[candidateDoc.shapes.length-1];
   }
   const alternatives=rankDraftRoomLayouts(candidate,candidateDoc,resolvedPlate.id,labels,packAxis);
   if(!alternatives.length)throw Error("No safe draft room layouts found; refine geometry or labels.");
   setLayoutOptions(alternatives);setSelectedLayout(0);setLayoutSource(sourceKey);
   setNote(`Generated ${alternatives.length} unsaved room concepts for ${activeOwner.label} / ${story} from its exact footprint. Compare and Save selected layout. This is a room-geometry draft, not verified circulation, stairs or architectural acceptance.`);
  }catch(error){setNote(error instanceof Error?error.message:"Unable to generate draft floor plan");}
 }
 function saveSelectedLayout(){
  try{
   if(!alternativesCurrent||!activeLayout)throw Error("Alternatives are stale. Generate them again before saving.");
   validateDesignDocument(candidate,activeLayout.document);
   onSave(activeLayout.document);setLayoutOptions([]);setLayoutSource("");setEditingShapeId("");
   setNote(`Saved selected draft concept ${selectedLayout+1} (proximity score ${activeLayout.assessment.score}). Door access, circulation and garage connectivity remain unverified.`);
  }catch(error){setNote(error instanceof Error?error.message:"Cannot save selected layout");}
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
 const center=selectedShape?[
  (Math.min(...selectedShape.polygon.map(p=>p[0]))+Math.max(...selectedShape.polygon.map(p=>p[0])))/2,
  (Math.min(...selectedShape.polygon.map(p=>p[1]))+Math.max(...selectedShape.polygon.map(p=>p[1])))/2
 ]:[bb[0]+bb[2]/2,bb[1]+bb[3]/2];
 const planView=zoom===1?bb:[center[0]-bb[2]/zoom/2,center[1]-bb[3]/zoom/2,bb[2]/zoom,bb[3]/zoom];
 const pts=(polygon:ReadonlyArray<readonly[number,number]>)=>polygon.map(p=>p[0]+","+p[1]).join(" ");
 const visibleShapes=base.shapes.filter(s=>s.ownerId===ownerId&&(s.story===story||s.story===null));
 const visibleRooms=visibleShapes.filter(s=>s.kind==="ROOM");
 return <section id="universal-design-editor" className="wb-panel design-editor" data-universal-design-editor="v1">
  <div className="section-heading"><div><p className="eyebrow">LAYOUT STUDIO</p><h2>Give every room a place.</h2></div><span className="mode-pill">{base.shapes.length} DRAFT SHAPES</span></div>
  <p className="microcopy">Start with the rooms you need. Explore alternatives on the source footprint, then save the layout you prefer.</p>
  {stale&&<div className="candidate-warning-box"><strong>Source revision changed</strong><p>Attached shapes are stale. Reconcile against the new footprint before reuse. The customer report will refuse stale geometry.</p></div>}
  <div className="design-context-bar">
   <div>    <label className="microcopy" htmlFor="design-owner">Building owner</label>
    <select id="design-owner" value={ownerId} onChange={e=>chooseOwner(e.target.value)}>{owners.map(o=><option key={o.id} value={o.id}>{o.label} · {o.kind}</option>)}</select>
</div><div>    <label className="microcopy" htmlFor="design-story">Floor</label><select id="design-story" value={story} onChange={e=>chooseStory(e.target.value as Story)}><option value="GROUND">Ground</option><option value="UPPER">Upper</option><option value="OTHER">Other level</option></select>
</div>
   <span className="design-context-note">Changes apply to the selected building and floor.</span>
  </div>
  <div className="design-studio-grid">
   <div className="design-canvas-panel" onKeyDown={e=>{if(e.key==="Escape"&&editingShapeId&&!(e.target as Element).closest("input,select,textarea")){e.preventDefault();e.stopPropagation();doneEditing();}}}><div className="design-canvas-heading"><span>YOUR FLOOR PLAN</span><small>{activeOwner?.label} · {story.toLowerCase()} floor</small></div>
    <div className="plan-view-controls" aria-label="Plan view controls"><span>Inspect your layout</span><div><button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(current=>Math.max(1,current-.5))}>−</button><output aria-label="Plan zoom">{Math.round(zoom*100)}%</output><button type="button" aria-label="Zoom in" disabled={zoom>=3} onClick={()=>setZoom(current=>Math.min(3,current+.5))}>+</button><button type="button" onClick={()=>setZoom(1)}>Fit plan</button></div></div>
    <svg ref={canvasRef} viewBox={planView.join(" ")} role="group" tabIndex={0} aria-label="Interactive floor plan" aria-describedby="plan-editing-help" data-active-shape={editingShapeId} className="design-floor-canvas">
     {shell.length>0&&<polygon points={pts(shell)} fill="#dce7ed" stroke="#31566d" strokeWidth={.6}/>}
     {!stale&&visibleShapes.map((s,shapeIndex)=>{
      const poly=s.polygon.map((p,i)=>{
       if(drag?.shapeId===s.id&&drag.index===i)return drag.point;
       if(wallDrag?.shapeId===s.id&&(i===wallDrag.index||i===(wallDrag.index+1)%s.polygon.length))
        return [p[0]+wallDrag.delta[0],p[1]+wallDrag.delta[1]] as P2;
       return p;
      });
      return <g key={s.id}>
       <polygon data-saved-shape={s.id} data-shape-kind={s.kind} data-active={editingShapeId===s.id} role="button" tabIndex={0} aria-label={`Edit ${s.label}`} aria-pressed={editingShapeId===s.id} onClick={()=>selectShape(s.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectShape(s.id);}}} points={pts(poly)} fill={s.story===null?"#e9bc81":s.kind==="CIRCULATION"?"#f4ce7c":s.kind==="ROOM"?["#9dcfc7","#b4c8e2","#c8c3e2","#b9d0a5","#e1c7ab"][shapeIndex%5]:"#95c3cb"} fillOpacity={.35} stroke={s.story===null?"#a16f35":"#326b84"} strokeDasharray="1.8 1" strokeWidth={.7}><title>{s.label} · {s.kind} · draft</title></polygon>
       {s.kind==="ROOM"&&<g pointerEvents="none"><circle cx={poly.reduce((n,p)=>n+p[0],0)/poly.length} cy={poly.reduce((n,p)=>n+p[1],0)/poly.length} r={.85} fill="#244b5b"/><text x={poly.reduce((n,p)=>n+p[0],0)/poly.length} y={poly.reduce((n,p)=>n+p[1],0)/poly.length} textAnchor="middle" dominantBaseline="central" fontSize={1.05} fontWeight={700} fill="#fff">{visibleRooms.findIndex(room=>room.id===s.id)+1}</text></g>}
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
     {!stale&&(base.doors??[]).filter(d=>d.story===story&&base.shapes.some(s=>s.ownerId===ownerId&&(s.id===d.fromRoomId||s.id===d.toRoomId))).map(d=><circle key={d.id} cx={d.center[0]} cy={d.center[1]} r={0.5} fill="#a12750"><title>Proposed door · {d.widthFt} ft</title></circle>)}
    </svg>
    <div className="design-canvas-legend" aria-label="Plan legend"><span><i className="legend-room"/>Rooms</span><span><i className="legend-hall"/>Hallways</span><span><i className="legend-door"/>Proposed doors</span></div>
    {!stale&&visibleRooms.length>0&&<ol className="design-room-key" aria-label="Rooms in this plan">{visibleRooms.map((room,index)=><li key={room.id}><button type="button" data-room-select={room.id} aria-pressed={editingShapeId===room.id} onClick={()=>selectShape(room.id)}><span aria-hidden="true">{index+1}</span><span>{room.label}</span></button></li>)}</ol>}
    <div className="plan-editing-context" id="plan-editing-help">{selectedShape&&!stale?<><div><strong>Editing {selectedShape.label}</strong><small>Drag a highlighted wall or vertex. Arrow keys move a focused vertex; Escape finishes editing.</small></div><div className="plan-editing-actions"><label htmlFor="design-snap">Snap<select id="design-snap" value={snapGrid} onChange={e=>setSnapGrid(e.target.value)}><option value="0.25">0.25 ft</option><option value="0.5">0.5 ft</option><option value="1">1 ft</option></select></label><button type="button" onClick={doneEditing}>Done editing</button></div></>:<p>Select a room on the plan or in the room key to refine its walls and vertices.</p>}</div>
    <p className="microcopy design-canvas-caption">{base.shapes.some(s=>s.ownerId===ownerId&&s.kind==="ROOM"&&s.story===story)?"Your saved geometry. Generate alternatives to explore another arrangement.":"Your source footprint. Add room names to explore possible layouts."}</p>
   </div>
   <aside className="design-program-panel" aria-label="Room layout generator"><p className="eyebrow">YOUR ROOM PROGRAM</p><h3>What belongs here?</h3><p className="microcopy">Choose common rooms below, or enter custom room names separated by commas. Include the rooms that matter to this floor.</p>
    <label className="microcopy">Room names (comma separated)<input aria-describedby={`${roomOptionsId}-count`} aria-invalid={!roomCountValid} value={roomLabels} onChange={e=>setRoomLabels(e.target.value)} /></label>
    <fieldset className="room-options" aria-describedby={`${roomOptionsId}-count`}>
     <legend>Additional room options</legend>
     <div className="room-options-list">{commonRoomOptions.map(option=>{
      const included=includedRoomNames.has(roomNameKey(option.label));
      return <div key={option.id} className="room-option-row" role="group" aria-label={option.label} data-room-option={option.id} data-included={included}>
       <span>{option.label}</span>
       <label><input type="radio" name={`${roomOptionsId}-${option.id}`} value="include" checked={included} disabled={!included&&roomNames.length>=8} onChange={()=>chooseCommonRoom(option.label,true)}/><span>Include</span></label>
       <label><input type="radio" name={`${roomOptionsId}-${option.id}`} value="skip" checked={!included} onChange={()=>chooseCommonRoom(option.label,false)}/><span>Skip</span></label>
      </div>;
     })}</div>
    </fieldset>
    <p className={`microcopy room-program-count${roomCountValid?"":" room-program-count-invalid"}`} id={`${roomOptionsId}-count`}>{roomNames.length} of 8 rooms · choose 2–8 rooms for this floor.</p>
    <label className="microcopy">Room seed direction<select value={packAxis} onChange={e=>setPackAxis(e.target.value as RoomSeedDirection)}><option value="BEST_FIT">Best fit · X + Y</option><option value="X">Across X</option><option value="Y">Across Y</option></select></label>
    {packAxis==="BEST_FIT"&&<p className="microcopy">Best fit compares X, Y and mixed layouts, then ranks the feasible options.</p>}
    <p className="microcopy">Generate options for this building and floor, compare them, then save your choice. Your current saved layout stays intact while you explore.</p>
    <button className="primary-button" type="button" onClick={packRooms} disabled={stale||activeOwner?.kind!=="home"||!roomCountValid}>Generate room layout alternatives</button>

    {activeOwner?.kind!=="home"&&<p className="microcopy">Choose a home in Building owner to generate room alternatives. Garage and roof geometry can be edited with the refinement tools below.</p>}
   </aside>
  </div>
  {note&&<p role="status" className="microcopy lifecycle-message">{note}</p>}
    {layoutOptions.length>0&&!alternativesCurrent&&<p role="status" className="candidate-warning-box">Layout inputs or source design changed. Previous alternatives are stale; generate new ones before saving.</p>}
    {alternativesCurrent&&<section aria-label="Compare draft room layouts" className="layout-comparison" data-layout-comparison="draft">
     <h3>Compare {layoutOptions.length} draft layouts</h3>
     <p className="microcopy">Proximity scores compare planning preferences, not overall quality or code compliance. Hallways are amber; proposed doors are pink. Saving replaces rooms and hallways for this building and floor. Other floors stay attached, and your saved design is untouched until Save selected layout.</p>
     <div className="layout-options-grid">
      {layoutOptions.map((option,index)=>{
       const rooms=option.document.shapes.filter(s=>s.kind==="ROOM"&&s.ownerId===ownerId&&s.story===story);
       const halls=option.document.shapes.filter(s=>s.kind==="CIRCULATION"&&s.ownerId===ownerId&&s.story===story);
       const addedIds=new Set([...rooms,...halls].map(s=>s.id));
       const doors=(option.document.doors??[]).filter(d=>addedIds.has(d.fromRoomId)||addedIds.has(d.toRoomId));
       const checks=option.assessment.relationships;
       return <button key={index} type="button" className="layout-option" aria-pressed={selectedLayout===index} onClick={()=>setSelectedLayout(index)}>
        <strong>Concept {index+1}{index===0?" · highest score":""}</strong>
        {option.seedDirection&&<span className="layout-seed-label">{option.seedDirection==="MIXED"?"Mixed X + Y":`Across ${option.seedDirection}`}</span>}
        <svg viewBox={bb.join(" ")} role="img" aria-label={`Draft floor plan for concept ${index+1}`} className="layout-option-plan">
         {shell.length>0&&<polygon points={pts(shell)} fill="#dce7ed" stroke="#31566d" strokeWidth={.6}/>}
         {halls.map(hall=><polygon key={hall.id} data-proposed-shape={hall.id} points={pts(hall.polygon)} fill="#f4ce7c" stroke="#946a20" strokeWidth={.5}><title>{hall.label} · draft hallway</title></polygon>)}
         {rooms.map((room,roomIndex)=>{const center=room.polygon.reduce((sum,p)=>[sum[0]+p[0]/room.polygon.length,sum[1]+p[1]/room.polygon.length] as P2,[0,0] as P2);return <g key={room.id}><polygon points={pts(room.polygon)} fill="#95c3cb" fillOpacity={.65} stroke="#326b84" strokeWidth={.5}><title>{room.label}</title></polygon><circle cx={center[0]} cy={center[1]} r={.9} fill="#244b5b"/><text x={center[0]} y={center[1]} textAnchor="middle" dominantBaseline="central" fontSize={1.1} fontWeight={700} fill="#fff" pointerEvents="none">{roomIndex+1}</text></g>;})}
         {doors.map(door=><circle key={door.id} cx={door.center[0]} cy={door.center[1]} r={.55} fill="#a12750"><title>Proposed doorway · {door.widthFt} ft</title></circle>)}
        </svg>
        <small className="layout-room-key">{rooms.map((room,i)=>`${i+1} ${room.label}`).join(" · ")}</small>
        <span>Score {option.assessment.score} · {checks.filter(r=>r.satisfied).length}/{checks.length} preferences</span>
        <small>{rooms.length} rooms · {halls.length} hallways · {doors.length} proposed doors</small>
        {selectedLayout===index&&<b className="layout-selection-label">Selected for inspection · not saved</b>}
       </button>;
      })}
     </div>
     {activeLayout&&<div aria-live="polite" style={{marginTop:10}}>
      <strong>Concept {selectedLayout+1} details</strong>
      <p className="microcopy">Room order: {activeLayout.order.join(" → ")}</p>
      {activeLayout.assessment.relationships.length===0?<p className="microcopy">No applicable proximity preferences identified for these room names.</p>:activeLayout.assessment.relationships.map((r,i)=><p key={i} className="microcopy">{r.satisfied?"Met":"Not met"} · {r.priority}: {r.a} / {r.b} — {r.reason}</p>)}
      {activeLayout.assessment.limitations.map((warning,i)=><p className="microcopy" key={i}>{warning}</p>)}
     </div>}
     <div className="hero-actions layout-decision-actions"><button type="button" className="primary-button" onClick={saveSelectedLayout}>Save selected layout</button><button type="button" className="secondary-button" onClick={()=>{setLayoutOptions([]);setLayoutSource("");setNote("Layout comparison cancelled; saved design unchanged.");}}>Cancel comparison</button></div>
    </section>}

  <div className="design-advanced-heading"><h3>Refine your design</h3><p>Open the tools you need. Each saved change updates the design revision.</p></div>
  <div className="design-advanced-grid">
   <details className="design-tool-panel"><summary><span>Create custom shapes</span><small>Floor regions, rooms and roof zones</small></summary><div className="design-tool-body">
    <label className="microcopy" htmlFor="design-kind">New shape type</label>
    <select id="design-kind" value={kind} onChange={e=>setKind(e.target.value as DesignShape["kind"])}>
     {(["FLOOR_PLATE","ROOM","GARAGE_AREA","CIRCULATION","STAIR_ZONE","ROOF_ZONE","GABLE_ZONE"] as const).map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}
    </select>
    <label className="microcopy" htmlFor="design-label">Label</label>
    <input id="design-label" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Kitchen concept" />
    <div className="hero-actions"><button className="primary-button" type="button" disabled={stale||!activeOwner} onClick={()=>save(true)}>Create shape from owner footprint</button></div>
    <p className="microcopy">For a smaller shape, enter source world-coordinate polygon vertices as model XY pairs; the engine checks containment inside the selected owner.</p>
    <label className="microcopy" htmlFor="design-points">Custom vertices (model feet, no mirror)</label>
    <textarea id="design-points" rows={3} value={vertices} onChange={e=>setVertices(e.target.value)}/>
    <button className="secondary-button" type="button" disabled={stale||!activeOwner} onClick={()=>save(false)}>Add custom polygon</button>

   </div></details>
   <details className="design-tool-panel"><summary><span>Edit walls &amp; vertices</span><small>Move, snap and divide saved shapes</small></summary><div className="design-tool-body">
    <label className="microcopy" htmlFor="design-edit-shape">Drag vertices on source XY grid</label>
    <select id="design-edit-shape" value={editingShapeId} disabled={stale} onChange={e=>selectShape(e.target.value)}>
     <option value="">Choose a draft shape to edit</option>
     {base.shapes.filter(s=>s.ownerId===ownerId&&(s.story===story||s.story===null)).map(s=><option value={s.id} key={s.id}>{s.label} · {s.story??"ROOF"}</option>)}
    </select>
    <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:8}}>
     <label className="microcopy">Partition axis<select value={partitionAxis} onChange={e=>setPartitionAxis(e.target.value as "X"|"Y")}><option value="X">Vertical cut (X)</option><option value="Y">Horizontal cut (Y)</option></select></label>
     <label className="microcopy">Cut coordinate (model ft)<input inputMode="decimal" value={partitionOffset} onChange={e=>setPartitionOffset(e.target.value)} placeholder="Absolute model coordinate" /></label>
    </div>
    <button className="secondary-button" type="button" onClick={partitionSelected} disabled={stale||!editingShapeId}>Split selected floor shape</button>

    <p className="microcopy">Choose a shape, then drag its highlighted walls or vertices on the plan. Arrow keys move a focused vertex by the selected grid increment. Invalid moves are rejected.</p>
   </div></details>
  </div>
  <div className="design-advanced-grid">
   <details className="design-tool-panel"><summary><span>Connections &amp; doors</span><small>Refine shared walls and openings</small></summary><div className="design-tool-body">
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
   </div></details>
   <details className="design-tool-panel"><summary><span>Roof studies</span><small>Pitch, ridge and fascia parameters</small></summary><div className="design-tool-body">
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
   </div></details>
  </div>

  <details className="design-tool-panel design-shape-manager"><summary><span>Manage saved shapes</span><small>{base.shapes.length} shapes across all buildings and floors</small></summary><div className="design-tool-body">
  <div className="component-list">
   {base.shapes.map(s=><div key={s.id}><span>{s.story??"ROOF"} · DRAFT</span><strong>{s.label}</strong><small>{s.ownerId} · {s.kind} · {s.polygon.length} vertices</small><button className="tiny-action" type="button" disabled={stale} onClick={()=>drop(s.id)}>Remove</button></div>)}
  </div>

  </div></details>
  {document&&<details className="design-verification"><summary>Inspect saved revision data</summary>
    <p className="microcopy">Revision {document.revision} · {document.candidateId}. Exact saved shapes and proposed door records; model XY orientation is retained.</p>
    <pre data-saved-design-document={document.candidateId}>{JSON.stringify(document,null,2)}</pre>
  </details>}

 </section>;
}
