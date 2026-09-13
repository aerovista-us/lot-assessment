"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function VNextPublicBanner() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <aside style={{position:"fixed",left:16,right:16,bottom:16,zIndex:70,maxWidth:760,margin:"0 auto",background:"#0d1b33f2",color:"#fff",border:"1px solid #ffffff20",borderRadius:18,boxShadow:"0 16px 44px #0d1b3340",padding:"13px 15px",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}} aria-label="LotScope vNext preview">
      <div style={{minWidth:220,flex:"1 1 400px"}}>
        <strong style={{display:"block",fontSize:13}}>Try the evidence-backed LotScope result</strong>
        <span style={{display:"block",marginTop:3,color:"#c7d2df",fontSize:11,lineHeight:1.4}}>vNext separates feasibility, proof, assumptions, watch items, and professional-review boundaries instead of compressing everything into one score.</span>
      </div>
      <Link href="/assessment/guided" style={{display:"inline-block",whiteSpace:"nowrap",background:"#efb34d",color:"#0d1b33",textDecoration:"none",fontWeight:900,fontSize:11,padding:"9px 12px",borderRadius:999}}>Open vNext assessment →</Link>
    </aside>
  );
}
