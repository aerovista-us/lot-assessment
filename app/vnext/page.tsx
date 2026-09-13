import Link from "next/link";

export const metadata = {
  title: "LotScope vNext · Solve → Prove → Explain",
  description: "Preview of the public LotScope evidence-backed assessment experience."
};

export default function VNextPage() {
  return (
    <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#f9f7f2,#eee8de)",color:"#18212b",fontFamily:"Inter,system-ui,sans-serif",padding:"32px 20px 72px"}}>
      <section style={{maxWidth:900,margin:"0 auto",background:"#fff",borderRadius:24,padding:"clamp(24px,5vw,52px)",boxShadow:"0 24px 70px #0d1b3314"}}>
        <p style={{fontSize:11,fontWeight:900,letterSpacing:".15em",color:"#9a742f"}}>LOTSCOPE VNEXT · PUBLIC PREVIEW</p>
        <h1 style={{font:"500 clamp(42px,7vw,78px)/.92 Georgia,serif",color:"#0d1b33",margin:"12px 0 20px",maxWidth:"9em"}}>Solve → Prove → Explain.</h1>
        <p style={{fontSize:18,lineHeight:1.65,color:"#66717d",maxWidth:"48em"}}>LotScope is moving beyond a single feasibility score. The next result model explains what appears feasible, what the engine actually proved, what is tight, which assumptions matter, and where professional review is still required.</p>
        <article style={{border:"1px solid #ded8ce",borderRadius:18,padding:22,marginTop:28}}>
          <small style={{fontWeight:900,color:"#9a742f"}}>PUBLIC DECISION SUPPORT</small>
          <h2 style={{font:"500 30px Georgia,serif",color:"#0d1b33",marginBottom:8}}>See the first evidence-backed result</h2>
          <p style={{color:"#66717d",lineHeight:1.55}}>The Pondy Flats Design 4 example shows feasibility, information confidence, proof gates, watch items, assumptions, and professional-review boundaries in one organized assessment.</p>
          <Link href="/assessment/pondy-d4" style={{display:"inline-block",marginTop:8,color:"#fff",background:"#0d1b33",padding:"11px 15px",borderRadius:999,textDecoration:"none",fontWeight:800}}>Open public assessment →</Link>
        </article>
        <div style={{marginTop:24,padding:18,borderRadius:16,background:"#f3f6f8",color:"#55636f",lineHeight:1.55}}><strong style={{color:"#0d1b33"}}>Product rule:</strong> the public result is derived from the same evidence contract used internally. It may simplify the explanation, but it may not turn a watch item or professional-review item into a pass.</div>
      </section>
    </main>
  );
}
