import Link from "next/link";

export const metadata = {
  title: "LotScope vNext · Solve → Prove → Explain",
  description: "Preview of the shared evidence architecture powering public LotScope and the private Workbench."
};

export default function VNextPage() {
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#f9f7f2,#eee8de)",color:"#18212b",fontFamily:"Inter,system-ui,sans-serif",padding:"32px 20px 72px"}}>
      <section style={{maxWidth:1100,margin:"0 auto",background:"#fff",borderRadius:24,padding:"clamp(24px,5vw,52px)",boxShadow:"0 24px 70px #0d1b3314"}}>
        <p style={{fontSize:11,fontWeight:900,letterSpacing:".15em",color:"#9a742f"}}>LOTSCOPE VNEXT · FIRST IMPLEMENTATION SLICE</p>
        <h1 style={{font:"500 clamp(42px,7vw,78px)/.92 Georgia,serif",color:"#0d1b33",margin:"12px 0 20px",maxWidth:"9em"}}>Solve → Prove → Explain.</h1>
        <p style={{fontSize:18,lineHeight:1.65,color:"#66717d",maxWidth:"48em"}}>Public LotScope and the private Workbench now have a shared assessment-evidence contract. The public surface explains the answer; Workbench exposes the same result with the technical proof and provenance intact.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginTop:28}}>
          <article style={{border:"1px solid #ded8ce",borderRadius:18,padding:20}}><small style={{fontWeight:900,color:"#9a742f"}}>PUBLIC</small><h2 style={{font:"500 28px Georgia,serif",color:"#0d1b33"}}>Decision-support result</h2><p style={{color:"#66717d",lineHeight:1.5}}>Clear feasibility, confidence, proof gates, watch items, assumptions, and professional-review boundaries.</p><Link href="/assessment/pondy-d4" style={{display:"inline-block",marginTop:8,color:"#fff",background:"#0d1b33",padding:"10px 14px",borderRadius:999,textDecoration:"none",fontWeight:800}}>Open public example →</Link></article>
          <article style={{border:"1px solid #ded8ce",borderRadius:18,padding:20}}><small style={{fontWeight:900,color:"#9a742f"}}>PRIVATE</small><h2 style={{font:"500 28px Georgia,serif",color:"#0d1b33"}}>Workbench evidence view</h2><p style={{color:"#66717d",lineHeight:1.5}}>Exact metrics, technical gates, maneuver findings, traceability, and raw evidence provenance stay visible.</p><Link href="/workbench/assessment/pondy-d4" style={{display:"inline-block",marginTop:8,color:"#fff",background:"#0d1b33",padding:"10px 14px",borderRadius:999,textDecoration:"none",fontWeight:800}}>Open Workbench example →</Link></article>
        </div>
        <div style={{marginTop:24,padding:18,borderRadius:16,background:"#f3f6f8",color:"#55636f",lineHeight:1.55}}><strong style={{color:"#0d1b33"}}>Architecture rule:</strong> one engine → one evidence record → two experiences. Public does not invent a softer truth; it filters and explains the same evidence Workbench uses.</div>
      </section>
    </main>
  );
}
