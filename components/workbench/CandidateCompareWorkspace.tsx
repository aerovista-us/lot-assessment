"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentEvaluation, type CandidateRecord } from "@/packages/candidates";
import { compareCandidateComponents } from "@/packages/candidates/workspace";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

function statusClass(candidate: CandidateRecord) {
  if (["PASS", "PROMOTION_READY", "FROZEN"].includes(candidate.status)) return "repair-pass";
  if (["ACCEPTABLE_FOR_INTERVENTION", "PARTIAL_FAIL", "DRAFT"].includes(candidate.status)) return "repair-watch";
  return "repair-fail";
}

function CandidateColumn({ candidate }: { candidate: CandidateRecord }) {
  const evaluation = currentEvaluation(candidate);
  return <article className="wb-panel compare-candidate-column">
    <div className="candidate-card-head"><span className="mode-pill">{candidate.revisionLabel}</span><span className={statusClass(candidate)}>{candidate.status.replaceAll("_", " ")}</span></div>
    <h2>{candidate.label}</h2>
    <CandidatePlan candidate={candidate} />
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
  return <div className="compare-gate-table">
    <div className="compare-gate-row compare-gate-head"><strong>Gate</strong><strong>{left.revisionLabel}</strong><strong>{right.revisionLabel}</strong></div>
    {gateIds.map((gateId) => {
      const leftGate = leftEvaluation?.gates.find((gate) => gate.id === gateId);
      const rightGate = rightEvaluation?.gates.find((gate) => gate.id === gateId);
      return <div className="compare-gate-row" key={gateId}>
        <span>{leftGate?.label ?? rightGate?.label ?? gateId}</span><span>{leftGate?.status ?? "—"}</span><span>{rightGate?.status ?? "—"}</span>
      </div>;
    })}
  </div>;
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

  return <>
    <section className="wb-panel compare-selector-panel">
      <div><p className="eyebrow">COMPARE</p><h2>Parent, intervention and solver descendants on one evidence surface.</h2><p>Comparison does not change validation state. It exposes component and gate differences so staff can select among candidates that have actually earned their current machine status.</p></div>
      <div className="compare-selectors">
        <label>Left candidate<select value={leftId} onChange={(event) => setLeftId(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.revisionLabel} · {candidate.label}</option>)}</select></label>
        <label>Right candidate<select value={rightId} onChange={(event) => setRightId(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.revisionLabel} · {candidate.label}</option>)}</select></label>
      </div>
    </section>

    {left && right && <>
      <section className="compare-candidate-grid"><CandidateColumn candidate={left} /><CandidateColumn candidate={right} /></section>
      <section className="wb-panel compare-difference-panel">
        <div className="section-heading"><div><p className="eyebrow">COMPONENT DELTA</p><h2>What changed?</h2></div><span className="mode-pill">{difference ? difference.added.length + difference.removed.length + difference.changed.length : 0} DELTAS</span></div>
        <div className="compare-delta-grid"><div><b>Added</b><span>{difference?.added.join(", ") || "None"}</span></div><div><b>Removed</b><span>{difference?.removed.join(", ") || "None"}</span></div><div><b>Changed</b><span>{difference?.changed.join(", ") || "None"}</span></div></div>
      </section>
      <section className="wb-panel"><p className="eyebrow">EVIDENCE MATRIX</p><h2>Machine gate status side by side</h2><GateCompare left={left} right={right} /></section>
      <div className="hero-actions compare-footer-actions"><Link className="secondary-button" href={`/workbench/projects/pondy-lot2/candidates/${left.id}`}>Open {left.revisionLabel}</Link><Link className="secondary-button" href={`/workbench/projects/pondy-lot2/candidates/${right.id}`}>Open {right.revisionLabel}</Link></div>
    </>}
  </>;
}
