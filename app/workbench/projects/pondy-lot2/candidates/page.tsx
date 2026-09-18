import Link from "next/link";
import { CandidateLibraryWorkspace } from "@/components/workbench/CandidateLibraryWorkspace";

export const metadata = { title: "LotScope Workbench · Candidate Library" };

export default function CandidateLibraryPage() {
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PONDY LOT 2 · CANDIDATE LIBRARY</p>
      <h1>Review distinct options, preserve every decision point.</h1>
      <p className="lede">Machine evidence owns PASS. Staff can save promising exploration results, create checkpoints, branch revisions, create new designs, round-trip packages and compare candidates without overwriting the source record.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2">Lot workspace</Link><Link className="primary-button" href="/workbench/projects/pondy-lot2/explore">Run exploration</Link></div>
    </section>
    <CandidateLibraryWorkspace />
  </main>;
}
