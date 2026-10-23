import Link from "next/link";
import { CandidateLibraryWorkspace } from "@/components/workbench/CandidateLibraryWorkspace";

export const metadata = { title: "LotScope Workbench · Candidate Library" };

export default function CandidateLibraryPage() {
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PONDY LOT 2 · DESIGN LIBRARY</p>
      <h1>Find the design you want to develop.</h1>
      <p className="lede">Browse site arrangements, find your local drafts and compare the options. Open a design to develop its room layout and report; source checks remain separate from construction approval.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2">Lot workspace</Link><Link className="primary-button" href="/workbench/projects/pondy-lot2/explore">Explore new options</Link></div>
    </section>
    <CandidateLibraryWorkspace />
  </main>;
}
