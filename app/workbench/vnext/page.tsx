import Link from "next/link";

export const metadata = {
  title: "LotScope Workbench vNext · Evidence Architecture",
  description: "Private Workbench preview of the shared audit and evidence architecture."
};

export default function WorkbenchVNextPage() {
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#101d33,#152c4d)",color:"#eef3f8",fontFamily:"Inter,system-ui,sans-serif",padding:"32px 20px 72px"}}>
      <section style={{maxWidth:980,margin:"0 auto",background:"#ffffff0d",border:"1px solid #ffffff1f",borderRadius:24,padding:"clamp(24px,5vw,52px)",boxShadow:"0 24px 70px #0000002b"}}>
        <p style={{fontSize:11,fontWeight:900,letterSpacing:".15em",color:"#efb34d"}}>LOTSCOPE WORKBENCH VNEXT · PRIVATE</p>
        <h1 style={{font:"500 clamp(42px,7vw,78px)/.92 Georgia,serif",color:"#fff",margin:"12px 0 20px",maxWidth:"10em"}}>Investigate the proof, not just the score.</h1>
        <p style={{fontSize:18,lineHeight:1.65,color:"#c5d1dd",maxWidth:"50em"}}>Workbench keeps the exact gates, metrics, provenance, lifecycle state, and professional-review boundaries that sit underneath the public explanation. This is where candidate repair, comparison, promotion, and freeze decisions belong.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginTop:28}}>
          <article style={{border:"1px solid #ffffff26",borderRadius:18,padding:20,background:"#ffffff0a"}}><small style={{fontWeight:900,color:"#efb34d"}}>TECHNICAL RESULT</small><h2 style={{font:"500 28px Georgia,serif",color:"#fff"}}>Pondy Design 4 evidence</h2><p style={{color:"#c5d1dd",lineHeight:1.5}}>Exact vehicle clearances, gear changes, door margin, architecture gates, professional boundaries, source revision, workflow, artifact ID, and SHA.</p><Link href="/workbench/assessment/pondy-d4" style={{display:"inline-block",marginTop:8,color:"#0d1b33",background:"#efb34d",padding:"10px 14px",borderRadius:999,textDecoration:"none",fontWeight:900}}>Open technical evidence →</Link></article>
          <article style={{border:"1px solid #ffffff26",borderRadius:18,padding:20,background:"#ffffff0a"}}><small style={{fontWeight:900,color:"#efb34d"}}>CURRENT SOLVER</small><h2 style={{font:"500 28px Georgia,serif",color:"#fff"}}>Back to Workbench</h2><p style={{color:"#c5d1dd",lineHeight:1.5}}>Continue topology discovery, placement, program, room-packing, promotion, and canonical-freeze work in the current expert surface.</p><Link href="/workbench" style={{display:"inline-block",marginTop:8,color:"#fff",border:"1px solid #ffffff45",padding:"10px 14px",borderRadius:999,textDecoration:"none",fontWeight:800}}>Open Workbench →</Link></article>
        </div>
        <div style={{marginTop:24,padding:18,borderRadius:16,background:"#ffffff0d",color:"#c5d1dd",lineHeight:1.55}}><strong style={{color:"#fff"}}>Authority rule:</strong> Workbench owns technical promotion. Public may explain promoted evidence, but it does not weaken locked requirements or upgrade unresolved professional-review items.</div>
      </section>
    </main>
  );
}
