"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import type { CandidateComponent, CandidateRecord } from "@/packages/candidates";
import {
  applyCandidateEvaluation,
  currentRepairClasses,
  editOpeningComponent,
  editPathPoint,
  editPavementVertex,
  editPlacementComponent,
  isInterventionEditable,
  suggestedEditableComponent
} from "@/packages/candidates/intervention";
import type { InterventionSuggestion } from "@/packages/candidates/intervention-evaluation";

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldKey(prefix: string, index: number, axis: "x" | "y") {
  return `${prefix}-${index}-${axis}`;
}
function initialDraft(component: CandidateComponent | null) {
  const draft: Record<string, string> = {};
  if (!component) return draft;
  if (component.kind === "home" || component.kind === "garage") {
    draft.x = String(component.x); draft.y = String(component.y);
    draft.widthFt = String(component.widthFt); draft.depthFt = String(component.depthFt);
    draft.rotationDeg = String(component.rotationDeg ?? 0);
  }
  if (component.kind === "opening") {
    draft.openingWidthFt = String(component.openingWidthFt);
    draft.offsetFt = String(component.offsetFt);
  }
  if (component.kind === "driveway" || component.kind === "route") {
    component.points.forEach(([x, y], index) => {
      draft[fieldKey("point", index, "x")] = String(x);
      draft[fieldKey("point", index, "y")] = String(y);
    });
  }
  if (component.kind === "pavement") {
    component.polygon.forEach(([x, y], index) => {
      draft[fieldKey("vertex", index, "x")] = String(x);
      draft[fieldKey("vertex", index, "y")] = String(y);
    });
  }
  return draft;
}

