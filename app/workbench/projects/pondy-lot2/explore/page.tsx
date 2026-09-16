import Link from "next/link";
import { CandidateExploration } from "@/components/workbench/CandidateExploration";

export const metadata = { title: "LotScope Workbench · Pondy Exploration" };

export default function PondyExplorePage() {
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head">
      <p className="eyebrow">PONDY LOT 2 · EXPLORATION</p>
      <h1>Let Workbench find the field before staff edits it.</h1>
      <p className="lede">The ranked solver still searches broadly. This layer reduces raw states into distinct representative concepts and exposes only the options worth reviewing.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2">Lot workspace</Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Candidate library</Link></div>
    </section>
    <CandidateExploration />
  </main>;
}
