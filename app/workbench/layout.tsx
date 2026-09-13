import Link from "next/link";
import "./workbench.css";

export default function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <div style={{position:"sticky",top:0,zIndex:90,display:"flex",justifyContent:"center",background:"#0b1729",borderBottom:"1px solid #ffffff18",padding:"7px 12px"}}>
      <nav style={{width:"min(1180px,100%)",display:"flex",justifyContent:"flex-end",gap:7,flexWrap:"wrap"}} aria-label="Workbench vNext tools">
        <Link href="/workbench/vnext" style={{color:"#d7e0ea",textDecoration:"none",fontSize:10,fontWeight:900,letterSpacing:".06em",border:"1px solid #ffffff24",borderRadius:999,padding:"6px 9px"}}>VNEXT</Link>
        <Link href="/workbench/evidence" style={{color:"#0d1b33",background:"#efb34d",textDecoration:"none",fontSize:10,fontWeight:900,letterSpacing:".04em",borderRadius:999,padding:"6px 9px"}}>RUN EVIDENCE</Link>
      </nav>
    </div>
    {children}
  </>;
}
