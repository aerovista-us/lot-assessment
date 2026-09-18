import Link from "next/link";
import { CandidateCompareWorkspace } from "@/components/workbench/CandidateCompareWorkspace";

export const metadata = { title: "LotScope Workbench · Compare Candidates" };

export default async function CandidateComparePage({ searchParams }: { searchParams: Promise<{ left?: string }> }) {
  const { left } = await searchParams;
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PONDY LOT 2 · CANDIDATE COMPARE</p>
      <h1>Compare geometry, lineage and machine evidence together.</h1>
      <p className="lede">Use comparison after branching or import. Staff may choose among options, but the comparison surface never creates or upgrades a PASS.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Candidate Library</Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/explore">Run exploration</Link></div>
    </section>
    <CandidateCompareWorkspace initialLeft={left} />
  </main>;
}
