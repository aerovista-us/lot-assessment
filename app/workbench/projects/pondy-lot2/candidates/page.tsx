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
    <section className="wb-panel" aria-labelledby="design5-library-heading">
      <p className="eyebrow">DESIGN 5 · NEW REVISION WORKFLOW</p>
      <h2 id="design5-library-heading">Start from a source candidate; keep the original unchanged.</h2>
      <p>Choose a candidate below and select <strong>Open candidate</strong>, then <strong>New design from this</strong>. On the new child revision, open <strong>Build / Edit Design Shapes</strong>. This is the same shared geometry engine used for all designs—not a separate Design 5 solver.</p>
      <p className="microcopy">The new revision starts with stale evaluation evidence. Room and roof previews are not permit-grade; validate source geometry, circulation, roofs and generated report sections before publication.</p>
    </section>
    <CandidateLibraryWorkspace />
  </main>;
}
