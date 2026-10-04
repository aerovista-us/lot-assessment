"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CandidatePlan } from "@/components/workbench/CandidatePlan";
import { DirectManipulationPlan, type DirectManipulation } from "@/components/workbench/DirectManipulationPlan";
import type { CandidateComponent, CandidateRecord, PlacementComponent, RoofComponent, RoofVerticalAuthority } from "@/packages/candidates";
import {
  addRoofZone,
  applyCandidateEvaluation,
  createRoofComponent,
  currentRepairClasses,
  editOpeningComponent,
  editPathPoint,
  editPavementVertex,
  editPlacementComponent,
  editPlacementVertex,
  editPlacementWallLength,
  editRoofZone,
  lockRoofComponent,
  mirrorPlacementComponent,
  insertPlacementVertex,
  removePlacementVertex,
  removeRoofZone,
  unlockRoofComponent,
  isInterventionEditable,
  suggestedEditableComponent
} from "@/packages/candidates/intervention";
import type { InterventionSuggestion } from "@/packages/candidates/intervention-evaluation";
import type { AuthoritativeCirculationResult, StallAuthoritativeCirculation } from "@/packages/circulation/authoritative-search";
import { interventionGeometryRevision } from "@/packages/canonical/intervention-geometry";
import { validateCandidateRoofs, validateRoofComponent } from "@/packages/roof-geometry";


type AuthoritativeProofState = {
  geometryRevision: string;
  status: "running" | "complete" | "cancelled" | "error";
  completed: number;
  total: number;
  currentStallLabel?: string;
  rows: StallAuthoritativeCirculation[];
  result?: AuthoritativeCirculationResult;
  error?: string;
};

