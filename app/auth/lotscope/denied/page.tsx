import Link from "next/link";

export default async function LotScopeDeniedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const unavailable = params.reason === "unavailable";
  return <main className="shell" style={{ maxWidth: 720, paddingTop: 64 }}>
    <p className="eyebrow">LOTSCOPE WORKBENCH</p>
    <h1>{unavailable ? "Identity service is temporarily unavailable." : "Workbench access is not enabled for this account."}</h1>
    <p className="lede">{unavailable ? "Protected access fails closed when AeroVista authorization cannot be verified." : "The founder canary requires a live LotScope Workbench capability. Public LotScope remains available."}</p>
    <div className="hero-actions"><Link className="secondary-button" href="/">Public LotScope</Link><Link className="secondary-button" href="/auth/lotscope/login">Try another account</Link></div>
  </main>;
}
