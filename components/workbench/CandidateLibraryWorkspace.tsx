"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentEvaluation, type CandidateRecord, type LotScopePackage } from "@/packages/candidates";
import {
  createWorkspaceExportPackage,
  isLotScopePackage,
  type ImportMode
} from "@/packages/candidates/workspace";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

function statusClass(candidate: CandidateRecord) {
  if (["PASS", "PROMOTION_READY", "FROZEN"].includes(candidate.status)) return "repair-pass";
  if (["ACCEPTABLE_FOR_INTERVENTION", "PARTIAL_FAIL", "DRAFT"].includes(candidate.status)) return "repair-watch";
  return "repair-fail";
}

function downloadPackage(pkg: LotScopePackage) {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${pkg.candidate.id}.lotscope.json`;
  anchor.click();
  URL.revokeObjectURL(href);
}
function CandidateCard({ candidate, local, onExport }: { candidate: CandidateRecord; local: boolean; onExport: (candidateId: string) => void }) {
  const evaluation = currentEvaluation(candidate);
  const failed = evaluation?.gates.filter((gate) => gate.status === "FAIL") ?? [];
  const passed = evaluation?.gates.filter((gate) => gate.status === "PASS" || gate.status === "PASS_TIGHT") ?? [];
  return <article className="library-candidate-card">
    <div className="candidate-thumb"><CandidatePlan candidate={candidate} /></div>
    <div className="candidate-card-body">
      <div className="candidate-card-head">
        <span className="mode-pill">{candidate.revisionLabel}</span>
        <span className={statusClass(candidate)}>{candidate.status.replaceAll("_", " ")}</span>
      </div>
      <h3>{candidate.label}</h3>
      <p>{candidate.classificationReason}</p>
      <div className="candidate-chip-row">
        <span>{candidate.family}</span><span>{passed.length} passing gates</span><span>{failed.length} blockers</span>
        <span>{candidate.evidenceState} evidence</span>{local && <span>LOCAL DRAFT</span>}
      </div>
      {failed[0] && <div className="candidate-blocker"><b>Primary blocker</b><span>{failed[0].label}: {failed[0].summary}</span></div>}
      <div className="candidate-card-actions">
        <Link className="primary-button" href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}`}>Open candidate</Link>
        <button className="secondary-button" type="button" onClick={() => onExport(candidate.id)}>Export .lotscope.json</button>
      </div>
    </div>
  </article>;
}
function CandidateSection({ title, subtitle, candidates, localIds, onExport }: {
  title: string;
  subtitle: string;
  candidates: CandidateRecord[];
  localIds: Set<string>;
  onExport: (candidateId: string) => void;
}) {
  return <section className="library-section">
    <div className="library-section-head"><div><p className="eyebrow">{title}</p><h2>{subtitle}</h2></div><span className="mode-pill">{candidates.length}</span></div>
    {candidates.length ? <div className="library-grid">{candidates.map((candidate) =>
      <CandidateCard key={candidate.id} candidate={candidate} local={localIds.has(candidate.id)} onExport={onExport} />
    )}</div> : <div className="staff-empty-state wb-panel">No candidates currently occupy this bucket.</div>}
  </section>;
}

export function CandidateLibraryWorkspace() {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  const [importMode, setImportMode] = useState<ImportMode>("COPY");
  const [message, setMessage] = useState<string | null>(null);
  const localIds = new Set(workspace.workspace.candidates.map((candidate) => candidate.id));
  const candidates = workspace.registry.candidates;
  const recommended = candidates.filter((item) => ["PASS", "PROMOTION_READY", "FROZEN"].includes(item.status));
  const intervention = candidates.filter((item) => item.status === "ACCEPTABLE_FOR_INTERVENTION");
  const history = candidates.filter((item) => !recommended.includes(item) && !intervention.includes(item));

  function exportCandidate(candidateId: string) {
    const pkg = createWorkspaceExportPackage(pondyCandidateRegistry, workspace.workspace, candidateId);
    if (!pkg) return setMessage("Unable to create an export package for this candidate.");
    downloadPackage(pkg);
    setMessage(`Exported ${pkg.candidate.revisionLabel} with ${pkg.checkpoints.length} checkpoint(s).`);
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isLotScopePackage(parsed)) throw new Error("File is not a LotScope package v1 export.");
      const imported = workspace.importCandidatePackage(parsed, importMode);
      setMessage(`Imported ${imported.revisionLabel}. Historical evidence is preserved but requires revalidation.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Import failed.");
    }
  }

  return <>
    <section className="wb-panel lifecycle-toolbar">
      <div><p className="eyebrow">LOCAL DRAFT WORKSPACE</p><h2>Save, branch, checkpoint and round-trip candidates.</h2><p>Browser-local storage is the v1 draft persistence layer. Checked-in registry records stay protected; exports are the portable handoff until shared account persistence is wired.</p></div>
      <div className="lifecycle-toolbar-actions">
        <select value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)} aria-label="Import mode">
          <option value="COPY">Import as copy</option>
          <option value="VARIANT">Import as variant</option>
          <option value="NEW_DESIGN">Import as new design</option>
        </select>
        <label className="secondary-button lifecycle-file-button">Import .lotscope.json<input type="file" accept="application/json,.json" onChange={importFile} /></label>
        <Link className="secondary-button" href="/workbench/projects/pondy-lot2/compare">Compare candidates</Link>
      </div>
    </section>
    {message && <p className="microcopy lifecycle-message">{message}</p>}
    {!workspace.ready && <div className="staff-empty-state wb-panel">Loading local candidate workspace…</div>}
    <CandidateSection title="RECOMMENDED" subtitle="Passing, high-value options" candidates={recommended} localIds={localIds} onExport={exportCandidate} />
    <CandidateSection title="ACCEPTABLE FOR INTERVENTION" subtitle="Promising partial failures worth staff time" candidates={intervention} localIds={localIds} onExport={exportCandidate} />
    <CandidateSection title="DRAFT / REJECTED / HISTORY" subtitle="Preserved work, imported packages and new branches" candidates={history} localIds={localIds} onExport={exportCandidate} />
  </>;
}
