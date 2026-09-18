"use client";

import { useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentEvaluation, type CandidateRecord } from "@/packages/candidates";
import type { CandidateTriageResult, TriageBucket, TriagedCandidate } from "@/packages/candidates/triage";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const labels: Record<TriageBucket, string> = {
  RECOMMENDED: "Recommended",
  INTERVENTION: "Acceptable for intervention",
  HISTORY: "Rejected / history"
};

function statusClass(candidate: CandidateRecord) {
  if (["PASS", "PROMOTION_READY", "FROZEN"].includes(candidate.status)) return "repair-pass";
  if (["ACCEPTABLE_FOR_INTERVENTION", "PARTIAL_FAIL"].includes(candidate.status)) return "repair-watch";
  return "repair-fail";
}

function downloadCandidate(candidate: CandidateRecord) {
  const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${candidate.id}.lotscope-candidate.json`;
  anchor.click();
  URL.revokeObjectURL(href);
}
function ExplorationCard({ item, saved, onSave }: { item: TriagedCandidate; saved: boolean; onSave: (candidate: CandidateRecord) => void }) {
  const candidate = item.candidate;
  const evaluation = currentEvaluation(candidate);
  const failed = evaluation?.gates.filter((gate) => gate.status === "FAIL") ?? [];
  const watch = evaluation?.gates.filter((gate) => gate.status === "WATCH" || gate.status === "PROFESSIONAL_REVIEW") ?? [];
  return <article className="library-candidate-card exploration-card">
    <div className="candidate-thumb"><CandidatePlan candidate={candidate} /></div>
    <div className="candidate-card-body">
      <div className="candidate-card-head"><span className="mode-pill">#{item.rank} · {item.conceptKey}</span><span className={statusClass(candidate)}>{candidate.status.replaceAll("_", " ")}</span></div>
      <h3>{candidate.label}</h3>
      <p>{candidate.classificationReason}</p>
      <div className="candidate-chip-row"><span>{candidate.family}</span><span>{failed.length} hard blockers</span><span>{watch.length} watch/review</span><span>{evaluation?.score?.toFixed(1) ?? "—"} score</span></div>
      {failed[0] && <div className="candidate-blocker"><b>Primary blocker</b><span>{failed[0].label}: {failed[0].summary}</span></div>}
      <div className="candidate-card-actions"><button className="primary-button" type="button" disabled={saved} onClick={() => onSave(candidate)}>{saved ? "Saved to workspace" : "Save candidate"}</button><button className="secondary-button" type="button" onClick={() => downloadCandidate(candidate)}>Download candidate JSON</button></div>
    </div>
  </article>;
}

function BucketSection({ bucket, result, isSaved, onSave }: { bucket: TriageBucket; result: CandidateTriageResult; isSaved: (id: string) => boolean; onSave: (candidate: CandidateRecord) => void }) {
  const items = result.representatives.filter((item) => item.bucket === bucket);
  return <section className="library-section">
    <div className="library-section-head"><div><p className="eyebrow">{labels[bucket].toUpperCase()}</p><h2>{bucket === "RECOMMENDED" ? "Passing representatives" : bucket === "INTERVENTION" ? "Promising repair targets" : "Preserved lower-ranked concepts"}</h2></div><span className="mode-pill">{items.length}</span></div>
    {items.length ? <div className="library-grid">{items.map((item) => <ExplorationCard key={item.candidate.id} item={item} saved={isSaved(item.candidate.id)} onSave={onSave} />)}</div> : <div className="staff-empty-state wb-panel">No representatives landed in this bucket during the current run.</div>}
  </section>;
}
export function CandidateExploration() {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  const [result, setResult] = useState<CandidateTriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workbench/pondy-candidate-search", { cache: "no-store" });
      if (!response.ok) throw new Error(`Exploration failed (${response.status})`);
      setResult(await response.json() as CandidateTriageResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Exploration failed.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <section className="wb-panel exploration-launch">
      <div><p className="eyebrow">AUTOMATION FIRST</p><h2>Search broadly, then triage.</h2><p>Run the existing ranked solver. Workbench collapses raw results by concept group, converts representatives into registry-compatible candidate records, and separates them into machine-owned review buckets.</p></div>
      <button className="primary-button" type="button" onClick={run} disabled={loading}>{loading ? "Running exploration…" : result ? "Run exploration again" : "Run exploration"}</button>
    </section>
    {error && <section className="wb-panel"><span className="repair-fail">{error}</span></section>}
    {result && <>
      <section className="repair-summary-grid exploration-summary">
        <article className="wb-panel"><span>Raw evaluated</span><strong>{result.source.evaluatedCount}</strong><small>{result.source.searchProfile ?? "ranked"} search · {result.source.elapsedMs == null ? "runtime n/a" : `${(result.source.elapsedMs / 1000).toFixed(1)} sec`}.</small></article>
        <article className="wb-panel"><span>Representatives</span><strong>{result.representatives.length}</strong><small>Distinct concept groups exposed to staff.</small></article>
        <article className="wb-panel"><span>Recommended</span><strong>{result.counts.RECOMMENDED}</strong><small>Passing/high-value machine results.</small></article>
        <article className="wb-panel"><span>Intervention</span><strong>{result.counts.INTERVENTION}</strong><small>Repairable options worth staff time.</small></article>
      </section>
      <p className="microcopy exploration-note">Exploration emits full candidate records. Save a representative into the browser-local draft workspace or download it as JSON. Checked-in Design 4 / Design 4B records remain protected and exploration never overwrites saved drafts automatically.</p>
      <BucketSection bucket="RECOMMENDED" result={result} isSaved={workspace.isLocalCandidate} onSave={workspace.saveCandidate} />
      <BucketSection bucket="INTERVENTION" result={result} isSaved={workspace.isLocalCandidate} onSave={workspace.saveCandidate} />
      <BucketSection bucket="HISTORY" result={result} isSaved={workspace.isLocalCandidate} onSave={workspace.saveCandidate} />
    </>}
  </>;
}
