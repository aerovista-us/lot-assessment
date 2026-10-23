import Link from "next/link";
import { CandidateCompareWorkspace } from "@/components/workbench/CandidateCompareWorkspace";

export const metadata = { title: "LotScope Workbench · Compare Candidates" };

export default async function CandidateComparePage({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const { left } = await searchParams;
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PONDY LOT 2 · COMPARE DESIGNS</p>
      <h1>Two designs. A clearer decision.</h1>
      <p className="lede">Put the building arrangements and source checks side by side. Compare the tradeoffs, then open the design you want to refine.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Design library</Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/explore">Explore options</Link></div>
    </section>
    <CandidateCompareWorkspace initialLeft={left} />
  </main>;
}
