"use client";

import {useEffect,useState} from "react";

type PreviewState={status:"loading"|"ready"|"error";html?:string;reason?:string};

export function WorkbenchReportPreview(){
 const [preview,setPreview]=useState<PreviewState>({status:"loading"});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setPreview({status:"loading"});
  (async()=>{
   try{
    const response=await fetch("/api/workbench/pondy-report",{credentials:"same-origin",cache:"no-store",signal:controller.signal});
    if(!response.ok){
     const detail=(await response.text()).replace(/<[^>]*>/g," ").trim().slice(0,240);
     throw new Error(`Report request returned ${response.status}${detail?": "+detail:""}`);
    }
    const mime=response.headers.get("content-type")??"";
    if(!mime.includes("text/html"))throw new Error("The report endpoint did not return HTML.");
    const html=await response.text();
    if(!html.trim())throw new Error("The report endpoint returned an empty document.");
    if(!controller.signal.aborted)setPreview({status:"ready",html});
   }catch(error){
    if(!controller.signal.aborted)setPreview({status:"error",reason:error instanceof Error?error.message:"Unable to load report"});
   }
  })();
  return ()=>controller.abort();
 },[attempt]);
 return <section className="wb-panel" aria-label="Pondy Lot 2 report preview" style={{marginTop:16}}>
  <div className="hero-actions" style={{marginBottom:14}}>
   <a href="/api/workbench/pondy-report" className="primary-button" target="_blank" rel="noreferrer">Open full report in new tab ↗</a>
   <button type="button" className="secondary-button" onClick={()=>setAttempt(n=>n+1)}>Reload report preview</button>
  </div>
  {preview.status==="loading"&&<p role="status" className="microcopy">Preparing the current Workbench report…</p>}
  {preview.status==="error"&&<div role="alert" className="candidate-warning-box">
   <strong>Report preview unavailable</strong>
   <p>{preview.reason}</p>
   <p>Use Open full report to check the direct endpoint, or reload after confirming your Workbench session. This does not imply that site, roof, circulation, or professional approval gates passed.</p>
  </div>}
  {preview.status==="ready"&&<iframe className="report-frame" srcDoc={preview.html} sandbox="allow-popups allow-popups-to-escape-sandbox" title="Pondy Lot 2 report — authenticated HTML preview" style={{display:"block",width:"100%",minHeight:700,border:0,background:"#fff"}}/>}
 </section>;
}
