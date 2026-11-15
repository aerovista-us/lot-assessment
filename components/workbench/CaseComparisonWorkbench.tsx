"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CASE_STRATEGIES, caseFingerprint, caseGate, createCaseProject, generateCaseAlternatives, tradeoffSummary,
  type CaseAlternative, type CaseProject, type CaseStrategy, type FindingStatus,
} from "@/lib/case-comparison";
import { validCaseDocument } from "@/lib/case-document-validation";

const STORAGE_KEY = "lotscope.case-comparison.v1";
const stages = ["Generate", "Compare", "Refine", "Validate", "Drawings", "Report"] as const;
type Stage = typeof stages[number];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function escapeHtml(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character)); }
function dateLabel(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export function CaseComparisonWorkbench() {
  const [project, setProject] = useState<CaseProject>(() => createCaseProject());
  const [stage, setStage] = useState<Stage>("Generate");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Saved in this browser · export a case package for transfer");
  const importInput = useRef<HTMLInputElement>(null);
  // Server revisions are independent from the draft's in-browser edit count.
  const serverRevision = useRef(0);
  const draftEditEpoch = useRef(0);
  const activeCaseId = useRef(project.id);
  const [cloudState, setCloudState] = useState("Not synced · browser draft only");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudCases, setCloudCases] = useState<Array<{ id: string; name: string; revision: number }>>([]);
  const [cloudCaseId, setCloudCaseId] = useState("");
  const gate = useMemo(() => caseGate(project), [project]);
  const fingerprint = useMemo(() => caseFingerprint(project), [project]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (validCaseDocument(parsed)) { activeCaseId.current = parsed.id; setProject({ ...parsed, acceptedAt: null }); }
        else { storageSafe.current = false; setMessage("Saved browser draft failed validation. It was not loaded or overwritten. Export the original browser data before attempting recovery."); }
      }
    } catch { storageSafe.current = false; setMessage("Browser draft could not be read. The original stored data was not overwritten."); }
    setReady(true);
  }, []);
  const storageSafe = useRef(true);
  useEffect(() => {
    if (!ready || !storageSafe.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }
    catch { setMessage("Browser draft could not be saved. Export this case before leaving."); }
  }, [project, ready]);

  async function loadCloudCase(requestedId = project.id) {
    if (!window.confirm("Replace this browser draft with the selected cloud case? Export first if you need to preserve local changes.")) return;
    const id = requestedId;
    const beforeLoadEditEpoch = draftEditEpoch.current;
    setCloudBusy(true);
    try {
      const response = await fetch(`/api/workbench/cases?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (draftEditEpoch.current !== beforeLoadEditEpoch) {
        setCloudState("Cloud load cancelled: browser draft changed while loading. Your edits were preserved.");
        return;
      }
      if (response.status === 404) {
        serverRevision.current = 0;
        setCloudState("No cloud case for this ID yet · local draft preserved");
        return;
      }
      if (!response.ok) throw new Error(`Cloud load failed (${response.status})`);
      const result = await response.json() as { revision: number; project: CaseProject };
      if (!validCaseDocument(result.project) || result.project.id !== id || !Number.isSafeInteger(result.revision) || result.revision < 1) throw new Error("Unexpected case response");
      if (draftEditEpoch.current !== beforeLoadEditEpoch) {
        setCloudState("Cloud load cancelled: browser draft changed while loading. Your edits were preserved.");
        return;
      }
      serverRevision.current = result.revision;
      activeCaseId.current = result.project.id;
      storageSafe.current = true;
      setProject(result.project);
      setCloudCaseId(result.project.id);
      setCloudState(`Cloud case loaded · revision ${result.revision}`);
    } catch (error) {
      setCloudState(error instanceof Error ? error.message : "Cloud load failed");
    } finally {
      setCloudBusy(false);
    }
  }
  async function browseCloudCases() {
    setCloudBusy(true);
    try {
      const response = await fetch("/api/workbench/cases?list=1", { cache: "no-store" });
      if (!response.ok) throw new Error(`Case index unavailable (${response.status})`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("cases" in payload) ||
          !Array.isArray(payload.cases)) throw new Error("Invalid cloud case index");
      const cases = payload.cases.filter((c: unknown): c is { id: string; name: string; revision: number } =>
        !!c && typeof c === "object" && "id" in c && "name" in c && "revision" in c &&
        typeof c.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(c.id) &&
        typeof c.name === "string" && Number.isSafeInteger(c.revision)).slice(0, 100);
      setCloudCases(cases);
      setCloudCaseId(cases[0]?.id ?? "");
      setCloudState(cases.length ? `${cases.length} cloud case(s) found for your account` : "No saved cloud cases for your account");
    } catch (error) {
      setCloudState(error instanceof Error ? error.message : "Could not browse cloud cases");
    } finally {
      setCloudBusy(false);
    }
  }
  function newCase() {
    if (!window.confirm("Create a new browser case? Export the current draft first if it has not been saved to cloud.")) return;
    const fresh = createCaseProject(2);
    fresh.id = `HZ-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
    draftEditEpoch.current += 1;
    serverRevision.current = 0;
    activeCaseId.current = fresh.id;
    storageSafe.current = true;
    setProject(fresh);
    setCloudCaseId("");
    setCloudState("New browser case · not saved to cloud");
    setMessage("New study created with unverified example dimensions. Enter measured lot details before making decisions.");
    setStage("Generate");
  }
  async function saveCloudCase() {
    setCloudBusy(true);
    const snapshot = clone(project);
    try {
      const response = await fetch("/api/workbench/cases", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: serverRevision.current, project: snapshot }),
      });
      if (response.status === 409) {
        setCloudState("Conflict: cloud case changed. Export this draft before loading the newer revision.");
        return;
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(failure.error || `Cloud save failed (${response.status})`);
      }
      const result = await response.json() as { revision: number; project: CaseProject };
      if (!validCaseDocument(result.project) || result.project.id !== snapshot.id || !Number.isSafeInteger(result.revision) || result.revision < 1) throw new Error("Unexpected save response");
      if (activeCaseId.current !== snapshot.id) {
        setCloudState(`Case ${snapshot.id} was saved remotely at revision ${result.revision}, but a different case is now open. Its local draft and revision were not changed.`);
        return;
      }
      serverRevision.current = result.revision;
      setCloudCaseId(result.project.id);
      setCloudCases(current => [{
        id: result.project.id, name: result.project.name, revision: result.revision,
      }, ...current.filter(item => item.id !== result.project.id)].slice(0, 100));
      // Do not overwrite edits made while the request was in flight. Never display a
      // client-side acceptance that the server intentionally refused to persist.
      setProject(current => current.id === snapshot.id &&
        current.revision === snapshot.revision && current.updatedAt === snapshot.updatedAt
        ? result.project : current);
      setCloudState(`Cloud case saved · revision ${result.revision}; unsynced edits may remain`);
    } catch (error) {
      setCloudState(error instanceof Error ? error.message : "Cloud save failed; browser draft retained");
    } finally {
      setCloudBusy(false);
    }
  }
  function update(mutator: (next: CaseProject) => void, note?: string) {
    draftEditEpoch.current += 1;
    setProject(current => { const next = clone(current); next.acceptedAt = null; mutator(next); next.revision += 1; next.updatedAt = new Date().toISOString(); return next; });
    setCloudState("Unsynced browser changes · save cloud case to persist");
    if (note) setMessage(note);
  }
  function generate() {
    update(next => { next.alternatives = generateCaseAlternatives(next); next.acceptedAt = null; }, "Generated reproducible X, Y and Best-fit alternatives. Saved layout was not changed.");
    setStage("Compare");
  }
  function saveAlternative(alternative: CaseAlternative) {
    update(next => { if (next.savedLayout && next.savedLayout.id !== alternative.id) next.baselineLayout = next.savedLayout; next.savedLayout = alternative; next.acceptedAt = null; }, `${alternative.name} is now the working layout; comparison alternatives remain unchanged.`);
  }
  function exportCase() {
    const payload = { schema: "horizon.lotscope.case-package.v1", exportedAt: new Date().toISOString(), acceptance: { state: gate.state, explicit: false, missingEvidence: gate.missingEvidence.map(item => item.id), openRisks: gate.openRisks.map(item => item.id) }, project };
    download(`${project.id}-case-package.json`, JSON.stringify(payload, null, 2), "application/json");
  }
  function exportReport() {
    const evidenceRows = project.evidence.map(item => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.source || "Not recorded")}</td></tr>`).join("");
    download(`${project.id}-conditional-report.html`, `<!doctype html><meta charset="utf-8"><title>${escapeHtml(project.name)}</title><style>body{font:14px system-ui;max-width:900px;margin:50px auto;color:#172033}h1,h2{font-family:Georgia,serif}aside{padding:15px;background:#fff4d7;border-left:5px solid #b7791f}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}</style><h1>${escapeHtml(project.name)}</h1><p>${escapeHtml(project.id)} · revision ${project.revision} · ${escapeHtml(fingerprint)}</p><aside><strong>Status: ${gate.label}</strong><p>Conditional coordination report only. Not structural, code, access, circulation, permitting, construction, or design acceptance.</p></aside><h2>Tradeoff summary</h2><p>${escapeHtml(tradeoffSummary(project))}</p><h2>Evidence</h2><table><tr><th>Gate</th><th>Status</th><th>Source</th></tr>${evidenceRows}</table>`, "text/html");
  }
  function importPackage(file: File) {
    if (file.size > 1024 * 1024) { setMessage("Import blocked: case package exceeds 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload: unknown = JSON.parse(String(reader.result));
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid package");
        const packageRecord = payload as { schema?: unknown; project?: unknown };
        if (packageRecord.schema !== "horizon.lotscope.case-package.v1") throw new Error("unsupported package schema");
        if (!validCaseDocument(packageRecord.project)) throw new Error("invalid case document or missing required evidence");
        const incoming = packageRecord.project;
        draftEditEpoch.current += 1;
        setProject(current => ({ ...incoming, id: current.id, revision: current.revision + 1, updatedAt: new Date().toISOString(), acceptedAt: null }));
        storageSafe.current = true;
        serverRevision.current = 0;
        setMessage("Imported case draft. Verify source evidence before cloud saving; acceptance is not transferred.");
        setCloudState("Imported draft not synced to cloud · check for an existing cloud case before saving");
      } catch (error) {
        setMessage(`Import blocked: ${error instanceof Error ? error.message : "invalid file"}`);
      }
    };
    reader.onerror = () => setMessage("Import blocked: file could not be read.");
    reader.readAsText(file);
  }

  return <main className="shell workbench-shell cc-shell">
    <header className="cc-head"><div><p className="eyebrow">LOTSCOPE WORKBENCH · CASE COMPARISON</p><h1>Coordinate the decision.<br/>Keep uncertainty visible.</h1><p className="lede">Compare residential site strategies, preserve assumptions and evidence, and hand the chosen direction back to the source design tools.</p></div><aside className={`cc-decision cc-${gate.state}`}><span>DECISION STATE</span><strong>{gate.label}</strong><small>{gate.missingEvidence.length} evidence gates · {gate.unresolvedFindings.length} unresolved findings · {gate.openRisks.length} open risks</small></aside></header>
    <section className="cc-project-bar"><div><span>{project.id}</span><input aria-label="Project name" value={project.name} onChange={event => update(next => { next.name = event.target.value; })}/><input aria-label="Site address" value={project.address} onChange={event => update(next => { next.address = event.target.value; })} placeholder="Site address / parcel reference"/><small>r{project.revision} · {dateLabel(project.updatedAt)} · {fingerprint}</small></div><div><button className="secondary-button" type="button" onClick={() => importInput.current?.click()}>Import intake</button><button className="secondary-button" type="button" disabled={cloudBusy} onClick={newCase}>New case</button><button className="secondary-button" type="button" disabled={cloudBusy} onClick={browseCloudCases}>Browse cloud</button><button className="secondary-button" type="button" disabled={cloudBusy} onClick={() => loadCloudCase()}>Load current</button><button className="secondary-button" type="button" disabled={cloudBusy} onClick={saveCloudCase}>Save cloud</button><button className="secondary-button" type="button" onClick={exportCase}>Export package</button></div><input ref={importInput} type="file" accept="application/json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) importPackage(file); event.currentTarget.value = ""; }}/></section>
    {cloudCases.length ? <section className="cc-notice" aria-label="Cloud cases"><label>Saved cloud cases <select aria-label="Saved cloud case" value={cloudCaseId} onChange={event => setCloudCaseId(event.target.value)}>{cloudCases.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id} · r{item.revision}</option>)}</select></label> <button className="secondary-button" type="button" disabled={cloudBusy || !cloudCaseId} onClick={() => loadCloudCase(cloudCaseId)}>Load selected case</button></section> : null}
    <nav className="cc-stages" aria-label="Case workflow">{stages.map((item, index) => <button key={item} type="button" className={stage === item ? "active" : ""} onClick={() => setStage(item)}><span>0{index + 1}</span>{item}{item === "Validate" ? <b>{gate.missingEvidence.length}</b> : null}</button>)}</nav>
    <p className="cc-notice" role="status"><strong>Evidence-aware:</strong> {message} <span>· {cloudState}</span></p>
    {stage === "Generate" ? <Generate project={project} update={update} generate={generate}/> : null}
    {stage === "Compare" ? <Compare project={project} saveAlternative={saveAlternative} setStage={setStage}/> : null}
    {stage === "Refine" ? <Refine project={project} update={update}/> : null}
    {stage === "Validate" ? <Validate project={project} update={update}/> : null}
    {stage === "Drawings" ? <Drawings project={project}/> : null}
    {stage === "Report" ? <Report project={project} exportCase={exportCase} exportReport={exportReport}/> : null}
    <section className="cc-boundary"><strong>Coordination layer only.</strong><span>LotScope owns the product. PondyFlats and BStreet remain projects. Source geometry, structural review, circulation proof and approvals stay with their authoritative tools and reviewers.</span></section>
  </main>;
}

