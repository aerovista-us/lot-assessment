import Link from "next/link";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { currentEvaluation, type CandidateRecord } from "@/packages/candidates";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

function statusClass(candidate: CandidateRecord) {
  if (candidate.status === "PASS" || candidate.status === "PROMOTION_READY" || candidate.status === "FROZEN") return "repair-pass";
  if (candidate.status === "ACCEPTABLE_FOR_INTERVENTION" || candidate.status === "PARTIAL_FAIL") return "repair-watch";
  return "repair-fail";
}

function CandidateCard({ candidate }: { candidate: CandidateRecord }) {
  const evaluation = currentEvaluation(candidate);
  const failed = evaluation?.gates.filter((gate) => gate.status === "FAIL") ?? [];
  const passed = evaluation?.gates.filter((gate) => gate.status === "PASS" || gate.status === "PASS_TIGHT") ?? [];
  return <article className="library-candidate-card">
    <div className="candidate-thumb"><CandidatePlan candidate={candidate} /></div>
    <div className="candidate-card-body"><div className="candidate-card-head"><span className="mode-pill">{candidate.revisionLabel}</span><span className={statusClass(candidate)}>{candidate.status.replaceAll("_", " ")}</span></div>
      <h3>{candidate.label}</h3><p>{candidate.classificationReason}</p>
      <div className="candidate-chip-row"><span>{candidate.family}</span><span>{passed.length} passing gates</span><span>{failed.length} blockers</span><span>{candidate.evidenceState} evidence</span></div>
      {failed.length > 0 && <div className="candidate-blocker"><b>Primary blocker</b><span>{failed[0].label}: {failed[0].summary}</span></div>}
      <div className="candidate-card-actions"><Link className="primary-button" href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}`}>Open candidate</Link><a className="secondary-button" href={`/api/workbench/export/candidate?id=${candidate.id}`}>Export .lotscope.json</a></div>
    </div>
  </article>;
}

export const metadata = { title: "LotScope Workbench · Candidate Library" };

export default function CandidateLibraryPage() {
  const recommended = pondyCandidateRegistry.candidates.filter((item) => item.status === "PASS" || item.status === "PROMOTION_READY");
  const intervention = pondyCandidateRegistry.candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION");
  const history = pondyCandidateRegistry.candidates.filter((item) => !recommended.includes(item) && !intervention.includes(item));
  return <main className="shell workbench-shell candidate-library-shell">
    <section className="staff-page-head"><p className="eyebrow">PONDY LOT 2 · CANDIDATE LIBRARY</p><h1>Review distinct options, not raw solver noise.</h1><p className="lede">The registry keeps designs, revisions, evidence and lineage separate. Staff may choose what deserves attention; machine evidence owns classification and PASS.</p>
      <div className="hero-actions"><Link className="secondary-button" href="/workbench/projects/pondy-lot2">Lot workspace</Link><Link className="primary-button" href="/workbench/projects/pondy-lot2/explore">Run exploration</Link></div></section>

    <section className="library-section"><div className="library-section-head"><div><p className="eyebrow">RECOMMENDED</p><h2>Passing, high-value options</h2></div><span className="mode-pill">{recommended.length}</span></div>{recommended.length ? <div className="library-grid">{recommended.map((item) => <CandidateCard key={item.id} candidate={item} />)}</div> : <div className="staff-empty-state wb-panel">No candidate is currently promoted as a passing recommendation. This is intentional: Design 4 outbound remains open.</div>}</section>

    <section className="library-section"><div className="library-section-head"><div><p className="eyebrow">ACCEPTABLE FOR INTERVENTION</p><h2>Promising partial failures worth staff time</h2></div><span className="mode-pill">{intervention.length}</span></div><div className="library-grid">{intervention.map((item) => <CandidateCard key={item.id} candidate={item} />)}</div></section>

    <section className="library-section"><div className="library-section-head"><div><p className="eyebrow">REJECTED / HISTORY</p><h2>Preserved evidence, not discarded work</h2></div><span className="mode-pill">{history.length}</span></div>{history.length ? <div className="library-grid">{history.map((item) => <CandidateCard key={item.id} candidate={item} />)}</div> : <div className="staff-empty-state wb-panel">Historical solver candidates will populate this section as the ranked-search adapter is migrated into the registry.</div>}</section>
  </main>;
}
