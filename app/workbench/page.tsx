import Link from "next/link";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { WorkbenchHomeWorkspace, WorkbenchJourneyCards, WorkbenchResume } from "@/components/workbench/WorkbenchResume";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const project = pondyCandidateRegistry.projects[0];
const candidates = pondyCandidateRegistry.candidates;
const passing = candidates.filter(item => ["PASS", "PROMOTION_READY", "FROZEN"].includes(item.status));
const review = candidates.filter(item => item.status === "ACCEPTABLE_FOR_INTERVENTION");
const featured = candidates.find(item => item.id === "auto-PONDY-AFL-14") ?? candidates[0];

export default function WorkbenchHome() {
  return <WorkbenchHomeWorkspace defaultCandidateId={featured.id}><main className="shell workbench-shell staff-home-shell">
    <section className="studio-home-hero">
      <div className="studio-home-intro"><p className="eyebrow">LOTSCOPE · DESIGN WORKBENCH</p><h1>From a lot of possibilities<br />to a plan of your own.</h1>
        <p className="lede">Explore the site. Make space for the rooms that matter. Keep your chosen design connected to its drawings and report.</p>
        <WorkbenchResume />
        <p className="studio-home-note"><span aria-hidden="true">◈</span> Digital concepts, with clear validation and review boundaries.</p>
      </div>
      <Link className="studio-project-preview" href="/workbench/projects/pondy-lot2"><div className="studio-project-caption"><span>ACTIVE PROJECT</span><span>01 <span aria-hidden="true">↗</span></span></div><CandidatePlan candidate={featured}/><div className="studio-project-footer"><div><h2>{project.label}</h2><p>Explore, compare and refine your next direction.</p></div><span aria-hidden="true">→</span></div></Link>
    </section>
    <section className="studio-overview" aria-label="Registry overview">
      <div><strong>{project.lotIds.length}</strong><span>Active lots</span></div><div><strong>{candidates.length}</strong><span>Registry design options</span></div><div><strong>{passing.length}</strong><span>Source checks passed</span></div><div><strong>{review.length}</strong><span>Ready for refinement</span></div>
    </section>
    <section className="studio-start-section"><div className="section-heading"><div><p className="eyebrow">A CLEAR NEXT STEP</p><h2>A connected design journey.</h2></div><Link href="/workbench/projects/pondy-lot2/compare">Compare designs <span aria-hidden="true">↗</span></Link></div>
      <WorkbenchJourneyCards />
    </section>
    <details className="studio-engineering-links"><summary>Advanced &amp; engineering tools <span>Solver, source geometry and evidence</span></summary><div className="hero-actions"><Link className="secondary-button" href="/workbench/roof-drawings">Roof drawings</Link><Link className="secondary-button" href="/workbench/solver">Solver</Link><Link className="secondary-button" href="/workbench/automation">Automation</Link><Link className="secondary-button" href="/workbench/design4-repair">D4 repair</Link><Link className="secondary-button" href="/workbench/evidence">Evidence</Link></div></details>
    <footer className="studio-footer"><span>LotScope · An AeroVista workspace</span><span>Digital validation is separate from construction approval.</span></footer>
  </main></WorkbenchHomeWorkspace>;
}
