import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { currentEvaluation, type PathComponent, type PolygonComponent } from "@/packages/candidates";
import { getPondyCandidate, pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export async function generateStaticParams() {
  return pondyCandidateRegistry.candidates.map((candidate) => ({ candidateId: candidate.id }));
}

export default async function CandidateWorkspacePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const candidate = getPondyCandidate(candidateId);
  if (!candidate) notFound();
  const evaluation = currentEvaluation(candidate);
  const parent = candidate.lineage.parentCandidateId ? getPondyCandidate(candidate.lineage.parentCandidateId) : null;
  const children = pondyCandidateRegistry.candidates.filter((item) => item.lineage.parentCandidateId === candidate.id);
  const placements = candidate.components.filter((item) => item.kind === "home" || item.kind === "garage");
  const paths = candidate.components.filter((item): item is PathComponent | PolygonComponent => (((item.kind === "driveway" || item.kind === "route") && "points" in item) || (item.kind === "pavement" && "polygon" in item)));

  return <main className="shell workbench-shell candidate-workspace-shell">
    <section className="staff-page-head"><p className="eyebrow">CANDIDATE WORKSPACE  /  READ-ONLY COMPONENT VIEW</p><h1>{candidate.label}</h1><p className="lede">{candidate.family}  /  {candidate.status.replaceAll("_", " ")}  /  {candidate.evidenceState} evidence</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Candidate Library</Link><a className="secondary-button" href={`/api/workbench/export/candidate?id=${candidate.id}`}>Export candidate</a><Link className="secondary-button" href="/workbench/design4-repair">Open repair evidence</Link></div></section>

    <section className="candidate-workspace-grid">
      <article className="wb-panel candidate-plan-panel"><div className="section-heading"><div><p className="eyebrow">COMPONENT PLAN</p><h2>Rendered from registry components</h2></div><span className="mode-pill">{candidate.components.length} COMPONENTS</span></div><CandidatePlan candidate={candidate} /><p className="microcopy">This plan is assembled from separate parcel, home, garage, stall, opening, pavement and route objects. Direct manipulation comes after branching/checkpoint foundations.</p></article>
      <aside className="wb-panel candidate-inspector"><p className="eyebrow">CANDIDATE SUMMARY</p><h2>{candidate.revisionLabel}</h2><dl className="facts-list"><div><dt>Design</dt><dd>{candidate.designId}</dd></div><div><dt>Source</dt><dd>{candidate.source}</dd></div><div><dt>Topology</dt><dd>{candidate.topologyKey}</dd></div><div><dt>Evidence</dt><dd>{candidate.evidenceState}</dd></div><div><dt>Parent</dt><dd>{parent?.revisionLabel ?? "Root candidate"}</dd></div><div><dt>Children</dt><dd>{children.length}</dd></div></dl><div className="candidate-classification-box"><b>Why this status?</b><p>{candidate.classificationReason}</p></div><div className="candidate-warning-box"><b>Machine-owned validation</b><p>Staff can branch or alter geometry in later intervention mode, but cannot set PASS. Any geometry edit must invalidate current evidence until rerun.</p></div></aside>
    </section>

    <section className="candidate-detail-grid">
      <article className="wb-panel"><p className="eyebrow">STRUCTURE COMPONENTS</p><h2>Homes + garages</h2><div className="component-list">{placements.map((item) => <div key={item.id}><span>{item.kind}</span><strong>{item.label}</strong><small>{"x" in item ? `${item.widthFt} x ${item.depthFt} ft  /  rotation ${item.rotationDeg ?? 0} deg  /  x ${item.x}, y ${item.y}` : ""}</small></div>)}</div></article>
      <article className="wb-panel"><p className="eyebrow">ACCESS COMPONENTS</p><h2>Pavement + route</h2><div className="component-list">{paths.map((item) => <div key={item.id}><span>{item.kind}</span><strong>{item.label}</strong><small>{"polygon" in item ? `${item.polygon.length} polygon vertices` : `${item.points.length} control points`}</small></div>)}</div></article>
    </section>

    <section className="wb-panel candidate-evidence-panel"><div className="section-heading"><div><p className="eyebrow">CURRENT EVALUATION</p><h2>{evaluation?.summary ?? "No current evaluation"}</h2></div><span className={evaluation?.status === "PASS" ? "repair-pass" : evaluation?.status === "PARTIAL_FAIL" ? "repair-watch" : "repair-fail"}>{evaluation?.status ?? "NONE"}</span></div>
      <div className="gate-grid">{evaluation?.gates.map((gate) => <article key={gate.id}><div><span>{gate.status}</span><strong>{gate.label}</strong></div><p>{gate.summary}</p>{gate.repairClasses?.length ? <small>Repair classes: {gate.repairClasses.join("  /  ")}</small> : null}</article>)}</div>
    </section>

    <section className="wb-panel candidate-lineage-panel"><p className="eyebrow">LINEAGE</p><h2>Original evidence stays recoverable.</h2><div className="lineage-row">{parent && <Link href={`/workbench/projects/pondy-lot2/candidates/${parent.id}`}>{parent.revisionLabel}</Link>}<span>{"->"}</span><strong>{candidate.revisionLabel}</strong>{children.map((child) => <span key={child.id}>{"->"} <Link href={`/workbench/projects/pondy-lot2/candidates/${child.id}`}>{child.revisionLabel}</Link></span>)}</div></section>
  </main>;
}
