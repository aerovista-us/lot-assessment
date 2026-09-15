import Link from "next/link";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const metadata = { title: "LotScope Workbench · Projects" };

export default function ProjectsPage() {
  const project = pondyCandidateRegistry.projects[0];
  const lot = pondyCandidateRegistry.lots[0];
  const candidates = pondyCandidateRegistry.candidates.filter((item) => item.lotId === lot.id);
  const interventionCount = candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION").length;
  return <main className="shell workbench-shell staff-projects-shell">
    <section className="staff-page-head"><p className="eyebrow">PROJECTS / LOTS</p><h1>Active lot work</h1><p className="lede">Open a lot to review inputs, exploration state, candidate evidence and next work.</p></section>
    <section className="project-list">
      <Link href="/workbench/projects/pondy-lot2" className="project-row-card">
        <div><span className="mode-pill">{project.status}</span><h2>{project.label} · {lot.label}</h2><p>{lot.address}</p></div>
        <div className="project-row-metrics"><span><b>{candidates.length}</b> candidates</span><span><b>{interventionCount}</b> intervention-ready</span><span><b>{lot.informationState}</b> information</span></div>
        <strong>Open lot workspace →</strong>
      </Link>
    </section>
    <section className="wb-panel staff-empty-state"><p className="eyebrow">NEW LOT</p><h2>Intake workflow is the next project-level capability.</h2><p>The registry model now supports additional projects/lots. New-lot form persistence will be wired after the candidate backbone is proven against Pondy.</p></section>
  </main>;
}
