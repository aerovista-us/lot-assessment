"use client";

import { useState } from "react";
import { AssessmentResult } from "@/components/AssessmentResult";
import type { AssessmentEvidence } from "@/packages/evidence";

export default function WorkbenchEvidencePage() {
  const [evidence, setEvidence] = useState<AssessmentEvidence | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [evaluatedCount, setEvaluatedCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const query = candidateId.trim() ? `?id=${encodeURIComponent(candidateId.trim())}` : "";
      const response = await fetch(`/api/workbench/pondy-evidence${query}`, { cache: "no-store" });
      const payload = await response.json() as { evidence?: AssessmentEvidence; evaluatedCount?: number; error?: string };
      if (!response.ok || !payload.evidence) throw new Error(payload.error || `Workbench returned ${response.status}`);
      setEvidence(payload.evidence);
      setEvaluatedCount(payload.evaluatedCount ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workbench evidence run failed");
    } finally {
      setRunning(false);
    }
  };

  if (evidence) {
    return <>
      <div style={{position:"fixed",right:18,bottom:18,zIndex:50,display:"flex",gap:8,alignItems:"center",background:"#0d1b33",color:"#fff",padding:"9px 12px",borderRadius:999,boxShadow:"0 10px 30px #0003"}}>
        {evaluatedCount != null && <span style={{fontSize:11,opacity:.75}}>{evaluatedCount} candidates evaluated</span>}
        <button onClick={() => setEvidence(null)} style={{border:0,borderRadius:999,padding:"7px 10px",fontWeight:800,cursor:"pointer"}}>Run another</button>
      </div>
      <AssessmentResult evidence={evidence} mode="WORKBENCH" />
    </>;
  }

  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#101d33,#152c4d)",color:"#eef3f8",padding:"40px 20px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <section style={{maxWidth:820,margin:"0 auto",background:"#ffffff0d",border:"1px solid #ffffff1d",borderRadius:24,padding:"clamp(24px,5vw,48px)"}}>
        <p style={{fontSize:11,fontWeight:900,letterSpacing:".15em",color:"#efb34d"}}>LOTSCOPE WORKBENCH · LIVE EVIDENCE</p>
        <h1 style={{font:"500 clamp(40px,7vw,68px)/.95 Georgia,serif",margin:"10px 0 18px",color:"#fff"}}>Run the solver. Get the proof.</h1>
        <p style={{fontSize:17,lineHeight:1.65,color:"#c5d1dd"}}>This runs the current Pondy Workbench solver, selects the leading promoted/finalist candidate by default, and converts the live solver output into the shared LotScope evidence contract. Enter a known candidate ID only when you want to inspect a specific result.</p>
        <label style={{display:"grid",gap:7,marginTop:26}}>
          <span style={{fontSize:11,fontWeight:900,letterSpacing:".08em",color:"#efb34d"}}>OPTIONAL CANDIDATE ID</span>
          <input value={candidateId} onChange={(event) => setCandidateId(event.target.value)} placeholder="Leave blank for current leading candidate" style={{width:"100%",borderRadius:14,border:"1px solid #ffffff2b",background:"#fff",color:"#0d1b33",padding:"13px 14px",fontSize:14}} />
        </label>
        <button onClick={run} disabled={running} style={{marginTop:16,border:0,borderRadius:999,padding:"12px 17px",background:"#efb34d",color:"#0d1b33",fontWeight:900,cursor:running?"wait":"pointer"}}>{running ? "Running full Workbench…" : "Run Workbench evidence"}</button>
        {error && <div style={{marginTop:16,padding:14,borderRadius:14,background:"#7f2e2e55",border:"1px solid #e6aaaa66",color:"#ffdede"}}><strong>Evidence run failed.</strong> {error}</div>}
        <p style={{fontSize:12,lineHeight:1.55,color:"#93a4b5",marginTop:22}}>Private diagnostic surface. Workbench promotion is design-development evidence, not zoning, civil, structural, fire/building, or permit approval.</p>
      </section>
    </main>
  );
}
