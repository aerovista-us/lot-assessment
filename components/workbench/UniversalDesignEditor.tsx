"use client";
import {useEffect,useState} from "react";
import type {CandidateRecord} from "@/packages/candidates";
import {placementPolygon} from "@/packages/roof-geometry";
import {
 addDesignShape,addOwnerFootprintShape,emptyDesignDocument,removeDesignShape,
 sourceBuildingOwners,validateDesignDocument,type DesignDocument,type DesignShape,type P2
} from "@/packages/candidates/design-document";
type Props={candidate:CandidateRecord;document?:DesignDocument;onSave:(doc:DesignDocument)=>void};
export function UniversalDesignEditor({candidate,document,onSave}:Props){
 const owners=sourceBuildingOwners(candidate);
 const [ownerId,setOwnerId]=useState(owners[0]?.id??"");
 const [kind,setKind]=useState<DesignShape["kind"]>("FLOOR_PLATE");
 const [story,setStory]=useState<"GROUND"|"UPPER"|"OTHER">("GROUND");
 const [label,setLabel]=useState("New shape");
 const [vertices,setVertices]=useState("[[0,0],[10,0],[10,10],[0,10]]");
 const [note,setNote]=useState("");
 useEffect(()=>{setOwnerId(owners[0]?.id??"");setNote("");},[candidate.id]);
 const activeOwner=owners.find(o=>o.id===ownerId);
 const roof=kind==="ROOF_ZONE"||kind==="GABLE_ZONE";
 const base=document??emptyDesignDocument(candidate);
 const stale=Boolean(document&&(()=>{try{validateDesignDocument(candidate,document);return false}catch{return true}})());
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
     {!stale&&base.shapes.filter(s=>s.ownerId===ownerId).map(s=><polygon key={s.id} points={pts(s.polygon)} fill={s.story===null?"#e9bc81":"#95c3cb"} fillOpacity={.35} stroke={s.story===null?"#a16f35":"#326b84"} strokeDasharray="1.8 1" strokeWidth={.7}><title>{s.label} · {s.kind} · draft</title></polygon>)}
    </svg>
    <p className="microcopy">Blue: floor concepts. Amber: roof-zone proposals. No roof slopes, floor heights or approved rooms are inferred.</p>
   </div>
  </div>
  <div className="component-list">
   {base.shapes.map(s=><div key={s.id}><span>{s.story??"ROOF"} · DRAFT</span><strong>{s.label}</strong><small>{s.ownerId} · {s.kind} · {s.polygon.length} vertices</small><button className="tiny-action" type="button" disabled={stale} onClick={()=>drop(s.id)}>Remove</button></div>)}
  </div>
 </section>;
}
