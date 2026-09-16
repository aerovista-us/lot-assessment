import Link from "next/link";
import projectSpec from "@/projects/pondy-lot2/project.json";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const stages = ["Intake", "Rules", "Program", "Explore", "Review", "Intervention", "Validate", "Select", "Freeze", "Present"];

export const metadata = { title: "LotScope Workbench · Pondy Lot 2" };

export default function PondyLotWorkspace() {
  const lot = pondyCandidateRegistry.lots[0];
  const candidates = pondyCandidateRegistry.candidates;
  const interventions = candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION");
  return <main className="shell workbench-shell lot-workspace-shell">
    <section className="staff-page-head"><p className="eyebrow">PONDY FLATS · LOT WORKSPACE</p><h1>{lot.label}</h1><p className="lede">{lot.address} · {lot.frontage} access · {lot.informationState.toLowerCase()} information state</p>
      <div className="hero-actions"><Link className="primary-button" href="/workbench/projects/pondy-lot2/explore">Run exploration</Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Review saved candidates</Link></div></section>

    <section className="lot-progress-ribbon">{stages.map((stage, index) => <div key={stage} className={index < 5 ? "stage-complete" : index === 5 ? "stage-active" : "stage-pending"}><span>{index + 1}</span><b>{stage}</b></div>)}</section>

    <section className="lot-workspace-grid">
      <article className="wb-panel"><p className="eyebrow">NEXT ACTION</p><h2>Run broad exploration first.</h2><p>Workbench should search and triage before staff starts drawing. The durable registry currently contains {interventions.length} intervention-ready saved candidates; a fresh exploration can surface additional distinct concepts.</p><Link className="secondary-button" href="/workbench/projects/pondy-lot2/explore">Run Candidate Search & Triage</Link></article>
      <article className="wb-panel"><p className="eyebrow">LOT FACTS</p><h2>Current planning inputs</h2><dl className="facts-list"><div><dt>Parcel</dt><dd>{projectSpec.parcel.polygon.length} survey vertices</dd></div><div><dt>Access</dt><dd>{projectSpec.parcel.accessSides.join(", ")}</dd></div><div><dt>Program</dt><dd>{projectSpec.program.units} homes · {projectSpec.program.enclosedSpacesPerUnit} enclosed spaces/home</dd></div><div><dt>Living target</dt><dd>{projectSpec.program.targetLivingSqFt[0]}–{projectSpec.program.targetLivingSqFt[1]} SF</dd></div><div><dt>Vehicle</dt><dd>{projectSpec.circulation.designVehicle}</dd></div></dl></article>
      <article className="wb-panel"><p className="eyebrow">OPEN INFORMATION</p><h2>Professional / AHJ confirmation</h2><p>Accessory-structure interpretation, close garage separation, civil grading/drainage and final permit-level validation remain outside the current automated proof.</p><span className="repair-watch">DO NOT PROMOTE AS RESOLVED</span></article>
    </section>

    <section className="wb-panel lot-automation-callout"><div><p className="eyebrow">AUTOMATION-FIRST RULE</p><h2>Staff does not start by drawing.</h2></div><p>Broad search and ranking stay first. Human intervention is reserved for candidates the machine classifies as worth repairing. Any future component edit creates a child revision and makes prior evidence stale until the pipeline reruns it.</p></section>
  </main>;
}
