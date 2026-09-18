"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { InterventionEditor } from "@/components/workbench/InterventionEditor";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentEvaluation, type PathComponent, type PolygonComponent } from "@/packages/candidates";
import { createWorkspaceExportPackage } from "@/packages/candidates/workspace";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

function downloadCandidate(candidateId: string, workspace: ReturnType<typeof useCandidateWorkspace>) {
  const pkg = createWorkspaceExportPackage(pondyCandidateRegistry, workspace.workspace, candidateId);
  if (!pkg) throw new Error("Unable to build candidate export.");
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${candidateId}.lotscope.json`;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function CandidateWorkspaceClient({ candidateId }: { candidateId: string }) {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const candidate = workspace.registry.candidates.find((item) => item.id === candidateId);
  if (!workspace.ready) return <div className="staff-empty-state wb-panel">Loading candidate workspace…</div>;
  if (!candidate) return <div className="staff-empty-state wb-panel">Candidate not found in the checked-in registry or local draft workspace. <Link href="/workbench/projects/pondy-lot2/candidates">Return to Candidate Library</Link>.</div>;

  const activeCandidate = candidate;

  const evaluation = currentEvaluation(candidate);
  const parent = activeCandidate.lineage.parentCandidateId ? workspace.registry.candidates.find((item) => item.id === activeCandidate.lineage.parentCandidateId) : null;
  const children = workspace.registry.candidates.filter((item) => item.lineage.parentCandidateId === activeCandidate.id);
  const placements = activeCandidate.components.filter((item) => item.kind === "home" || item.kind === "garage");
  const paths = activeCandidate.components.filter((item): item is PathComponent | PolygonComponent =>
    (((item.kind === "driveway" || item.kind === "route") && "points" in item) || (item.kind === "pavement" && "polygon" in item))
  );
  const checkpoints = workspace.registry.checkpoints.filter((item) => item.candidateId === activeCandidate.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function checkpoint() {
    const created = workspace.checkpointCandidate(activeCandidate.id);
    setMessage(`Checkpoint saved: ${created.label}`);
  }

  function branch(relation: "VARIANT" | "NEW_DESIGN") {
    const child = workspace.branchCandidate(activeCandidate.id, relation);
    router.push(`/workbench/projects/pondy-lot2/candidates/${child.id}`);
  }

  function createIntervention() {
    const child = workspace.branchCandidate(activeCandidate.id, "VARIANT");
    workspace.checkpointCandidate(child.id, "Intervention baseline");
    router.push(`/workbench/projects/pondy-lot2/candidates/${child.id}`);
  }

  function restore(checkpointId: string) {
    try {
      workspace.restoreCheckpoint(activeCandidate.id, checkpointId);
      setMessage("Checkpoint geometry restored. Evidence is stale until the active pipeline reruns this exact state.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Checkpoint restore failed.");
    }
  }

  function exportCurrent() {
    try {
      downloadCandidate(activeCandidate.id, workspace);
      setMessage(`Exported ${activeCandidate.revisionLabel} and its checkpoints.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Export failed.");
    }
  }

  return <>
    <section className="staff-page-head">
      <p className="eyebrow">CANDIDATE WORKSPACE · LIFECYCLE V1</p>
      <h1>{activeCandidate.label}</h1>
      <p className="lede">{activeCandidate.family} · {activeCandidate.status.replaceAll("_", " ")} · {activeCandidate.evidenceState} evidence</p>
      <div className="hero-actions">
        <Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Candidate Library</Link>
        {workspace.isLocalCandidate(activeCandidate.id) ? <button className="secondary-button" type="button" onClick={checkpoint}>Save checkpoint</button> : null}
        {!workspace.isLocalCandidate(activeCandidate.id) && activeCandidate.status === "ACCEPTABLE_FOR_INTERVENTION" ? <button className="primary-button" type="button" onClick={createIntervention}>Create Intervention</button> : null}
        {workspace.isLocalCandidate(activeCandidate.id) ? <button className="secondary-button" type="button" onClick={() => branch("VARIANT")}>Branch variant</button> : null}
        <button className="secondary-button" type="button" onClick={() => branch("NEW_DESIGN")}>New design from this</button>
        <button className="secondary-button" type="button" onClick={exportCurrent}>Export package</button>
        <Link className="secondary-button" href={`/workbench/projects/pondy-lot2/compare?left=${activeCandidate.id}`}>Compare</Link>
      </div>
      {message && <p className="microcopy lifecycle-message">{message}</p>}
    </section>

    <section className="candidate-workspace-grid">
      <article className="wb-panel candidate-plan-panel">
        <div className="section-heading"><div><p className="eyebrow">COMPONENT PLAN</p><h2>Rendered from registry components</h2></div><span className="mode-pill">{activeCandidate.components.length} COMPONENTS</span></div>
        <CandidatePlan candidate={candidate} />
        <p className="microcopy">Lifecycle actions branch before geometry changes. A variant or new design starts with stale evidence and cannot inherit a current PASS from its parent.</p>
      </article>
      <aside className="wb-panel candidate-inspector">
        <p className="eyebrow">CANDIDATE SUMMARY</p><h2>{activeCandidate.revisionLabel}</h2>
        <dl className="facts-list">
          <div><dt>Design</dt><dd>{activeCandidate.designId}</dd></div><div><dt>Source</dt><dd>{activeCandidate.source}</dd></div>
          <div><dt>Topology</dt><dd>{activeCandidate.topologyKey}</dd></div><div><dt>Evidence</dt><dd>{activeCandidate.evidenceState}</dd></div>
          <div><dt>Parent</dt><dd>{parent?.revisionLabel ?? "Root candidate"}</dd></div><div><dt>Children</dt><dd>{children.length}</dd></div>
          <div><dt>Checkpoints</dt><dd>{checkpoints.length}</dd></div><div><dt>Storage</dt><dd>{workspace.isLocalCandidate(activeCandidate.id) ? "Local draft" : "Checked-in registry"}</dd></div>
        </dl>
        <div className="candidate-classification-box"><b>Why this status?</b><p>{activeCandidate.classificationReason}</p></div>
        <div className="candidate-warning-box"><b>Machine-owned validation</b><p>Staff may branch, checkpoint and edit future child revisions, but cannot set PASS. Imported and branched records require current pipeline evidence.</p></div>
      </aside>
    </section>

    {workspace.isLocalCandidate(activeCandidate.id) ? <InterventionEditor candidate={activeCandidate} repairContextCandidate={evaluation ? activeCandidate : parent} onSave={workspace.saveCandidate} onCheckpoint={(label) => workspace.checkpointCandidate(activeCandidate.id, label)} /> : activeCandidate.status === "ACCEPTABLE_FOR_INTERVENTION" ? <section className="wb-panel intervention-start-callout"><div><p className="eyebrow">READY FOR STAFF INTERVENTION</p><h2>Create a protected child revision before changing geometry.</h2><p>The checked-in candidate stays untouched. The new intervention branch starts with stale evidence and an automatic baseline checkpoint, then unlocks constrained component editing.</p></div><button className="primary-button" type="button" onClick={createIntervention}>Create Intervention</button></section> : null}

    <section className="candidate-detail-grid">
      <article className="wb-panel"><p className="eyebrow">STRUCTURE COMPONENTS</p><h2>Homes + garages</h2><div className="component-list">{placements.map((item) => <div key={item.id}><span>{item.kind}</span><strong>{item.label}</strong><small>{"x" in item ? `${item.widthFt} x ${item.depthFt} ft · rotation ${item.rotationDeg ?? 0} deg · x ${item.x}, y ${item.y}` : ""}</small></div>)}</div></article>
      <article className="wb-panel"><p className="eyebrow">ACCESS COMPONENTS</p><h2>Pavement + route</h2><div className="component-list">{paths.map((item) => <div key={item.id}><span>{item.kind}</span><strong>{item.label}</strong><small>{"polygon" in item ? `${item.polygon.length} polygon vertices` : `${item.points.length} control points${item.garageId ? ` · target ${item.garageId}` : ""}`}</small></div>)}</div></article>
    </section>

    <section className="wb-panel candidate-evidence-panel">
      <div className="section-heading"><div><p className="eyebrow">CURRENT EVALUATION</p><h2>{evaluation?.summary ?? "No current evaluation"}</h2></div><span className={evaluation?.status === "PASS" ? "repair-pass" : evaluation?.status === "PARTIAL_FAIL" ? "repair-watch" : "repair-fail"}>{evaluation?.status ?? "NONE"}</span></div>
      <div className="gate-grid">{evaluation?.gates.map((gate) => <article key={gate.id}><div><span>{gate.status}</span><strong>{gate.label}</strong></div><p>{gate.summary}</p>{gate.repairClasses?.length ? <small>Repair classes: {gate.repairClasses.join(" · ")}</small> : null}</article>)}</div>
    </section>

    <section className="candidate-detail-grid">
      <article className="wb-panel candidate-lineage-panel"><p className="eyebrow">LINEAGE</p><h2>Original evidence stays recoverable.</h2><div className="lineage-row">{parent && <Link href={`/workbench/projects/pondy-lot2/candidates/${parent.id}`}>{parent.revisionLabel}</Link>}<span>{"→"}</span><strong>{activeCandidate.revisionLabel}</strong>{children.map((child) => <span key={child.id}>{"→"} <Link href={`/workbench/projects/pondy-lot2/candidates/${child.id}`}>{child.revisionLabel}</Link></span>)}</div></article>
      <article className="wb-panel"><p className="eyebrow">CHECKPOINTS</p><h2>Recoverable snapshots</h2>{checkpoints.length ? <div className="component-list">{checkpoints.map((checkpoint) => <div key={checkpoint.id}><span>checkpoint</span><strong>{checkpoint.label}</strong><small>{new Date(checkpoint.createdAt).toLocaleString()} · {checkpoint.componentSnapshot.length} components · evaluation {checkpoint.currentEvaluationId ?? "none"}</small><button className="tiny-action" type="button" onClick={() => restore(checkpoint.id)}>Restore geometry</button></div>)}</div> : <p className="microcopy">No checkpoints yet. Save one before an intervention or topology change.</p>}</article>
    </section>
  </>;
}
