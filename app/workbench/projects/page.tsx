import Link from "next/link";
import { LOTSCOPE_PROJECTS, LOTSCOPE_APPLICATIONS } from "@/lib/lotscope-project-catalog";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const metadata = { title: "LotScope Workbench · Projects" };

export default function ProjectsPage() {
  const lot = pondyCandidateRegistry.lots[0];
  const candidates = pondyCandidateRegistry.candidates.filter((item) => item.lotId === lot.id);
  const interventionCount = candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION").length;
  return <main className="shell workbench-shell staff-projects-shell">
    <section className="staff-page-head"><p className="eyebrow">PROJECTS / LOTS</p><h1>Project workspaces</h1><p className="lede">Pondy Flats and B Street are projects, not separate apps. Source records and client reports stay preserved until their import gates pass.</p></section>
    <section className="wb-panel" aria-label="LotScope applications"><p className="eyebrow">APPLICATION BOUNDARY</p><h2>Three applications, shared projects</h2>
      <p>{LOTSCOPE_APPLICATIONS.map((app) => app.name).join(" · ")}</p>
      <p className="microcopy">LotScope Advanced is a planned named surface; it is not presented as an implemented engine or active route.</p>
    </section>
    <section className="project-list">
      {LOTSCOPE_PROJECTS.map((project) => <Link key={project.id} href={project.workbenchPath} className="project-row-card">
        <div><span className="mode-pill">{project.evidenceState.replaceAll("_", " ")}</span><h2>{project.name}</h2><p>{project.notes}</p></div>
        <div className="project-row-metrics"><span><b>{project.id === "pondy-lot2" ? candidates.length : "—"}</b>{project.id === "pondy-lot2" ? "candidates" : "candidates not imported"}</span><span><b>{project.id === "pondy-lot2" ? interventionCount : "—"}</b>intervention ready</span><span><b>{project.customerReport.status.replaceAll("_", " ")}</b>customer report</span></div>
        <strong>Open project →</strong>
      </Link>)}
    </section>
    <section className="wb-panel staff-empty-state"><p className="eyebrow">NEW PROJECT</p><h2>Shared project ingestion is next.</h2><p>Project records above are a curated registry, not a claim of synchronized imports or automated report publication. Source verification, identity binding and release controls remain required before project onboarding.</p></section>
  </main>;
}
