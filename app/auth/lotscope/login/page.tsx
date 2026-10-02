import Link from "next/link";
import LotScopeLoginLauncher from "@/components/aerovista/LotScopeLoginLauncher";
import { sanitizeWorkbenchNext } from "@/lib/aerovista/workbench-access";

export default async function LotScopeLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = sanitizeWorkbenchNext(typeof params.next === "string" ? params.next : null);
  return <main className="shell" style={{ maxWidth: 720, paddingTop: 64 }}>
    <p className="eyebrow">LOTSCOPE WORKBENCH · AEROVISTA IDENTITY</p>
    <h1>Sign in to the private Workbench.</h1>
    <p className="lede">The public LotScope assessment remains open. The professional Workbench uses your AeroVista Account and live AVCC authorization.</p>
    <div className="hero-actions"><LotScopeLoginLauncher next={next} /><Link className="secondary-button" href="/">Return to public LotScope</Link></div>
  </main>;
}