function Generate({ project, update, generate }: { project: CaseProject; update: (mutator: (next: CaseProject) => void, note?: string) => void; generate: () => void }) {
  const lotNumber = (key: keyof CaseProject["lot"], label: string) => <label>{label}<input type="number" value={String(project.lot[key])} onChange={event => update(next => { (next.lot[key] as number | string) = Number(event.target.value); })}/></label>;
  return <div className="cc-grid"><div className="cc-stack"><section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">PROJECT MODEL</p><h2>Lot geometry</h2></div><span>Explicit inputs</span></div><div className="cc-field-grid">{lotNumber("width", "Lot width · ft")}{lotNumber("depth", "Lot depth · ft")}{lotNumber("setbackFront", "Front setback")}{lotNumber("setbackRear", "Rear setback")}{lotNumber("setbackLeft", "Left setback")}{lotNumber("setbackRight", "Right setback")}</div></section>
    <section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">REUSABLE TEMPLATES</p><h2>Case strategy</h2></div><span>{CASE_STRATEGIES[project.strategy].label}</span></div><div className="cc-strategies">{Object.entries(CASE_STRATEGIES).map(([key, item]) => <button key={key} className={project.strategy === key ? "active" : ""} type="button" onClick={() => update(next => { next.strategy = key as CaseStrategy; next.acceptedAt = null; })}><strong>{item.label}</strong><small>{item.copy}</small></button>)}</div><button className="primary-button full" type="button" onClick={generate}>Generate X, Y and Best fit →</button></section></div>
    <section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">INCLUDE / SKIP</p><h2>Program rooms</h2></div><span>{project.program.rooms.filter(room => room.include).length} included</span></div><div className="cc-room-list">{project.program.rooms.map(room => <label key={room.id}><input type="checkbox" checked={room.include} onChange={event => update(next => { const target = next.program.rooms.find(item => item.id === room.id); if (target) target.include = event.target.checked; next.acceptedAt = null; })}/><span>{room.label}</span><input aria-label={`${room.label} area`} type="number" value={room.area} onChange={event => update(next => { const target = next.program.rooms.find(item => item.id === room.id); if (target) target.area = Number(event.target.value); })}/><small>{room.include ? "Include" : "Skip"}</small></label>)}</div><label className="cc-textarea">Next bounded check<textarea value={project.nextBoundedCheck} onChange={event => update(next => { next.nextBoundedCheck = event.target.value; })}/></label></section></div>;
}

