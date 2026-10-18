"use client";
import {useState} from "react";
import Link from "next/link";
import {lotAreaSqFt,validateLotIntake,type LotIntakeDraft,type LotPoint} from "@/packages/lot-intake";

const defaultDraft:LotIntakeDraft={
 schemaVersion:"lotscope-lot-intake-v1",name:"New parcel",polygon:[[0,0],[100,0],[100,70],[0,70]],
 frontageLabel:"Frontage road (verify)",accessEdgeIndex:0,northRotationDeg:0,
 setbacksFt:{front:20,rear:20,left:5,right:5},units:2,targetLivingSqFt:[1200,1800],
 sourceNote:"Unverified example coordinates — replace with measured parcel geometry",status:"DRAFT_UNVERIFIED"
};
function parsePolygon(raw:string):LotPoint[]{
 const value:unknown=JSON.parse(raw);
 if(!Array.isArray(value)||value.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=="number")))throw Error("Enter a JSON array of [x,y] coordinates.");
 return value as LotPoint[];
}
export function NewLotIntakeClient(){
 const [draft,setDraft]=useState<LotIntakeDraft>(defaultDraft);
 const [polygonText,setPolygonText]=useState(JSON.stringify(defaultDraft.polygon));
 const [message,setMessage]=useState("");
 let result:{areaSqFt:number;errors:string[]};
 try{result=validateLotIntake({...draft,polygon:parsePolygon(polygonText)});}catch(e){result={areaSqFt:0,errors:[e instanceof Error?e.message:"Invalid parcel polygon"]};}
 const polygon:(LotPoint[]) = (()=>{try{return parsePolygon(polygonText);}catch{return [];}})();
 const xx=polygon.map(p=>p[0]),yy=polygon.map(p=>p[1]);
 const frame=polygon.length?[Math.min(...xx)-5,Math.min(...yy)-5,Math.max(20,Math.max(...xx)-Math.min(...xx)+10),Math.max(20,Math.max(...yy)-Math.min(...yy)+10)]:[0,0,100,100];
 const frontage=polygon.length>2&&draft.accessEdgeIndex>=0&&draft.accessEdgeIndex<polygon.length?[polygon[draft.accessEdgeIndex],polygon[(draft.accessEdgeIndex+1)%polygon.length]]:null;
 const update=<K extends keyof LotIntakeDraft,>(key:K,value:LotIntakeDraft[K])=>setDraft(prev=>({...prev,[key]:value}));
 const updateSetback=(key:keyof LotIntakeDraft["setbacksFt"],value:number)=>setDraft(prev=>({...prev,setbacksFt:{...prev.setbacksFt,[key]:value}}));
 function exportDraft(){
  try{
   const next={...draft,polygon:parsePolygon(polygonText)};
   const checked=validateLotIntake(next);
   if(checked.errors.length){setMessage("Correct validation errors before exporting.");return;}
   const blob=new Blob([JSON.stringify({...next,areaSqFt:lotAreaSqFt(next.polygon)},null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
   anchor.href=url;anchor.download="lotscope-new-lot-draft.json";document.body.appendChild(anchor);anchor.click();anchor.remove();
   URL.revokeObjectURL(url);setMessage("Unverified draft exported. This is not a saved project, generated design, or verified survey.");
  }catch(e){setMessage(e instanceof Error?e.message:"Cannot export lot draft.");}
 }
 return <section className="wb-panel">
  <p className="eyebrow">NEW LOT · LOCAL DRAFT INTAKE</p>
  <h2>Define a parcel without changing Pondy Lot 2</h2>
  <p>Enter XY vertices in feet, in boundary order. Keep the true orientation; do not mirror the lot to fit a report. This form validates a draft and exports JSON. It does not yet persist a server project, generate candidates, or establish zoning/permit acceptance.</p>
  <div className="candidate-detail-grid" style={{marginBlock:16}}>
   <div className="wb-panel"><p className="eyebrow">PARCEL SHAPE PREVIEW · MODEL FEET</p>
    <svg viewBox={frame.join(" ")} role="img" aria-label="Parcel vertices and selected frontage edge in source coordinates" style={{width:"100%",height:280,background:"#f0f4f7"}}>
     {polygon.length>=3&&<polygon points={polygon.map(p=>p.join(",")).join(" ")} fill="#c9e0e4" fillOpacity={.7} stroke="#28556e" strokeWidth={.9}/>}
     {polygon.map((p,i)=><g key={i}><circle cx={p[0]} cy={p[1]} r={1.2} fill="#184e67"/><text x={p[0]+2} y={p[1]-2} fontSize={3} fill="#123e52">{i}</text></g>)}
     {frontage&&<line x1={frontage[0][0]} y1={frontage[0][1]} x2={frontage[1][0]} y2={frontage[1][1]} stroke="#d06c24" strokeWidth={2.2}/>}
    </svg>
    <p className="microcopy">Blue boundary: draft parcel. Orange line: selected frontage edge. Numbered vertices correspond to coordinate indices. No mirroring or survey approval.</p>
   </div>
   <div className="wb-panel"><p className="eyebrow">BEFORE YOU CONTINUE</p><h3>Lot input checklist</h3>
    <p className="microcopy">Confirm jogs and boundary shape against source measurements.</p>
    <p className="microcopy">Confirm orange edge faces the access road.</p>
    <p className="microcopy">Check north rotation, setbacks, units and living-area goals.</p>
    <p className="microcopy">Validate and export. New-lot candidate generation is not connected yet.</p>
    <p role="status" className="microcopy"><strong>{result.errors.length===0?"Geometry intake valid as draft":"Input needs correction"}</strong> · {result.errors.length} issue(s). This does not establish buildability or zoning approval.</p>
   </div>
  </div>
  <div className="lot-workspace-grid">
   <label>Lot name<input aria-label="Lot name" value={draft.name} onChange={e=>update("name",e.target.value)}/></label>
   <label>Frontage road<input aria-label="Frontage road" value={draft.frontageLabel} onChange={e=>update("frontageLabel",e.target.value)}/></label>
   <label>Frontage edge index (0-based)<input type="number" min="0" step="1" value={draft.accessEdgeIndex} onChange={e=>update("accessEdgeIndex",Number(e.target.value))}/></label>
   <label>North rotation (degrees)<input type="number" min="-360" max="360" value={draft.northRotationDeg} onChange={e=>update("northRotationDeg",Number(e.target.value))}/></label>
   <label>Dwelling units<input type="number" min="1" value={draft.units} onChange={e=>update("units",Number(e.target.value))}/></label>
   <label>Min living area per unit (SF)<input type="number" min="1" value={draft.targetLivingSqFt[0]} onChange={e=>update("targetLivingSqFt",[Number(e.target.value),draft.targetLivingSqFt[1]])}/></label>
   <label>Max living area per unit (SF)<input type="number" min="1" value={draft.targetLivingSqFt[1]} onChange={e=>update("targetLivingSqFt",[draft.targetLivingSqFt[0],Number(e.target.value)])}/></label>
   {(["front","rear","left","right"] as const).map(side=><label key={side}>{side} setback (ft)<input type="number" min="0" value={draft.setbacksFt[side]} onChange={e=>updateSetback(side,Number(e.target.value))}/></label>)}
  </div>
  <label style={{display:"block",marginTop:16}}>Parcel vertices in feet (JSON)<textarea aria-label="Parcel vertices" rows={5} style={{display:"block",width:"100%"}} value={polygonText} onChange={e=>setPolygonText(e.target.value)}/></label>
  <label style={{display:"block",marginTop:16}}>Source / measurement confidence<textarea aria-label="Measurement source" rows={2} style={{display:"block",width:"100%"}} value={draft.sourceNote} onChange={e=>update("sourceNote",e.target.value)}/></label>
  <p className="microcopy">Calculated parcel area: {result.errors.length?"Not validated":result.areaSqFt.toLocaleString(undefined,{maximumFractionDigits:1})+" SF"} · Status: DRAFT / UNVERIFIED</p>
  {result.errors.length>0&&<div role="alert"><strong>Validation required:</strong><ul>{result.errors.map(error=><li key={error}>{error}</li>)}</ul></div>}
  <div className="hero-actions"><button className="primary-button" type="button" disabled={result.errors.length>0} onClick={exportDraft}>Export validated draft JSON</button><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Try existing Design 4 demo →</Link></div>
  <div className="candidate-warning-box" role="note"><strong>Next step is not connected yet</strong><p>This export does not create a candidate or appear in the candidate library. Do not use Import .lotscope.json for this lot-intake JSON: it expects a different candidate-package schema. Continue with the existing Design 4 demo if you want to test the editor/report while the new-lot adapter is being built.</p></div>
  {message&&<p role="status" className="microcopy">{message}</p>}
 </section>;
}
