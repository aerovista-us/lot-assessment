"use client";

import { useMemo, useState } from "react";
import { AssessmentResult } from "@/components/AssessmentResult";
import type { LotAssessmentInput } from "@/lib/assessment";
import { guidedAssessmentEvidence } from "@/lib/evidence-adapter";
import { initialConfidence, type ConfidenceMap, type FactState } from "@/lib/confidence";
import type { AssessmentEvidence } from "@/packages/evidence";

const initialInput: LotAssessmentInput = {
  lotWidthFt: 50,
  lotDepthFt: 148,
  frontSetbackFt: 20,
  rearSetbackFt: 20,
  leftSetbackFt: 5,
  rightSetbackFt: 10,
  maxLotCoveragePct: 45,
  units: 2,
  livingAreaPerUnitSqFt: 1800,
  stories: 2,
  garageSpacesPerUnit: 2,
  garageIntegrated: true,
  drivewayWidthFt: 20,
  minimumAccessWidthFt: 20
};

type NumberKey = Exclude<keyof LotAssessmentInput, "garageIntegrated">;
const fields: Array<{key:NumberKey;label:string;unit?:string;group:"LOT"|"RULES"|"PROJECT"|"ACCESS"}> = [
  {key:"lotWidthFt",label:"Lot width",unit:"ft",group:"LOT"},
  {key:"lotDepthFt",label:"Lot depth",unit:"ft",group:"LOT"},
  {key:"frontSetbackFt",label:"Front setback",unit:"ft",group:"RULES"},
  {key:"rearSetbackFt",label:"Rear setback",unit:"ft",group:"RULES"},
  {key:"leftSetbackFt",label:"Left setback",unit:"ft",group:"RULES"},
  {key:"rightSetbackFt",label:"Right setback",unit:"ft",group:"RULES"},
  {key:"maxLotCoveragePct",label:"Maximum lot coverage",unit:"%",group:"RULES"},
  {key:"units",label:"Units",group:"PROJECT"},
  {key:"livingAreaPerUnitSqFt",label:"Living area / unit",unit:"sq ft",group:"PROJECT"},
  {key:"stories",label:"Stories",group:"PROJECT"},
  {key:"garageSpacesPerUnit",label:"Garage spaces / unit",group:"PROJECT"},
  {key:"drivewayWidthFt",label:"Available driveway width",unit:"ft",group:"ACCESS"},
  {key:"minimumAccessWidthFt",label:"Assumed minimum access",unit:"ft",group:"ACCESS"}
];

const groups = ["LOT","RULES","PROJECT","ACCESS"] as const;
const notes = {
  LOT:"Start with dimensions you actually know.",
  RULES:"Mark unverified zoning numbers as assumptions rather than facts.",
  PROJECT:"Describe the program you want to fit.",
  ACCESS:"This public gate screens width; detailed turning geometry belongs in Workbench."
};