type AuthoritativeWorkerMessage =
  | { type: "progress"; geometryRevision: string; stallId: string; stallLabel: string; index: number; total: number }
  | { type: "stall"; geometryRevision: string; stallId: string; stallLabel: string; index: number; total: number; row: StallAuthoritativeCirculation }
  | { type: "complete"; geometryRevision: string; result: AuthoritativeCirculationResult }
  | { type: "error"; geometryRevision: string; error: string };

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldKey(prefix: string, index: number, axis: "x" | "y") {
  return `${prefix}-${index}-${axis}`;
}
function roofFieldKey(index: number, field: string) {
  return `roof-${index}-${field}`;
}
function nullableNumberValue(value: string | undefined, fallback: number | null) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  if (component.kind === "roof") {
    const zones = Array.isArray((component as unknown as { zones?: unknown }).zones)
      ? component.zones.filter((zone) => Boolean(zone && typeof zone === "object"))
      : [];
    zones.forEach((zone, index) => {
      draft[roofFieldKey(index, "plateZFt")] = zone.plateZFt == null ? "" : String(zone.plateZFt);
      draft[roofFieldKey(index, "ridgeAx")] = zone.ridgeA ? String(zone.ridgeA[0]) : "";
      draft[roofFieldKey(index, "ridgeAy")] = zone.ridgeA ? String(zone.ridgeA[1]) : "";
      draft[roofFieldKey(index, "ridgeBx")] = zone.ridgeB ? String(zone.ridgeB[0]) : "";
      draft[roofFieldKey(index, "ridgeBy")] = zone.ridgeB ? String(zone.ridgeB[1]) : "";
      draft[roofFieldKey(index, "solveBy")] = zone.solveBy;
      draft[roofFieldKey(index, "pitchRise")] = zone.pitchRise == null ? "" : String(zone.pitchRise);
      draft[roofFieldKey(index, "pitchRun")] = zone.pitchRun == null ? "" : String(zone.pitchRun);
      draft[roofFieldKey(index, "ridgeZFt")] = zone.ridgeZFt == null ? "" : String(zone.ridgeZFt);
      draft[roofFieldKey(index, "ridgeZCheckFt")] = zone.ridgeZCheckFt == null ? "" : String(zone.ridgeZCheckFt);
      draft[roofFieldKey(index, "pitchCheckRise")] = zone.pitchCheckRise == null ? "" : String(zone.pitchCheckRise);
      draft[roofFieldKey(index, "pitchCheckRun")] = zone.pitchCheckRun == null ? "" : String(zone.pitchCheckRun);
      draft[roofFieldKey(index, "source")] = zone.source ?? "";
      if (Array.isArray(zone.footprint)) zone.footprint.slice(0, 4).forEach((point, pointIndex) => {
        if (!Array.isArray(point) || point.length < 2) return;
        draft[roofFieldKey(index, `footprint-${pointIndex}-x`)] = String(point[0]);
        draft[roofFieldKey(index, `footprint-${pointIndex}-y`)] = String(point[1]);
      });
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
  const [running, setRunning] = useState<"evaluate" | "explore" | "authoritative" | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [authoritativeProof, setAuthoritativeProof] = useState<AuthoritativeProofState | null>(null);
  const [suggestions, setSuggestions] = useState<InterventionSuggestion[]>([]);
  const repairClasses = currentRepairClasses(repairContext);
  const draftDirty = selected ? JSON.stringify(draft) !== JSON.stringify(initialDraft(selected)) : false;
  const geometryRevision = useMemo(() => interventionGeometryRevision(candidate), [candidate.components, candidate.id, candidate.revisionLabel]);
  const roofSummary = useMemo(() => validateCandidateRoofs(candidate.components), [candidate.components]);

  useEffect(() => {
    if (!selectedId || !candidate.components.some((component) => component.id === selectedId && isInterventionEditable(component))) {
      setSelectedId(suggested?.id ?? editable[0]?.id ?? "");
    }
  }, [candidate.components, editable, selectedId, suggested]);

  useEffect(() => {
    setDraft(initialDraft(selected));
    setSuggestions([]);
  }, [selectedId, candidate.updatedAt]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    if (running === "authoritative" && authoritativeProof?.geometryRevision !== geometryRevision) {
      workerRef.current?.terminate(); workerRef.current = null;
      setRunning(null);
      setAuthoritativeProof((current) => current ? { ...current, status: "cancelled" } : current);
      setMessage("Authoritative proof stopped because the candidate geometry changed.");
    }
  }, [geometryRevision, authoritativeProof?.geometryRevision, running]);

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
      } else if (change.kind === "move-building-vertex") {
        next = editPlacementVertex(candidate, change.componentId, change.vertexId, change.point);
        label = `reshaping ${component.label} corner ${change.vertexIndex + 1}`;
      } else if (change.kind === "resize-building-wall") {
        next = editPlacementWallLength(candidate, change.componentId, change.wallId, change.lengthDeltaFt);
        label = `resizing ${component.label} wall ${change.wallIndex + 1}`;
      } else if (change.kind === "insert-building-vertex") {
        next = insertPlacementVertex(candidate, change.componentId, change.wallId, change.point);
        label = `adding a deflection point to ${component.label}`;
      } else if (change.kind === "remove-building-vertex") {
        next = removePlacementVertex(candidate, change.componentId, change.vertexId);
        label = `removing a deflection point from ${component.label}`;
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
      } else if (selected.kind === "roof") {
        const selectedZones = Array.isArray((selected as unknown as { zones?: unknown }).zones) ? selected.zones : [];
        for (let i = 0; i < selectedZones.length; i += 1) {
          const current = next.components.find((component): component is RoofComponent => component.id === selected.id && component.kind === "roof");
          if (!current || !Array.isArray((current as unknown as { zones?: unknown }).zones)) continue;
          const zone = current.zones[i];
          if (!zone) continue;
          const ax = nullableNumberValue(draft[roofFieldKey(i, "ridgeAx")], zone.ridgeA?.[0] ?? null);
          const ay = nullableNumberValue(draft[roofFieldKey(i, "ridgeAy")], zone.ridgeA?.[1] ?? null);
          const bx = nullableNumberValue(draft[roofFieldKey(i, "ridgeBx")], zone.ridgeB?.[0] ?? null);
          const by = nullableNumberValue(draft[roofFieldKey(i, "ridgeBy")], zone.ridgeB?.[1] ?? null);
          const footprintKeys = Array.from({ length: 4 }, (_, pointIndex) => [
            roofFieldKey(i, `footprint-${pointIndex}-x`), roofFieldKey(i, `footprint-${pointIndex}-y`)
          ] as const).flat();
          const footprintProvided = footprintKeys.filter((key) => (draft[key] ?? "").trim() !== "").length;
          if (footprintProvided !== 0 && footprintProvided !== 8) {
            throw new Error(`${zone.label}: enter all X/Y values for all four roof-zone corners, or leave the footprint blank to use the owner footprint.`);
          }
          const explicitFootprint = footprintProvided === 8
            ? Array.from({ length: 4 }, (_, pointIndex) => [
                numberValue(draft[roofFieldKey(i, `footprint-${pointIndex}-x`)], 0),
                numberValue(draft[roofFieldKey(i, `footprint-${pointIndex}-y`)], 0)
              ] as const)
            : null;
          next = editRoofZone(next, selected.id, zone.id, {
            footprint: explicitFootprint ? explicitFootprint.map(([x,y]) => [x,y]) : null,
            plateZFt: nullableNumberValue(draft[roofFieldKey(i, "plateZFt")], zone.plateZFt),
            ridgeA: ax == null || ay == null ? null : [ax, ay],
            ridgeB: bx == null || by == null ? null : [bx, by],
            solveBy: (draft[roofFieldKey(i, "solveBy")] ?? zone.solveBy) as RoofVerticalAuthority,
            pitchRise: nullableNumberValue(draft[roofFieldKey(i, "pitchRise")], zone.pitchRise),
            pitchRun: nullableNumberValue(draft[roofFieldKey(i, "pitchRun")], zone.pitchRun),
            ridgeZFt: nullableNumberValue(draft[roofFieldKey(i, "ridgeZFt")], zone.ridgeZFt),
            ridgeZCheckFt: nullableNumberValue(draft[roofFieldKey(i, "ridgeZCheckFt")], zone.ridgeZCheckFt ?? null),
            pitchCheckRise: nullableNumberValue(draft[roofFieldKey(i, "pitchCheckRise")], zone.pitchCheckRise ?? null),
            pitchCheckRun: nullableNumberValue(draft[roofFieldKey(i, "pitchCheckRun")], zone.pitchCheckRun ?? null),
            source: (draft[roofFieldKey(i, "source")] ?? zone.source ?? "").trim()
          });
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
  function mirrorById(componentId: string, axis: "horizontal" | "vertical") {
    const component=candidate.components.find((item)=>item.id===componentId);
    if (!component || (component.kind !== "home" && component.kind !== "garage")) return;
    try {
      onCheckpoint(`Before mirroring ${component.label}`);
      onSave(mirrorPlacementComponent(candidate, component.id, axis));
      setSuggestions([]);
      setMessage(`${component.label} mirrored ${axis}. Prior machine evidence is stale until this exact geometry is evaluated.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to mirror building."); }
  }

  function mirrorSelected(axis: "horizontal" | "vertical") {
    if (!selected || (selected.kind !== "home" && selected.kind !== "garage")) return;
    mirrorById(selected.id, axis);
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
      setMessage(`Exact intervention screening complete: ${payload.hardLocalFailures ?? 0} local hard blocker(s), score ${payload.screeningScore ?? "—"}. Authoritative circulation proof remains separate; run it when you are ready for the full search.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Evaluation failed.");
    } finally {
      setRunning(null);
    }
  }

  function runAuthoritativeProof() {
    if (draftDirty || running !== null) return;
    workerRef.current?.terminate();
    const worker = new Worker(new URL("../../workers/authoritative-circulation.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    const total = candidate.components.filter((item) => item.kind === "stall").length;
    setRunning("authoritative"); setMessage(null);
    setAuthoritativeProof({ geometryRevision, status: "running", completed: 0, total, rows: [] });
    worker.onmessage = (event: MessageEvent<AuthoritativeWorkerMessage>) => {
      const payload = event.data;
      if (payload.geometryRevision !== geometryRevision) return;
      if (payload.type === "progress") {
        setAuthoritativeProof((current) => current ? { ...current, currentStallLabel: payload.stallLabel, total: payload.total } : current);
        return;
      }
      if (payload.type === "stall") {
        setAuthoritativeProof((current) => current ? { ...current, completed: payload.index, currentStallLabel: payload.stallLabel, rows: [...current.rows, payload.row] } : current);
        return;
      }
      if (payload.type === "complete") {
        setAuthoritativeProof((current) => ({ geometryRevision: payload.geometryRevision, status: "complete", completed: payload.result.summary.stallCount, total: payload.result.summary.stallCount, rows: payload.result.stalls, result: payload.result }));
        setRunning(null); workerRef.current?.terminate(); workerRef.current = null;
        const summary = payload.result.summary;
        setMessage(payload.result.pass
          ? `Authoritative hard-geometry proof closed ${summary.fullCirculationPass}/${summary.stallCount} stalls. Comfort policy and professional review remain separate.`
          : `Authoritative search closed ${summary.fullCirculationPass}/${summary.stallCount} full-circulation stalls. Unclosed stalls remain unproven, not impossible.`);
        return;
      }
      setAuthoritativeProof((current) => current ? { ...current, status: "error", error: payload.error } : { geometryRevision: payload.geometryRevision, status: "error", completed: 0, total, rows: [], error: payload.error });
      setRunning(null); workerRef.current?.terminate(); workerRef.current = null; setMessage(payload.error);
    };
    worker.onerror = (event) => {
      const error = event.message || "Authoritative proof worker failed.";
      setAuthoritativeProof((current) => current ? { ...current, status: "error", error } : { geometryRevision, status: "error", completed: 0, total, rows: [], error });
      setRunning(null); workerRef.current?.terminate(); workerRef.current = null; setMessage(error);
    };
    worker.postMessage({ candidate, geometryRevision, maxExpandedStates: 180000 });
  }

  function cancelAuthoritativeProof() {
    workerRef.current?.terminate(); workerRef.current = null;
    setRunning(null);
    setAuthoritativeProof((current) => current ? { ...current, status: "cancelled" } : current);
    setMessage("Authoritative proof cancelled. Existing screening evidence is unchanged.");
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
      setMessage(`${suggestion.label} applied. Its current evidence is screening-only; run authoritative proof on the applied geometry when ready.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to apply exploration suggestion.");
    }
  }

  function createRoofForBuilding(owner: PlacementComponent) {
    try {
      onCheckpoint(`Before creating roof model for ${owner.label}`);
      const next = createRoofComponent(candidate, owner.id);
      onSave(next);
      setSelectedId(`roof-${owner.id}`);
      setMessage(`${owner.label} roof draft created. It is CONCEPT ONLY until exact ridge/plate/pitch geometry passes the roof lock gate.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to create roof model.");
    }
  }

  function lockSelectedRoof() {
    if (!selected || selected.kind !== "roof") return;
    try {
      if (draftDirty) throw new Error("Save the roof draft before locking it.");
      onCheckpoint(`Before locking ${selected.label}`);
      onSave(lockRoofComponent(candidate, selected.id));
      setMessage(`${selected.label} passed the roof geometry solver and is now geometry-locked.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Roof lock failed.");
    }
  }

  function unlockSelectedRoof() {
    if (!selected || selected.kind !== "roof") return;
    try {
      onCheckpoint(`Before unlocking ${selected.label}`);
      onSave(unlockRoofComponent(candidate, selected.id));
      setMessage(`${selected.label} unlocked for editing. Renderers must treat it as CONCEPT ONLY until it passes lock again.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to unlock roof.");
    }
  }

  function addZoneToSelectedRoof() {
    if (!selected || selected.kind !== "roof") return;
    try {
      onCheckpoint(`Before adding roof zone to ${selected.label}`);
      onSave(addRoofZone(candidate, selected.id));
      setMessage("Additional gable zone added as an unlocked draft. Enter exact geometry before locking.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to add roof zone.");
    }
  }

  function removeZoneFromSelectedRoof(zoneId: string) {
    if (!selected || selected.kind !== "roof") return;
    try {
      onCheckpoint(`Before removing roof zone from ${selected.label}`);
      onSave(removeRoofZone(candidate, selected.id, zoneId));
      setMessage("Roof zone removed. Roof remains CONCEPT ONLY until revalidated.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to remove roof zone.");
    }
  }

  const selectedEditable = selected && isInterventionEditable(selected) ? selected : null;
  const selectedRoofOwner = selectedEditable?.kind === "roof"
    ? candidate.components.find((item): item is PlacementComponent => item.id === selectedEditable.ownerId && (item.kind === "home" || item.kind === "garage")) ?? null
    : null;
  const selectedRoofValidation = selectedEditable?.kind === "roof"
    ? validateRoofComponent(selectedEditable, selectedRoofOwner)
    : null;
  const selectedBuildingRoof = selectedEditable && (selectedEditable.kind === "home" || selectedEditable.kind === "garage")
    ? candidate.components.find((item): item is RoofComponent => item.kind === "roof" && item.ownerId === selectedEditable.id) ?? null
    : null;
  const selectedRoofZones = selectedEditable?.kind === "roof" && Array.isArray((selectedEditable as unknown as { zones?: unknown }).zones)
    ? selectedEditable.zones.filter((zone) => Boolean(zone && typeof zone === "object"))
    : [];
  return <section className="wb-panel intervention-editor-panel">
    <div className="section-heading intervention-editor-head">
      <div><p className="eyebrow">INTERVENTION EDITOR V4</p><h2>Drag the plan directly, then make the machine re-check it.</h2></div>
      <span className="mode-pill">{candidate.evidenceState} EVIDENCE</span>
    </div>
    <div className="candidate-warning-box intervention-truth-boundary"><b>Screening boundary</b><p>Evaluate exact edit is a fast screening layer for static geometry, enclosed parking and route hints. Run authoritative proof separately to test continuous stall-to-street circulation. Neither action replaces professional/AHJ review.</p></div>
    <div className={`candidate-warning-box roof-contract-summary ${roofSummary.invalid ? "has-error" : roofSummary.renderPolicy === "AUTHORITATIVE_ALLOWED" ? "is-locked" : ""}`}><b>Roof geometry contract</b><p>{roofSummary.invalid
      ? `${roofSummary.invalid} roof model(s) are invalid and fail closed. Authoritative roof output is prohibited.`
      : roofSummary.results.length === 0
        ? "No building placements require a roof model in this candidate."
        : roofSummary.missing || roofSummary.conceptOnly
          ? `${roofSummary.missing} missing · ${roofSummary.conceptOnly} CONCEPT ONLY · ${roofSummary.locked} geometry-locked. Missing/unlocked roofs cannot be shown as authoritative.`
          : `${roofSummary.locked} roof model(s) are geometry-locked to their exact owner footprints.`}</p></div>
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
          <span><b>Shape</b> drag wall/corner handles · double-click a wall midpoint to add a point · double-click an extra corner to remove it</span><span><b>Driveway</b> drag the round route points</span><span><b>Pavement</b> select it, then drag a corner</span><span><b>Roof</b> select a ridge line or roof component for exact pitch/ridge controls</span>
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
          <div className="roof-owner-callout">
            <b>Roof geometry</b>
            {selectedBuildingRoof
              ? <><span>{selectedBuildingRoof.status === "LOCKED" ? "GEOMETRY LOCKED" : "CONCEPT ONLY"}</span><button type="button" className="secondary-button" onClick={() => setSelectedId(selectedBuildingRoof.id)}>Open roof model</button></>
              : <><span>NO ROOF MODEL</span><button type="button" className="secondary-button" onClick={() => createRoofForBuilding(selectedEditable)}>Create roof model</button></>}
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

        {selectedEditable?.kind === "roof" && <div className="roof-editor">
          <div className="roof-status-row">
            <div><b>{selectedEditable.label}</b><span>{selectedRoofValidation?.status ?? "NO_MODEL"}</span></div>
            <small>{selectedEditable.staleReason ?? (selectedRoofValidation?.authoritative ? "Exact owner footprint + roof geometry validated." : "Roof is not authoritative.")}</small>
          </div>
          {selectedRoofValidation?.errors.length ? <div className="roof-error-list">{selectedRoofValidation.errors.map((error) => <span key={error}>{error}</span>)}</div> : null}
          {selectedRoofZones.map((zone, index) => <article key={zone.id ?? `roof-zone-${index}`} className="roof-zone-editor">
            <div className="roof-zone-head"><b>{zone.label}</b><span>{zone.status}</span><button type="button" className="tiny-action" onClick={() => removeZoneFromSelectedRoof(zone.id)}>Remove zone</button></div>
            <label className="intervention-select-label">Vertical authority<select value={draft[roofFieldKey(index, "solveBy")] ?? zone.solveBy} onChange={(event) => setField(roofFieldKey(index, "solveBy"), event.target.value)}>
              <option value="PITCH">Pitch → derive ridge Z</option><option value="RIDGE_Z">Ridge Z → derive pitch</option>
            </select></label>
            <details className="roof-zone-footprint"><summary>Roof-zone footprint <span>{zone.footprint ? "explicit 4-corner zone" : "uses owner footprint"}</span></summary>
              <p className="microcopy">Centered-gable v1 locks only rectangular zones. Leave all corners blank to use a rectangular owner footprint. Irregular buildings must be tiled by explicit 4-corner zones with no gaps or overlaps.</p>
              <div className="intervention-field-grid">
                {Array.from({ length: 4 }, (_, pointIndex) => <div className="roof-zone-corner" key={pointIndex}><b>Corner {pointIndex + 1}</b>
                  <Field label="X" value={draft[roofFieldKey(index, `footprint-${pointIndex}-x`)] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, `footprint-${pointIndex}-x`), value)} />
                  <Field label="Y" value={draft[roofFieldKey(index, `footprint-${pointIndex}-y`)] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, `footprint-${pointIndex}-y`), value)} />
                </div>)}
              </div>
            </details>
            <div className="intervention-field-grid">
              <Field label="Plate / bearing Z ft" value={draft[roofFieldKey(index, "plateZFt")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "plateZFt"), value)} />
              <Field label="Ridge A · X" value={draft[roofFieldKey(index, "ridgeAx")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeAx"), value)} />
              <Field label="Ridge A · Y" value={draft[roofFieldKey(index, "ridgeAy")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeAy"), value)} />
              <Field label="Ridge B · X" value={draft[roofFieldKey(index, "ridgeBx")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeBx"), value)} />
              <Field label="Ridge B · Y" value={draft[roofFieldKey(index, "ridgeBy")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeBy"), value)} />
              {(draft[roofFieldKey(index, "solveBy")] ?? zone.solveBy) === "PITCH"
                ? <><Field label="Pitch rise" value={draft[roofFieldKey(index, "pitchRise")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "pitchRise"), value)} /><Field label="Pitch run" value={draft[roofFieldKey(index, "pitchRun")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "pitchRun"), value)} /></>
                : <Field label="Ridge Z ft" value={draft[roofFieldKey(index, "ridgeZFt")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeZFt"), value)} />}
            </div>
            <details className="roof-zone-verification">
              <summary>Verification checks <span>optional · clear to remove</span></summary>
              <p className="microcopy">Checks are independent evidence, not a second authority. If supplied they must agree with the solved roof; blank fields remove the check.</p>
              <div className="intervention-field-grid">
                {(draft[roofFieldKey(index, "solveBy")] ?? zone.solveBy) === "PITCH"
                  ? <Field label="Ridge Z check ft" value={draft[roofFieldKey(index, "ridgeZCheckFt")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "ridgeZCheckFt"), value)} />
                  : <><Field label="Pitch check rise" value={draft[roofFieldKey(index, "pitchCheckRise")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "pitchCheckRise"), value)} /><Field label="Pitch check run" value={draft[roofFieldKey(index, "pitchCheckRun")] ?? ""} step={.25} onChange={(value) => setField(roofFieldKey(index, "pitchCheckRun"), value)} /></>}
              </div>
            </details>
            <label className="intervention-field roof-source-field"><span>Geometry source / provenance</span><input type="text" value={draft[roofFieldKey(index, "source")] ?? ""} placeholder="Adopted roof decision, plan sheet, field measure…" onChange={(event) => setField(roofFieldKey(index, "source"), event.target.value)} /></label>
          </article>)}
          <div className="shape-editor-actions"><button type="button" className="secondary-button" onClick={addZoneToSelectedRoof}>Add roof zone</button>
            {selectedEditable.status === "LOCKED" ? <button type="button" className="secondary-button" onClick={unlockSelectedRoof}>Unlock roof</button> : <button type="button" className="primary-button" disabled={draftDirty} title={draftDirty ? "Save the roof draft first." : undefined} onClick={lockSelectedRoof}>Validate + lock roof geometry</button>}
          </div>
          <p className="microcopy">Locking is fail-closed. Ridge location, centered run, plate/bearing datum and pitch/ridge-Z authority must all agree with the exact owner footprint.</p>
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
          {running === "authoritative"
            ? <button className="secondary-button" type="button" onClick={cancelAuthoritativeProof}>Cancel authoritative proof</button>
            : <button className="secondary-button" type="button" disabled={running !== null || draftDirty} title={draftDirty ? "Save the geometry edit first." : "Runs continuous-motion proof locally in a background worker."} onClick={runAuthoritativeProof}>Run authoritative proof</button>}
          <button className="secondary-button" type="button" disabled={!selectedEditable || selectedEditable.kind === "roof" || running !== null || draftDirty} title={selectedEditable?.kind === "roof" ? "Roof alternatives must remain explicit authored geometry; automatic neighborhood exploration is disabled." : draftDirty ? "Save the geometry edit first." : undefined} onClick={exploreAround}>{running === "explore" ? "Exploring…" : "Explore around edit"}</button>
        </div>
        <p className="microcopy">Drag/drop changes save immediately with a recovery checkpoint. Use Precision controls only when you want exact dimensions or coordinates; then click Save edit before evaluating.</p>
        {authoritativeProof && <div className={`authoritative-proof-panel ${authoritativeProof.geometryRevision !== geometryRevision ? "is-stale" : ""}`}>
          <div className="authoritative-proof-head"><div><b>Authoritative circulation</b><span>{authoritativeProof.status === "running" ? `Running ${authoritativeProof.currentStallLabel ?? "planner"} · ${authoritativeProof.completed}/${authoritativeProof.total} stalls complete` : authoritativeProof.status === "complete" ? `${authoritativeProof.result?.summary.fullCirculationPass ?? 0}/${authoritativeProof.result?.summary.stallCount ?? authoritativeProof.total} full-circulation stalls proven` : authoritativeProof.status}</span></div><strong>{authoritativeProof.geometryRevision !== geometryRevision ? "STALE" : authoritativeProof.result?.pass ? "HARD PASS" : authoritativeProof.status.toUpperCase()}</strong></div>
          {authoritativeProof.rows.length > 0 && <div className="authoritative-stall-grid">{authoritativeProof.rows.map((row) => <article key={row.stallId}><b>{row.stallId}</b><span className={row.fullCirculationPass ? "repair-pass" : "repair-fail"}>{row.fullCirculationPass ? "FULL PASS" : "OPEN"}</span><small>Inbound {row.inbound.found ? "proven" : "open"} · outbound {row.outbound.found ? "proven" : "open"}</small><small>{row.inbound.expandedStates.toLocaleString()} in / {row.outbound.expandedStates.toLocaleString()} out states</small></article>)}</div>}
          {authoritativeProof.status === "error" && <p>{authoritativeProof.error}</p>}
          <small>Hard geometry only. An unclosed search means not proven within the search contract; it is not a mathematical impossibility finding. Comfort and professional/AHJ gates remain separate.</small>
        </div>}
        {message && <p className="intervention-message">{message}</p>}
      </div>
    </div>

    {suggestions.length > 0 && <div className="intervention-suggestions">
      <div className="section-heading"><div><p className="eyebrow">BOUNDED ALTERNATIVES</p><h3>Machine-screened neighbors around the selected edit</h3></div><span className="mode-pill">{suggestions.length} OPTIONS</span></div>
      <div className="intervention-suggestion-grid">{suggestions.map((suggestion) => <article key={suggestion.id} className="intervention-suggestion-card"><CandidatePlan candidate={suggestion.candidate} /><div><b>{suggestion.label}</b><span>Screening score {suggestion.screeningScore}</span><p>{suggestion.summary}</p><button className="secondary-button" type="button" onClick={() => applySuggestion(suggestion)}>Apply this option</button></div></article>)}</div>
    </div>}
  </section>;
}
