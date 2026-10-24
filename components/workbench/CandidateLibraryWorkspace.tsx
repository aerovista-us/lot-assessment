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
      <h3>{candidate.revisionLabel}</h3>
      <p className="candidate-card-name">{candidate.label}</p>
      <p>{candidate.classificationReason}</p>
      <div className="candidate-chip-row">
        <span>{candidate.family}</span><span>{passed.length} passing gates</span><span>{failed.length} blockers</span>
        <span>{candidate.evidenceState} evidence</span>{local && <span>LOCAL DRAFT</span>}
      </div>
      {failed[0] && <div className="candidate-blocker"><b>Primary blocker</b><span>{failed[0].label}: {failed[0].summary}</span></div>}
      <div className="candidate-card-actions">
        <Link className="primary-button" href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}`}>Open design <span aria-hidden="true">↗</span></Link>
        <Link className="secondary-button" href={`/workbench/projects/pondy-lot2/compare?left=${candidate.id}`}>Compare</Link>
      </div>
      <div className="candidate-card-shortcuts"><Link href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}#universal-design-editor`}>Edit layout</Link><Link href={`/workbench/projects/pondy-lot2/candidates/${candidate.id}#customer-report-preview`}>Report</Link><button type="button" onClick={() => onExport(candidate.id)}>Export backup</button></div>
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
  if (!candidates.length) return null;
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const localIds = new Set(workspace.workspace.candidates.map((candidate) => candidate.id));
  const allCandidates = workspace.registry.candidates;
  const matchesFilter = (item: CandidateRecord) => filter === "all" ||
    (filter === "passing" && ["PASS", "PROMOTION_READY", "FROZEN"].includes(item.status)) ||
    (filter === "review" && item.status === "ACCEPTABLE_FOR_INTERVENTION") ||
    (filter === "local" && localIds.has(item.id));
  const query = search.trim().toLocaleLowerCase();
  const candidates = allCandidates.filter(item => matchesFilter(item) &&
    [item.id, item.label, item.revisionLabel, item.family].join(" ").toLocaleLowerCase().includes(query));
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

  if (workspace.storageError) return <div className="wb-panel workspace-storage-error" role="alert"><h2>Saved workspace needs attention</h2><p>{workspace.storageError}</p><button type="button" className="secondary-button" onClick={workspace.retryStorage}>Retry saved workspace</button></div>;
  if (!workspace.ready) return <div className="staff-empty-state wb-panel" role="status">Loading your design library…</div>;

  return <>
    <section className="library-discovery" aria-label="Find a design">
      <div className="library-search-row"><label className="library-search"><span>Search designs</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, revision or design family" /></label><p role="status" aria-live="polite">{candidates.length} of {allCandidates.length} designs</p></div>
      <div className="library-filter-row" role="group" aria-label="Filter designs">{[["all", "All designs"], ["passing", "Source checks passed"], ["review", "Needs refinement"], ["local", "Local drafts"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    </section>
    <details className="library-transfer-tools">
      <summary>Bring a design from another browser <span>Import a .lotscope.json backup</span></summary>
      <div className="lifecycle-toolbar">
      <div><h2>Import a design backup</h2><p>Your designs stay in this browser. Import a backup as a copy, a variant or a new design. Imported evidence requires revalidation.</p></div>
      <div className="lifecycle-toolbar-actions">
        <select value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)} aria-label="Import mode">
          <option value="COPY">Import as copy</option>
          <option value="VARIANT">Import as variant</option>
          <option value="NEW_DESIGN">Import as new design</option>
        </select>
        <label className="secondary-button lifecycle-file-button">Import .lotscope.json<input type="file" accept="application/json,.json" onChange={importFile} /></label>
      </div>
      </div>
    </details>
    {message && <p className="microcopy lifecycle-message" role="status">{message}</p>}
    {!candidates.length && <section className="wb-panel library-no-results"><p className="eyebrow">NO MATCHES</p><h2>Try a broader search.</h2><p>No designs match these filters. Your saved work is still here.</p><button className="secondary-button" type="button" onClick={() => {setSearch("");setFilter("all");}}>Clear search and filters</button></section>}
    <CandidateSection title="SOURCE CHECKS PASSED" subtitle="Options to explore further" candidates={recommended} localIds={localIds} onExport={exportCandidate} />
    <CandidateSection title="NEEDS REFINEMENT" subtitle="A promising starting point" candidates={intervention} localIds={localIds} onExport={exportCandidate} />
    <CandidateSection title="DRAFTS & HISTORY" subtitle="Your work, kept within reach" candidates={history} localIds={localIds} onExport={exportCandidate} />
  </>;
}