export default function GuidedEvidenceAssessmentPage() {
  const [input,setInput]=useState<LotAssessmentInput>(initialInput);
  const [confidence,setConfidence]=useState<ConfidenceMap>(initialConfidence);
  const [evidence,setEvidence]=useState<AssessmentEvidence|null>(null);
  const preview=useMemo(()=>guidedAssessmentEvidence(input,confidence),[input,confidence]);

  const update=(key:NumberKey,value:string)=>setInput(current=>({...current,[key]:Number(value)||0}));
  const state=(key:keyof LotAssessmentInput,value:FactState)=>setConfidence(current=>({...current,[key]:value}));

  if(evidence) return <>
    <div style={{position:"fixed",right:18,bottom:18,zIndex:60}}><button onClick={()=>setEvidence(null)} style={{border:0,borderRadius:999,padding:"10px 14px",background:"#0d1b33",color:"#fff",fontWeight:900,boxShadow:"0 10px 30px #0003",cursor:"pointer"}}>Edit assessment</button></div>
    <AssessmentResult evidence={evidence} mode="PUBLIC" />
  </>;

  return <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#f9f7f2,#eee8de)",padding:"28px 18px 70px",fontFamily:"Inter,system-ui,sans-serif",color:"#18212b"}}>
    <section style={{maxWidth:1120,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24}}><div><span style={{display:"block",fontSize:10,fontWeight:900,letterSpacing:".15em",color:"#99722e"}}>LOTSCOPE VNEXT · GUIDED ASSESSMENT</span><strong style={{font:"500 22px Georgia,serif",color:"#0d1b33"}}>Can I build that here?</strong></div><a href="/" style={{color:"#0d1b33",fontWeight:800,fontSize:12}}>Current LotScope</a></header>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.25fr) minmax(300px,.75fr)",gap:18,alignItems:"start"}} className="guided-vnext-grid">
        <article style={{background:"#fff",borderRadius:24,padding:"clamp(22px,4vw,38px)",boxShadow:"0 20px 60px #0d1b3312"}}>
          <p style={{fontSize:11,fontWeight:900,letterSpacing:".15em",color:"#99722e",margin:0}}>STEP 1 · FACTS + PROVENANCE</p>
          <h1 style={{font:"500 clamp(38px,5vw,60px)/.96 Georgia,serif",color:"#0d1b33",margin:"10px 0 14px",maxWidth:"10em"}}>Describe the lot and the thing you want to build.</h1>
          <p style={{fontSize:16,lineHeight:1.6,color:"#66717d"}}>LotScope keeps feasibility separate from information confidence. Each important fact carries its own source state so assumptions stay visible all the way into the result.</p>
          {groups.map(group=><section key={group} style={{marginTop:24,paddingTop:20,borderTop:"1px solid #e7e0d6"}}><div style={{marginBottom:12}}><strong style={{fontSize:12,letterSpacing:".1em",color:"#0d1b33"}}>{group}</strong><span style={{display:"block",fontSize:12,color:"#7b858f",marginTop:3}}>{notes[group]}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>{fields.filter(field=>field.group===group).map(field=><label key={field.key} style={{border:"1px solid #e2dcd3",borderRadius:14,padding:12,display:"grid",gap:7,background:"#fbfaf7"}}><span style={{fontSize:11,fontWeight:800,color:"#384757"}}>{field.label}</span><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" min="0" value={input[field.key]} onChange={event=>update(field.key,event.target.value)} style={{minWidth:0,width:"100%",fontSize:16,fontWeight:800,border:"1px solid #d8d1c6",borderRadius:10,padding:"9px 10px",background:"#fff"}}/>{field.unit&&<small style={{whiteSpace:"nowrap",color:"#7b858f"}}>{field.unit}</small>}</div><select value={confidence[field.key]} onChange={event=>state(field.key,event.target.value as FactState)} style={{border:"1px solid #d8d1c6",borderRadius:9,padding:"7px 8px",fontSize:11,background:"#fff"}}><option value="CONFIRMED">Confirmed</option><option value="USER_SUPPLIED">User supplied</option><option value="ASSUMED">Assumed</option><option value="UNKNOWN">Unknown</option></select></label>)}</div></section>)}
          <section style={{marginTop:20,padding:14,border:"1px solid #e2dcd3",borderRadius:14,background:"#fbfaf7",display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"center"}}><input type="checkbox" checked={input.garageIntegrated} onChange={event=>setInput(current=>({...current,garageIntegrated:event.target.checked}))}/><label><strong style={{display:"block",fontSize:12,color:"#0d1b33"}}>Garage integrated with building footprint</strong><span style={{fontSize:11,color:"#7b858f"}}>Use when upper-floor living can overlap garage footprint.</span></label><select value={confidence.garageIntegrated} onChange={event=>state("garageIntegrated",event.target.value as FactState)} style={{border:"1px solid #d8d1c6",borderRadius:9,padding:"7px 8px",fontSize:11,background:"#fff"}}><option value="CONFIRMED">Confirmed</option><option value="USER_SUPPLIED">User supplied</option><option value="ASSUMED">Assumed</option><option value="UNKNOWN">Unknown</option></select></section>
          <button onClick={()=>setEvidence(preview)} style={{marginTop:22,border:0,borderRadius:999,padding:"13px 18px",background:"#0d1b33",color:"#fff",fontWeight:900,cursor:"pointer"}}>Generate evidence-backed result →</button>
        </article>
        <aside style={{position:"sticky",top:20,background:"linear-gradient(160deg,#0d1b33,#1a3b66)",color:"#fff",borderRadius:24,padding:26,boxShadow:"0 20px 60px #0d1b3325"}}>
          <p style={{fontSize:10,fontWeight:900,letterSpacing:".13em",color:"#efb34d"}}>LIVE READ</p><h2 style={{font:"500 30px Georgia,serif",margin:"8px 0 18px"}}>{preview.feasibilityLabel}</h2>
          <div style={{display:"grid",gap:10}}>{preview.gates.slice(0,5).map(gate=><div key={gate.id} style={{border:"1px solid #ffffff22",borderRadius:13,padding:11,background:"#ffffff0b"}}><span style={{fontSize:9,fontWeight:900,letterSpacing:".08em",color:gate.status==="FAIL"?"#ffb8ae":gate.status==="WATCH"?"#f2d28d":"#bfe0bf"}}>{gate.status.replaceAll("_"," ")}</span><strong style={{display:"block",fontSize:12,marginTop:3}}>{gate.label}</strong></div>)}</div>
          <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid #ffffff22"}}><span style={{display:"block",fontSize:10,color:"#b8c7d6"}}>Information confidence</span><strong>{preview.informationConfidenceLabel}</strong></div>
          <p style={{fontSize:11,lineHeight:1.55,color:"#b8c7d6",marginTop:18}}>The full result will show assumptions, watch items, and professional-review boundaries rather than compressing everything into one score.</p>
        </aside>
      </div>
    </section>
    <style jsx>{`@media(max-width:850px){.guided-vnext-grid{grid-template-columns:1fr!important}.guided-vnext-grid aside{position:static!important}}`}</style>
  </main>;
}
