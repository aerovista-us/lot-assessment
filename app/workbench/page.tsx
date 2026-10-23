import Link from "next/link";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const activeProject = pondyCandidateRegistry.projects[0];
const intervention = pondyCandidateRegistry.candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION");
const passing = pondyCandidateRegistry.candidates.filter((item) => item.status === "PASS" || item.status === "PROMOTION_READY");
const needsInformation = pondyCandidateRegistry.lots.filter((lot) => pondyCandidateRegistry.candidates.some((candidate) => candidate.lotId === lot.id && candidate.evaluationHistory.some((evaluation) => evaluation.gates.some((gate) => gate.status === "PROFESSIONAL_REVIEW"))));
const readyToPresent = pondyCandidateRegistry.candidates.filter((item) => item.status === "FROZEN");

const cards = [
  { title: "New Lot", value: "+", copy: "Start intake for a new parcel, ruleset and customer program.", href: "/workbench/projects", state: "START" },
  { title: "Active Lots", value: String(activeProject.lotIds.length), copy: "Continue project intake, exploration, candidate review and evidence work.", href: "/workbench/projects", state: "ACTIVE" },
  { title: "Intervention Queue", value: String(intervention.length), copy: "Promising partial failures selected by machine rules for staff attention.", href: "/workbench/projects/pondy-lot2/candidates", state: "REVIEW" },
  { title: "Ready for Decision", value: String(passing.length), copy: "Passing candidates awaiting human preference selection. Selection never changes evidence.", href: "/workbench/projects/pondy-lot2/candidates", state: "DECIDE" },
  { title: "Needs Information", value: String(needsInformation.length), copy: "Pondy accessory-zoning and professional/AHJ items remain open.", href: "/workbench/projects/pondy-lot2", state: "BLOCKED" },
  { title: "Ready to Present", value: String(readyToPresent.length), copy: "Frozen candidates appear here after current evidence and selection are complete.", href: "/workbench/projects/pondy-lot2", state: "PRESENT" }
] as const;

export default function WorkbenchHome() {
  return <main className="shell workbench-shell staff-home-shell">
    <section className="staff-home-hero">
      <div><p className="eyebrow">LOTSCOPE WORKBENCH · STAFF HOME</p><h1>Find the strongest options first. Intervene only where it is worth it.</h1>
      <p className="lede">Workbench explores broadly, applies the hard gates, reduces near-duplicates, and surfaces the designs staff should review. Staff can branch and adjust geometry, but only the pipeline can produce PASS.</p></div>
      <aside className="wb-panel staff-next-card"><span>WHAT NEEDS ATTENTION</span><strong>Pondy Lot 2 has {intervention.length} intervention-ready candidates.</strong><p>Design 4 and its rotated-garage branch retain useful geometry but still have open outbound evidence.</p><Link className="primary-button" href="/workbench/projects/pondy-lot2/candidates">Open candidate library</Link></aside>
    </section>

    <section className="staff-card-grid">{cards.map((card) => <Link className="staff-op-card" href={card.href} key={card.title}>
      <div><span>{card.state}</span><strong>{card.value}</strong></div><h2>{card.title}</h2><p>{card.copy}</p><b>Open →</b>
    </Link>)}</section>

    <section className="wb-panel staff-flow-panel"><div><p className="eyebrow">STANDARD LOT PATH</p><h2>Automation first, controlled intervention second.</h2></div>
      <div className="staff-flow-ribbon">{["Intake","Rules","Program","Explore","Review","Intervention","Validate","Select","Freeze","Present"].map((label) => <span key={label}>{label}</span>)}</div>
      <p>These are workflow stages, not completion claims. Review each candidate's exact revision, saved layout, and current evidence before reporting. Digital validation does not equal construction approval.</p>
    </section>

    <section className="wb-panel" aria-label="Design journey launch" style={{marginBlock:20}}>
      <p className="eyebrow">CONTINUE A CUSTOMER DESIGN</p>
      <h2>Generate, compare, choose, save, validate and report.</h2>
      <p>Digital concept → Digitally validated → Construction approved. Only independently supported software gates can be called digitally validated; building authorization requires external review.</p>
      <div className="hero-actions"><Link className="primary-button" href="/workbench/projects/pondy-lot2/candidates/auto-PONDY-AFL-14">Open Design 4 workspace</Link>
      <Link className="secondary-button" href="/workbench/projects/pondy-lot2/compare">Compare saved designs</Link></div>
    </section>

    <section className="staff-advanced"><div><p className="eyebrow">ADVANCED / ENGINEERING</p><h2>Existing solver tools remain available during migration.</h2></div>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/roof-drawings">Roof drawing QA</Link><Link className="secondary-button" href="/workbench/solver">Core solver</Link><Link className="secondary-button" href="/workbench/automation">Automation</Link><Link className="secondary-button" href="/workbench/design4-repair">D4 repair lab</Link><Link className="secondary-button" href="/workbench/evidence">Evidence runner</Link></div>
    </section>
    <footer>LotScope Workbench · staff operating workspace · machine-owned validation</footer>
  </main>;
}
