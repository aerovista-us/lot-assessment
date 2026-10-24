"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentEvaluation, type CandidateRecord } from "@/packages/candidates";
import { compareCandidateComponents } from "@/packages/candidates/workspace";
import { currentWorkspaceDesignDocument } from "@/packages/candidates/workspace";
import type { DesignDocument } from "@/packages/candidates/design-document";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

function statusClass(candidate: CandidateRecord) {
  if (["PASS", "PROMOTION_READY", "FROZEN"].includes(candidate.status)) return "repair-pass";
  if (["ACCEPTABLE_FOR_INTERVENTION", "PARTIAL_FAIL", "DRAFT"].includes(candidate.status)) return "repair-watch";
  return "repair-fail";
}

function CandidateColumn({ candidate, design }: { candidate: CandidateRecord; design?: DesignDocument }) {
  const evaluation = currentEvaluation(candidate);
  return <article className="wb-panel compare-candidate-column">
    <div className="candidate-card-head"><span className="mode-pill">{candidate.revisionLabel}</span><span className={statusClass(candidate)}>{candidate.status.replaceAll("_", " ")}</span></div>
    <h2>{candidate.revisionLabel}</h2><p className="microcopy">{candidate.label}</p>
    <CandidatePlan candidate={candidate} />
    <p className="compare-layout-summary">{design ? `${design.shapes.filter(shape => shape.kind === "ROOM").length} saved rooms · design revision ${design.revision}` : "No saved room layout attached"}. Building arrangement shown above.</p>
    <Link className="secondary-button" href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}`}>Open this design <span aria-hidden="true">↗</span></Link>
    <dl className="facts-list">
      <div><dt>Design</dt><dd>{candidate.designId}</dd></div><div><dt>Family</dt><dd>{candidate.family}</dd></div>
      <div><dt>Topology</dt><dd>{candidate.topologyKey}</dd></div><div><dt>Evidence</dt><dd>{candidate.evidenceState}</dd></div>
      <div><dt>Source</dt><dd>{candidate.source}</dd></div><div><dt>Score</dt><dd>{evaluation?.score?.toFixed(1) ?? "—"}</dd></div>
    </dl>
  </article>;
}
function GateCompare({ left, right }: { left: CandidateRecord; right: CandidateRecord }) {
  const leftEvaluation = currentEvaluation(left);
  const rightEvaluation = currentEvaluation(right);
  const gateIds = [...new Set([...(leftEvaluation?.gates.map((gate) => gate.id) ?? []), ...(rightEvaluation?.gates.map((gate) => gate.id) ?? [])])];
  return <div className="compare-table-scroll" role="region" aria-label="Source check comparison" tabIndex={0}><table className="compare-evidence-table">
    <thead><tr><th scope="col">Source check</th><th scope="col">{left.revisionLabel}</th><th scope="col">{right.revisionLabel}</th></tr></thead><tbody>
    {gateIds.map((gateId) => {
      const leftGate = leftEvaluation?.gates.find((gate) => gate.id === gateId);
      const rightGate = rightEvaluation?.gates.find((gate) => gate.id === gateId);
      return <tr key={gateId}>
        <th scope="row">{leftGate?.label ?? rightGate?.label ?? gateId}</th><td>{leftGate?.status.replaceAll("_", " ") ?? "—"}</td><td>{rightGate?.status.replaceAll("_", " ") ?? "—"}</td>
      </tr>;
    })}
  </tbody></table></div>;
}

export function CandidateCompareWorkspace({ initialLeft }: { initialLeft?: string }) {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  const [leftId, setLeftId] = useState(initialLeft ?? "");
  const [rightId, setRightId] = useState("");
  const candidates = workspace.registry.candidates;

  useEffect(() => {
    if (!workspace.ready || !candidates.length) return;
    if (!leftId || !candidates.some((candidate) => candidate.id === leftId)) setLeftId(candidates[0].id);
  }, [workspace.ready, candidates, leftId]);

  useEffect(() => {
    if (!workspace.ready || candidates.length < 2) return;
    if (!rightId || rightId === leftId || !candidates.some((candidate) => candidate.id === rightId)) {
      setRightId(candidates.find((candidate) => candidate.id !== leftId)?.id ?? "");
    }
  }, [workspace.ready, candidates, leftId, rightId]);
  const left = candidates.find((candidate) => candidate.id === leftId) ?? null;
  const right = candidates.find((candidate) => candidate.id === rightId) ?? null;
  const difference = useMemo(() => left && right ? compareCandidateComponents(left, right) : null, [left, right]);

  if (!workspace.ready) return <div className="staff-empty-state wb-panel">Loading candidate workspace…</div>;
  if (candidates.length < 2) return <div className="staff-empty-state wb-panel">At least two candidates are required for comparison.</div>;

  if (workspace.storageError) return <div className="wb-panel workspace-storage-error" role="alert"><h2>Saved workspace needs attention</h2><p>{workspace.storageError}</p><button type="button" className="secondary-button" onClick={workspace.retryStorage}>Retry saved workspace</button></div>;

  return <>
    <section className="wb-panel compare-selector-panel">
      <div><p className="eyebrow">YOUR COMPARISON</p><h2>Choose the two designs to compare.</h2><p>See the building arrangements, saved room counts and source checks together. Comparing designs does not change their saved geometry or validation.</p></div>
      <div className="compare-selectors">
        <label>Left candidate<select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.revisionLabel} · {candidate.label}</option>)}</select></label>
        <label>Right candidate<select value={rightId} onChange={(event) => setRightId(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.revisionLabel} · {candidate.label}</option>)}</select></label>
      </div>
    </section>

    {left && right && <>
      <section className="compare-candidate-grid"><CandidateColumn candidate={left} design={currentWorkspaceDesignDocument(workspace.workspace,left)} /><CandidateColumn candidate={right} design={currentWorkspaceDesignDocument(workspace.workspace,right)} /></section>
      <section className="wb-panel compare-difference-panel">
        <div className="section-heading"><div><p className="eyebrow">COMPONENT DELTA</p><h2>What changed?</h2></div><span className="mode-pill">{difference ? difference.added.length + difference.removed.length + difference.changed.length : 0} DELTAS</span></div>
        <div className="compare-delta-grid"><div><b>Added</b><span>{difference?.added.join(", ") || "None"}</span></div><div><b>Removed</b><span>{difference?.removed.join(", ") || "None"}</span></div><div><b>Changed</b><span>{difference?.changed.join(", ") || "None"}</span></div></div>
      </section>
      <section className="wb-panel"><p className="eyebrow">EVIDENCE MATRIX</p><h2>Machine gate status side by side</h2><GateCompare left={left} right={right} /></section>
      <div className="hero-actions compare-footer-actions"><Link className="secondary-button" href={`/workbench/projects/pondy-lot2/candidates/${left.id}`}>Open {left.revisionLabel}</Link><Link className="secondary-button" href={`/workbench/projects/pondy-lot2/candidates/${right.id}`}>Open {right.revisionLabel}</Link></div>
    </>}
  </>;
}
