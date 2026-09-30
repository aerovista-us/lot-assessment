"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { DirectManipulationPlan, type DirectManipulation } from "@/components/workbench/DirectManipulationPlan";
import type { CandidateComponent, CandidateRecord } from "@/packages/candidates";
import {
  applyCandidateEvaluation,
  currentRepairClasses,
  editOpeningComponent,
  editPathPoint,
  editPavementVertex,
  editPlacementComponent,
  editPlacementVertex,
  editPlacementWallLength,
  mirrorPlacementComponent,
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

  function commitDirectManipulation(change: DirectManipulation) {
    if (running !== null) return;
    try {
      let next = candidate;
      let label = "direct manipulation";
      const component = candidate.components.find((item) => item.id === change.componentId);
      if (!component) throw new Error("Selected component no longer exists.");
      if (change.kind === "move-placement") {
        next = editPlacementComponent(candidate, change.componentId, { x: change.x, y: change.y });
        label = `moving ${component.label}`;
      } else if (change.kind === "rotate-placement") {
        next = editPlacementComponent(candidate, change.componentId, { rotationDeg: change.rotationDeg });
        label = `rotating ${component.label}`;
      } else if (change.kind === "move-path-point") {
        next = editPathPoint(candidate, change.componentId, change.pointIndex, change.point);
        label = `reshaping ${component.label}`;
      } else if (change.kind === "move-pavement-vertex") {
        next = editPavementVertex(candidate, change.componentId, change.vertexIndex, change.point);
        label = `reshaping ${component.label}`;
      } else if (change.kind === "move-opening") {
        next = editOpeningComponent(candidate, change.componentId, { offsetFt: change.offsetFt });
        label = `moving ${component.label}`;
      }
      if (JSON.stringify(next.components) === JSON.stringify(candidate.components)) return;
      onCheckpoint(`Before ${label}`);
      onSave(next);
      setSelectedId(change.componentId);
      setSuggestions([]);
      setMessage(`${component.label} updated by drag/drop. Prior machine evidence is now stale until this exact geometry is evaluated.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to apply direct manipulation.");
    }
  }
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
  function mirrorSelected(axis: "horizontal" | "vertical") {
    if (!selected || (selected.kind !== "home" && selected.kind !== "garage")) return;
    try {
      onCheckpoint(`Before mirroring ${selected.label}`);
      onSave(mirrorPlacementComponent(candidate, selected.id, axis));
      setSuggestions([]);
      setMessage(`${selected.label} mirrored ${axis}. Prior machine evidence is stale until this exact geometry is evaluated.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to mirror building.");
    }
  }

  function changeWallLength(wallIndex: number, delta: number) {
    if (!selected || (selected.kind !== "home" && selected.kind !== "garage")) return;
    try {
      onCheckpoint(`Before reshaping ${selected.label}`);
      onSave(editPlacementWallLength(candidate, selected.id, wallIndex, delta));
      setSuggestions([]);
      setMessage(`${selected.label} wall ${wallIndex + 1} adjusted by ${delta > 0 ? "+" : ""}${delta} ft. Prior machine evidence is stale.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to adjust wall.");
    }
  }

  function moveBuildingVertex(vertexIndex: number, axis: "x" | "y", value: string) {
    if (!selected || (selected.kind !== "home" && selected.kind !== "garage")) return;
    const polygon = selected.polygon ?? [
      [selected.x, selected.y], [selected.x + selected.widthFt, selected.y],
      [selected.x + selected.widthFt, selected.y + selected.depthFt], [selected.x, selected.y + selected.depthFt]
    ] as const;
    const point = polygon[vertexIndex];
    if (!point) return;
    const next: readonly [number, number] = axis === "x" ? [numberValue(value, point[0]), point[1]] : [point[0], numberValue(value, point[1])];
    try {
      onCheckpoint(`Before reshaping ${selected.label}`);
      onSave(editPlacementVertex(candidate, selected.id, vertexIndex, next));
      setSuggestions([]);
      setMessage(`${selected.label} shape vertex updated. Prior machine evidence is stale.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to edit building vertex.");
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
      <div><p className="eyebrow">INTERVENTION EDITOR V3</p><h2>Drag the plan directly, then make the machine re-check it.</h2></div>
      <span className="mode-pill">{candidate.evidenceState} EVIDENCE</span>
    </div>
    <div className="candidate-warning-box intervention-truth-boundary"><b>Screening boundary</b><p>This editor can test static geometry, enclosed parking and route-hint sweeps. It cannot close the authoritative independent stall-to-Pennsylvania outbound gate. A screen result is never a manual PASS.</p></div>
    {repairClasses.length > 0 && <div className="candidate-chip-row intervention-repairs">{repairClasses.map((repair) => <span key={repair}>{repair}</span>)}</div>}
    <div className="intervention-grid">
      <div className="intervention-plan-wrap">
        <DirectManipulationPlan candidate={candidate} selectedComponentId={selectedId} disabled={running !== null}
          onSelectComponent={(id) => {
            const component = candidate.components.find((item) => item.id === id);
            if (component && isInterventionEditable(component)) setSelectedId(id);
            else setMessage(component?.locked ? `${component.label} is protected.` : "That component is not editable in Intervention Editor.");
          }} onCommit={commitDirectManipulation} />
        <div className="direct-manipulation-help">
          <span><b>Move</b> drag a home or garage</span><span><b>Rotate</b> drag the round handle above any selected building</span>
          <span><b>Driveway</b> drag the round route points</span><span><b>Pavement</b> select it, then drag a corner</span>
        </div>
        <p className="microcopy">Drag/drop saves the geometry immediately with a recovery checkpoint. Parcel and derived envelope geometry stay protected.</p>
      </div>
      <div className="intervention-controls">
        <label className="intervention-select-label">Edit component<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{editable.map((component) => <option key={component.id} value={component.id}>{component.kind} · {component.label}</option>)}</select></label>
        <details className="intervention-precision">
          <summary>Precision controls <span>optional</span></summary>
          <div className="intervention-precision-body">
        {selectedEditable && (selectedEditable.kind === "home" || selectedEditable.kind === "garage") && <>
          <div className="intervention-field-grid">
            <Field label="X" value={draft.x ?? ""} onChange={(value) => setField("x", value)} />
            <Field label="Y" value={draft.y ?? ""} onChange={(value) => setField("y", value)} />
            <Field label="Width ft" value={draft.widthFt ?? ""} disabled={!selectedEditable.resizable} onChange={(value) => setField("widthFt", value)} />
            <Field label="Depth ft" value={draft.depthFt ?? ""} disabled={!selectedEditable.resizable} onChange={(value) => setField("depthFt", value)} />
            <Field label="Rotation deg" value={draft.rotationDeg ?? "0"} step={1} onChange={(value) => setField("rotationDeg", value)} />
          </div>
          <div className="shape-editor-tools">
            <b>Shape tools</b>
            {selectedEditable.kind === "home" && <div className="shape-editor-actions">
              <button type="button" className="secondary-button" onClick={() => mirrorSelected("horizontal")}>Mirror left ↔ right</button>
              <button type="button" className="secondary-button" onClick={() => mirrorSelected("vertical")}>Mirror top ↔ bottom</button>
            </div>}
            {selectedEditable.resizable && <div className="shape-wall-list">
              {(selectedEditable.polygon ?? [
                [selectedEditable.x, selectedEditable.y],
                [selectedEditable.x + selectedEditable.widthFt, selectedEditable.y],
                [selectedEditable.x + selectedEditable.widthFt, selectedEditable.y + selectedEditable.depthFt],
                [selectedEditable.x, selectedEditable.y + selectedEditable.depthFt]
              ]).map((point, index, polygon) => {
                const next = polygon[(index + 1) % polygon.length];
                const length = Math.hypot(next[0] - point[0], next[1] - point[1]);
                return <div className="shape-wall-row" key={index}>
                  <span>Wall {index + 1} · {length.toFixed(1)} ft</span>
                  <button type="button" onClick={() => changeWallLength(index, -1)} aria-label={`Shorten wall ${index + 1} by one foot`}>−1′</button>
                  <button type="button" onClick={() => changeWallLength(index, 1)} aria-label={`Lengthen wall ${index + 1} by one foot`}>+1′</button>
                </div>;
              })}
            </div>}
            {selectedEditable.resizable && <details className="shape-vertex-editor"><summary>Advanced vertex editing</summary>
              {(selectedEditable.polygon ?? [
                [selectedEditable.x, selectedEditable.y],
                [selectedEditable.x + selectedEditable.widthFt, selectedEditable.y],
                [selectedEditable.x + selectedEditable.widthFt, selectedEditable.y + selectedEditable.depthFt],
                [selectedEditable.x, selectedEditable.y + selectedEditable.depthFt]
              ]).map((point, index) => <div className="shape-vertex-row" key={index}><b>Corner {index + 1}</b>
                <Field label="X" value={String(point[0])} onChange={(value) => moveBuildingVertex(index, "x", value)} />
                <Field label="Y" value={String(point[1])} onChange={(value) => moveBuildingVertex(index, "y", value)} />
              </div>)}
            </details>}
          </div>
        </>}

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
          </div>
        </details>

        <div className="intervention-actions">
          <button className="secondary-button" type="button" disabled={!selectedEditable || running !== null} onClick={applyGeometry}>Save edit</button>
          <button className="primary-button" type="button" disabled={running !== null || draftDirty} title={draftDirty ? "Save the geometry edit first." : undefined} onClick={evaluateExact}>{running === "evaluate" ? "Evaluating…" : "Evaluate exact edit"}</button>
          <button className="secondary-button" type="button" disabled={!selectedEditable || running !== null || draftDirty} title={draftDirty ? "Save the geometry edit first." : undefined} onClick={exploreAround}>{running === "explore" ? "Exploring…" : "Explore around edit"}</button>
        </div>
        <p className="microcopy">Drag/drop changes save immediately with a recovery checkpoint. Use Precision controls only when you want exact dimensions or coordinates; then click Save edit before evaluating.</p>
        {message && <p className="intervention-message">{message}</p>}
      </div>
    </div>

    {suggestions.length > 0 && <div className="intervention-suggestions">
      <div className="section-heading"><div><p className="eyebrow">BOUNDED ALTERNATIVES</p><h3>Machine-screened neighbors around the selected edit</h3></div><span className="mode-pill">{suggestions.length} OPTIONS</span></div>
      <div className="intervention-suggestion-grid">{suggestions.map((suggestion) => <article key={suggestion.id} className="intervention-suggestion-card"><CandidatePlan candidate={suggestion.candidate} /><div><b>{suggestion.label}</b><span>Screening score {suggestion.screeningScore}</span><p>{suggestion.summary}</p><button className="secondary-button" type="button" onClick={() => applySuggestion(suggestion)}>Apply this option</button></div></article>)}</div>
    </div>}
  </section>;
}