function Field({ label, value, onChange, step = .5, disabled = false }: { label: string; value: string; onChange: (value: string) => void; step?: number; disabled?: boolean }) {
  return <label className="intervention-field"><span>{label}</span><input type="number" step={step} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
}
export function InterventionEditor({ candidate, repairContextCandidate, onSave, onCheckpoint }: {
  candidate: CandidateRecord;
  repairContextCandidate?: CandidateRecord | null;
  onSave: (candidate: CandidateRecord) => void;
  onCheckpoint: (label?: string) => void;
}) {
  const repairContext = repairContextCandidate ?? candidate;
  const editable = useMemo(() => candidate.components.filter(isInterventionEditable), [candidate.components]);
  const suggestedContext = useMemo(() => suggestedEditableComponent(repairContext), [repairContext]);
  const suggested = useMemo(() => suggestedContext ? candidate.components.find((component) => component.id === suggestedContext.id && isInterventionEditable(component)) ?? null : null, [candidate.components, suggestedContext]);
  const [selectedId, setSelectedId] = useState<string>(() => suggested?.id ?? editable[0]?.id ?? "");
  const selected = candidate.components.find((component) => component.id === selectedId) ?? null;
  const [draft, setDraft] = useState<Record<string, string>>(() => initialDraft(selected));
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState<"evaluate" | "explore" | null>(null);
  const [suggestions, setSuggestions] = useState<InterventionSuggestion[]>([]);
  const repairClasses = currentRepairClasses(repairContext);
  const draftDirty = selected ? JSON.stringify(draft) !== JSON.stringify(initialDraft(selected)) : false;

  useEffect(() => {
    if (!selectedId || !candidate.components.some((component) => component.id === selectedId && isInterventionEditable(component))) {
      setSelectedId(suggested?.id ?? editable[0]?.id ?? "");
    }
  }, [candidate.components, editable, selectedId, suggested]);

  useEffect(() => {
    setDraft(initialDraft(selected));
    setSuggestions([]);
  }, [selectedId, candidate.updatedAt]);

  const setField = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  function applyGeometry() {
    if (!selected || !isInterventionEditable(selected)) return;
    try {
      let next = candidate;
      if (selected.kind === "home" || selected.kind === "garage") {
        next = editPlacementComponent(candidate, selected.id, {
          x: numberValue(draft.x, selected.x),
          y: numberValue(draft.y, selected.y),
          widthFt: numberValue(draft.widthFt, selected.widthFt),
          depthFt: numberValue(draft.depthFt, selected.depthFt),
          rotationDeg: numberValue(draft.rotationDeg, selected.rotationDeg ?? 0)
        });
      } else if (selected.kind === "opening") {
        next = editOpeningComponent(candidate, selected.id, {
          openingWidthFt: numberValue(draft.openingWidthFt, selected.openingWidthFt),
          offsetFt: numberValue(draft.offsetFt, selected.offsetFt)
        });
      } else if (selected.kind === "driveway" || selected.kind === "route") {
        for (let i = 0; i < selected.points.length; i += 1) {
          if (selected.movableControlPoints?.length && !selected.movableControlPoints.includes(i)) continue;
          const point = next.components.find((component) => component.id === selected.id);
          if (!point || (point.kind !== "driveway" && point.kind !== "route")) continue;
          next = editPathPoint(next, selected.id, i, [
            numberValue(draft[fieldKey("point", i, "x")], point.points[i][0]),
            numberValue(draft[fieldKey("point", i, "y")], point.points[i][1])
          ]);
        }
      } else if (selected.kind === "pavement") {
        for (let i = 0; i < selected.polygon.length; i += 1) {
          const polygon = next.components.find((component) => component.id === selected.id);
          if (!polygon || polygon.kind !== "pavement") continue;
          next = editPavementVertex(next, selected.id, i, [
            numberValue(draft[fieldKey("vertex", i, "x")], polygon.polygon[i][0]),
            numberValue(draft[fieldKey("vertex", i, "y")], polygon.polygon[i][1])
          ]);
        }
      }
      if (JSON.stringify(next.components) === JSON.stringify(candidate.components)) {
        setMessage("No geometry change detected.");
        return;
      }
      onCheckpoint(`Before editing ${selected.label}`);
      onSave(next);
      setMessage("Geometry saved to this intervention branch. Prior machine evidence is now stale until you evaluate this exact edit.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to apply geometry edit.");
    }
  }
  async function evaluateExact() {
    setRunning("evaluate"); setMessage(null);
    try {
      const response = await fetch("/api/workbench/pondy-intervention", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "evaluate", candidate })
      });
      const payload = await response.json() as { error?: string; evaluation?: import("@/packages/candidates").CandidateEvaluation; screeningScore?: number; hardLocalFailures?: number };
      if (!response.ok || !payload.evaluation) throw new Error(payload.error ?? `Evaluation failed (${response.status})`);
      const evaluated = applyCandidateEvaluation(candidate, payload.evaluation);
      onSave(evaluated);
      setMessage(`Exact intervention screening complete: ${payload.hardLocalFailures ?? 0} local hard blocker(s), score ${payload.screeningScore ?? "—"}. Independent outbound proof is still open.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Evaluation failed.");
    } finally {
      setRunning(null);
    }
  }

  async function exploreAround() {
    if (!selected) return;
    setRunning("explore"); setMessage(null);
    try {
      const response = await fetch("/api/workbench/pondy-intervention", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "explore", candidate, componentId: selected.id })
      });
      const payload = await response.json() as { error?: string; suggestions?: InterventionSuggestion[] };
      if (!response.ok) throw new Error(payload.error ?? `Exploration failed (${response.status})`);
      setSuggestions(payload.suggestions ?? []);
      setMessage(`${payload.suggestions?.length ?? 0} bounded alternatives generated around ${selected.label}. These are screening suggestions, not PASS results.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Explore-around-edit failed.");
    } finally {
      setRunning(null);
    }
  }
  function applySuggestion(suggestion: InterventionSuggestion) {
    try {
      onCheckpoint(`Before applying ${suggestion.label}`);
      onSave(suggestion.candidate);
      setSuggestions([]);
      setMessage(`${suggestion.label} applied. Its current evidence is screening-only; authoritative outbound remains open.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to apply exploration suggestion.");
    }
  }

  const selectedEditable = selected && isInterventionEditable(selected) ? selected : null;
  return <section className="wb-panel intervention-editor-panel">
    <div className="section-heading intervention-editor-head">
      <div><p className="eyebrow">INTERVENTION EDITOR V1</p><h2>Change a bounded component, then make the machine re-check it.</h2></div>
      <span className="mode-pill">{candidate.evidenceState} EVIDENCE</span>
    </div>
    <div className="candidate-warning-box intervention-truth-boundary"><b>Screening boundary</b><p>This editor can test static geometry, enclosed parking and route-hint sweeps. It cannot close the authoritative independent stall-to-Pennsylvania outbound gate. A screen result is never a manual PASS.</p></div>
    {repairClasses.length > 0 && <div className="candidate-chip-row intervention-repairs">{repairClasses.map((repair) => <span key={repair}>{repair}</span>)}</div>}
    <div className="intervention-grid">
      <div className="intervention-plan-wrap">
        <CandidatePlan candidate={candidate} selectedComponentId={selectedId} onSelectComponent={(id) => {
          const component = candidate.components.find((item) => item.id === id);
          if (component && isInterventionEditable(component)) setSelectedId(id);
          else setMessage(component?.locked ? `${component.label} is protected.` : "That component is not editable in Intervention Editor v1.");
        }} />
        <p className="microcopy">Click an editable component in the plan or choose it from the selector. Parcel and derived envelope geometry stay protected.</p>
      </div>
      <div className="intervention-controls">
        <label className="intervention-select-label">Edit component<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{editable.map((component) => <option key={component.id} value={component.id}>{component.kind} · {component.label}</option>)}</select></label>
        {selectedEditable && (selectedEditable.kind === "home" || selectedEditable.kind === "garage") && <div className="intervention-field-grid">
          <Field label="X" value={draft.x ?? ""} onChange={(value) => setField("x", value)} />
          <Field label="Y" value={draft.y ?? ""} onChange={(value) => setField("y", value)} />
          <Field label="Width ft" value={draft.widthFt ?? ""} disabled={!selectedEditable.resizable} onChange={(value) => setField("widthFt", value)} />
          <Field label="Depth ft" value={draft.depthFt ?? ""} disabled={!selectedEditable.resizable} onChange={(value) => setField("depthFt", value)} />
          <Field label="Rotation deg" value={draft.rotationDeg ?? "0"} step={1} disabled={selectedEditable.kind !== "garage"} onChange={(value) => setField("rotationDeg", value)} />
        </div>}

        {selectedEditable?.kind === "opening" && <div className="intervention-field-grid">
          <Field label="Opening width ft" value={draft.openingWidthFt ?? ""} onChange={(value) => setField("openingWidthFt", value)} />
          <Field label="Offset ft" value={draft.offsetFt ?? ""} onChange={(value) => setField("offsetFt", value)} />
        </div>}

        {selectedEditable && (selectedEditable.kind === "driveway" || selectedEditable.kind === "route") && <div className="intervention-point-list">
          {selectedEditable.points.map((point, index) => {
            const locked = Boolean(selectedEditable.movableControlPoints?.length && !selectedEditable.movableControlPoints.includes(index));
            return <div key={index}><b>Point {index + 1}{locked ? " · locked" : ""}</b><div className="intervention-field-grid"><Field label="X" value={draft[fieldKey("point", index, "x")] ?? String(point[0])} disabled={locked} onChange={(value) => setField(fieldKey("point", index, "x"), value)} /><Field label="Y" value={draft[fieldKey("point", index, "y")] ?? String(point[1])} disabled={locked} onChange={(value) => setField(fieldKey("point", index, "y"), value)} /></div></div>;
          })}
        </div>}
        {selectedEditable?.kind === "pavement" && <div className="intervention-point-list">
          {selectedEditable.polygon.map((point, index) => <div key={index}><b>Vertex {index + 1}</b><div className="intervention-field-grid"><Field label="X" value={draft[fieldKey("vertex", index, "x")] ?? String(point[0])} onChange={(value) => setField(fieldKey("vertex", index, "x"), value)} /><Field label="Y" value={draft[fieldKey("vertex", index, "y")] ?? String(point[1])} onChange={(value) => setField(fieldKey("vertex", index, "y"), value)} /></div></div>)}
        </div>}

        <div className="intervention-actions">
          <button className="secondary-button" type="button" disabled={!selectedEditable} onClick={applyGeometry}>Save edit</button>
          <button className="primary-button" type="button" disabled={running !== null || draftDirty} title={draftDirty ? "Save the geometry edit first." : undefined} onClick={evaluateExact}>{running === "evaluate" ? "Evaluating…" : "Evaluate exact edit"}</button>
          <button className="secondary-button" type="button" disabled={!selectedEditable || running !== null || draftDirty} title={draftDirty ? "Save the geometry edit first." : undefined} onClick={exploreAround}>{running === "explore" ? "Exploring…" : "Explore around edit"}</button>
        </div>
        <p className="microcopy">Save edit creates a recovery checkpoint and makes old evidence STALE. Evaluate exact edit and Explore around edit are enabled only after the current fields are saved.</p>
        {message && <p className="intervention-message">{message}</p>}
      </div>
    </div>

    {suggestions.length > 0 && <div className="intervention-suggestions">
      <div className="section-heading"><div><p className="eyebrow">BOUNDED ALTERNATIVES</p><h3>Machine-screened neighbors around the selected edit</h3></div><span className="mode-pill">{suggestions.length} OPTIONS</span></div>
      <div className="intervention-suggestion-grid">{suggestions.map((suggestion) => <article key={suggestion.id} className="intervention-suggestion-card"><CandidatePlan candidate={suggestion.candidate} /><div><b>{suggestion.label}</b><span>Screening score {suggestion.screeningScore}</span><p>{suggestion.summary}</p><button className="secondary-button" type="button" onClick={() => applySuggestion(suggestion)}>Apply this option</button></div></article>)}</div>
    </div>}
  </section>;
}