function Compare({ project, saveAlternative, setStage }: { project: CaseProject; saveAlternative: (alternative: CaseAlternative) => void; setStage: (stage: Stage) => void }) {
  if (!project.alternatives.length) return <Empty title="No alternatives yet" copy="Generate from the project model. Comparison never replaces the saved layout." action="Open Generate" onClick={() => setStage("Generate")}/>;
  return <><div className="cc-alternatives">{project.alternatives.map(alternative => <article className={`cc-alt ${project.savedLayout?.id === alternative.id ? "saved" : ""}`} key={alternative.id}><CaseDiagram alternative={alternative}/><div><span>{CASE_STRATEGIES[alternative.strategy].label} · {alternative.axis}</span><h2>{alternative.name}</h2><div className="cc-metrics"><b><small>Fit</small>{alternative.fit}</b><b><small>Movement</small>{alternative.circulation}</b><b><small>Risk</small>{alternative.riskScore}</b></div><ul>{alternative.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><button className="primary-button full" type="button" onClick={() => saveAlternative(alternative)}>{project.savedLayout?.id === alternative.id ? "Working layout saved" : "Save as working layout"}</button></div></article>)}</div>{project.savedLayout && project.baselineLayout ? <section className="wb-panel cc-before-after"><div><span>BEFORE</span><strong>{project.baselineLayout.name}</strong><small>Score {project.baselineLayout.score} · {project.baselineLayout.coverage}% coverage</small></div><b>→</b><div><span>AFTER</span><strong>{project.savedLayout.name}</strong><small>Score {project.savedLayout.score} · {project.savedLayout.coverage}% coverage</small></div></section> : null}</>;
}

function Refine({ project, update }: { project: CaseProject; update: (mutator: (next: CaseProject) => void, note?: string) => void }) {
  return <div className="cc-grid"><section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">SAVED DIRECTION</p><h2>Placement & circulation</h2></div><span>{project.savedLayout?.name ?? "No saved layout"}</span></div>{project.savedLayout ? <CaseDiagram alternative={project.savedLayout} large/> : <p className="cc-muted">Save an alternative before refining placement.</p>}<label className="cc-textarea">Circulation notes<textarea value={project.circulationNotes} onChange={event => update(next => { next.circulationNotes = event.target.value; next.acceptedAt = null; })}/></label></section><div className="cc-stack"><FindingList title="Constraints" items={project.constraints} update={(id, status) => update(next => { const item = next.constraints.find(entry => entry.id === id); if (item) item.status = status; next.acceptedAt = null; })}/><FindingList title="Assumptions" items={project.assumptions} update={(id, status) => update(next => { const item = next.assumptions.find(entry => entry.id === id); if (item) item.status = status; next.acceptedAt = null; })}/></div></div>;
}

function FindingList({ title, items, update }: { title: string; items: { id: string; text: string; status: FindingStatus }[]; update: (id: string, status: FindingStatus) => void }) { return <section className="wb-panel"><p className="eyebrow">VISIBLE FINDINGS</p><h2>{title}</h2><div className="cc-findings">{items.map(item => <div key={item.id}><p>{item.text}</p><select aria-label={`${item.text} status`} value={item.status} onChange={event => update(item.id, event.target.value as FindingStatus)}><option>unknown</option><option>tentative</option><option>verified</option><option>rejected</option></select></div>)}</div></section>; }

function Validate({ project, update }: { project: CaseProject; update: (mutator: (next: CaseProject) => void, note?: string) => void }) {
  const gate = caseGate(project); const verified = project.evidence.filter(item => item.status === "verified").length;
  return <div className="cc-grid"><section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">FAIL-CLOSED REGISTER</p><h2>Evidence</h2></div><span>{verified}/{project.evidence.length} verified</span></div><div className="cc-evidence">{project.evidence.map(item => <article key={item.id}><div><strong>{item.label}</strong><span className={`cc-status cc-${item.status}`}>{item.status}</span></div><select aria-label={`${item.label} evidence status`} value={item.status} onChange={event => update(next => { const target = next.evidence.find(entry => entry.id === item.id); if (target) { target.status = event.target.value as FindingStatus; target.source = target.status === "unknown" ? "" : target.source; } next.acceptedAt = null; })}><option>unknown</option><option>tentative</option><option>verified</option><option>rejected</option></select><input aria-label={`${item.label} evidence source`} value={item.source} placeholder="Source, document ID or reviewer" onChange={event => update(next => { const target = next.evidence.find(entry => entry.id === item.id); if (target) target.source = event.target.value; })}/></article>)}</div></section><div className="cc-stack"><section className={`cc-gate cc-${gate.state}`}><p className="eyebrow">ACCEPTANCE GATE</p><h2>{gate.label}</h2><p>{gate.missingEvidence.length} required evidence records remain unverified. {gate.unresolvedFindings.length} assumptions or constraints remain unresolved. {gate.openRisks.length} risks remain open. {!project.savedLayout ? "No working layout saved." : ""}</p><div><span style={{width:`${verified / project.evidence.length * 100}%`}}/></div><button type="button" disabled title="Server-side authorized sign-off is not yet implemented">Acceptance unavailable · authorized review required</button></section><section className="wb-panel"><p className="eyebrow">BOUNDED CHECKS</p><h2>Missing information & risk</h2><div className="cc-risks">{project.risks.map(risk => <article key={risk.id}><div><strong>{risk.text}</strong><small>{risk.nextCheck}</small></div><select aria-label={`${risk.text} status`} value={risk.status} onChange={event => update(next => { const target = next.risks.find(entry => entry.id === risk.id); if (target) target.status = event.target.value as "open" | "closed"; next.acceptedAt = null; })}><option>open</option><option>closed</option></select></article>)}</div></section></div></div>;
}

function Drawings({ project }: { project: CaseProject }) { return project.savedLayout ? <section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">COORDINATION DRAWING</p><h2>{project.name}</h2></div><span>{project.savedLayout.fingerprint}</span></div><div className="cc-drawing"><CaseDiagram alternative={project.savedLayout} large/><strong>CONDITIONAL COORDINATION STUDY · NOT FOR CONSTRUCTION</strong></div></section> : <Empty title="No drawing source" copy="Save an alternative in Compare before producing a coordination drawing."/>; }

function Report({ project, exportCase, exportReport }: { project: CaseProject; exportCase: () => void; exportReport: () => void }) { const gate = caseGate(project); return <div className="cc-grid"><section className="wb-panel"><p className="eyebrow">AI-ASSISTED DRAFT · NOT EVIDENCE</p><h2>Tradeoff summary</h2><p className="cc-draft">{tradeoffSummary(project)}</p><h2>Package language</h2><p className="cc-draft">Horizon prepared this coordination package to compare residential site-design directions for {project.name}. It records supplied geometry, program, assumptions, risks and evidence. It does not replace the source design tools or constitute structural, code, access, circulation, permitting, construction or design approval.</p></section><section className="wb-panel"><div className="cc-section-head"><div><p className="eyebrow">PORTABLE CASE</p><h2>Export package</h2></div><span className={`cc-status cc-${gate.state}`}>{gate.label}</span></div><dl className="cc-package"><div><dt>Revision</dt><dd>r{project.revision}</dd></div><div><dt>Saved layout</dt><dd>{project.savedLayout?.name ?? "None"}</dd></div><div><dt>Open evidence</dt><dd>{gate.missingEvidence.length}</dd></div><div><dt>Open risks</dt><dd>{gate.openRisks.length}</dd></div></dl><button className="primary-button full" type="button" onClick={exportCase}>Export case JSON</button><button className="secondary-button full" type="button" onClick={exportReport}>Export conditional report</button></section></div>; }

function CaseDiagram({ alternative, large = false }: { alternative: CaseAlternative; large?: boolean }) { const width = Math.min(64, Math.max(28, alternative.footprint.width)); const depth = Math.min(76, Math.max(30, alternative.footprint.depth)); return <div className={`cc-diagram ${large ? "large" : ""}`}><div className="cc-lot"><div className={`cc-foot cc-axis-${alternative.axis.toLowerCase()}`} style={{width:`${width}%`,height:`${depth}%`}}><span>{alternative.axis}</span></div></div><small>{alternative.coverage}% modeled coverage</small></div>; }
function Empty({ title, copy, action, onClick }: { title: string; copy: string; action?: string; onClick?: () => void }) { return <section className="wb-panel cc-empty"><h2>{title}</h2><p>{copy}</p>{action ? <button className="primary-button" type="button" onClick={onClick}>{action}</button> : null}</section>; }
