import { rotatePoint, type Point } from "@/packages/geometry";
import {
  classifyCandidate,
  cloneCandidateComponents,
  markEvidenceStale,
  type CandidateComponent,
  type CandidateEvaluation,
  type CandidateRecord,
  type OpeningComponent,
  type PathComponent,
  type PlacementComponent,
  type PolygonComponent,
  type RoofComponent,
  type RoofZone,
  type StallComponent
} from "@/packages/candidates";
import { assertPolygonIntegrity, polygonWinding, projectPointToSegment } from "@/packages/candidates/geometry-integrity";
import { nextPlacementVertexId, placementShapeIdentity, resolvePlacementVertexIndex, resolvePlacementWallIndex } from "@/packages/candidates/shape-topology";
import { ownerGeometryKey, validateRoofComponent } from "@/packages/roof-geometry";

export type EditableCandidateComponent = PlacementComponent | PathComponent | OpeningComponent | RoofComponent | (PolygonComponent & { kind: "pavement" });

export function isInterventionEditable(component: CandidateComponent): component is EditableCandidateComponent {
  if (!component || typeof component !== "object" || component.locked) return false;
  if (component.kind === "roof") {
    const zones = (component as unknown as { zones?: unknown }).zones;
    if (!Array.isArray(zones) || zones.some((zone) => !zone || typeof zone !== "object" || Array.isArray(zone))) return false;
  }
  return ["home", "garage", "driveway", "route", "pavement", "opening", "roof"].includes(component.kind);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
function staleCandidate(candidate: CandidateRecord, components: CandidateComponent[], updatedAt: string): CandidateRecord {
  return markEvidenceStale({
    ...candidate,
    components,
    classificationReason: "Staff intervention geometry changed. Prior evaluation remains historical; this exact state requires revalidation."
  }, updatedAt);
}

function invalidateOwnedRoofComponents(components: CandidateComponent[], ownerId: string, reason: string) {
  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (component.kind !== "roof" || component.ownerId !== ownerId) continue;
    const rawZones = (component as unknown as { zones?: unknown }).zones;
    const zones = Array.isArray(rawZones)
      ? rawZones.map((zone) => zone && typeof zone === "object" && !Array.isArray(zone)
          ? { ...zone, status: "UNLOCKED" }
          : zone)
      : rawZones;
    components[index] = {
      ...component,
      status: "UNLOCKED",
      ownerGeometryKey: undefined,
      staleReason: reason,
      zones
    } as CandidateComponent;
  }
}

function assertEditable<T extends CandidateComponent>(component: T | undefined): T {
  if (!component) throw new Error("Component not found.");
  if (!isInterventionEditable(component)) throw new Error("This component is locked or not editable in Intervention Editor v1.");
  return component;
}

function assertBuildingPolygon(polygon: ReadonlyArray<Point>, expectedWinding: -1 | 1 | null = null) {
  return assertPolygonIntegrity(polygon, {
    label: "Building footprint",
    minVertices: 4,
    minEdgeFt: 0.5,
    minAreaSqFt: 4,
    expectedWinding
  });
}

function assertPavementPolygon(polygon: ReadonlyArray<Point>, expectedWinding: -1 | 1 | null = null) {
  return assertPolygonIntegrity(polygon, {
    label: "Pavement footprint",
    minVertices: 3,
    minEdgeFt: 0.25,
    minAreaSqFt: 1,
    expectedWinding
  });
}

export type PlacementEdit = {
  x?: number;
  y?: number;
  widthFt?: number;
  depthFt?: number;
  rotationDeg?: number;
};

export function editPlacementComponent(candidate: CandidateRecord, componentId: string, edit: PlacementEdit, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  const nextX = round(edit.x ?? target.x);
  const nextY = round(edit.y ?? target.y);
  const nextWidth = round(edit.widthFt ?? target.widthFt);
  const nextDepth = round(edit.depthFt ?? target.depthFt);
  const rotationLimit = target.rotationLimitDeg ?? 180;
  const nextRotation = round(Math.max(-rotationLimit, Math.min(rotationLimit, edit.rotationDeg ?? target.rotationDeg ?? 0)));
  if (nextWidth <= 0 || nextDepth <= 0) throw new Error("Placement dimensions must be positive.");
  if (!target.resizable && (nextWidth !== target.widthFt || nextDepth !== target.depthFt)) throw new Error("This component is size-locked.");
  if (target.movable === false && (nextX !== target.x || nextY !== target.y)) throw new Error("This component is position-locked.");

  const oldCenter: Point = [target.x + target.widthFt / 2, target.y + target.depthFt / 2];
  const newCenter: Point = [nextX + nextWidth / 2, nextY + nextDepth / 2];
  const deltaRotation = nextRotation - (target.rotationDeg ?? 0);
  const sx = nextWidth / target.widthFt;
  const sy = nextDepth / target.depthFt;
  const originalWinding = target.polygon ? polygonWinding(target.polygon) : null;
  const polygonVertexIds = target.polygon ? placementShapeIdentity(target).vertexIds : undefined;
  let polygon = target.polygon?.map(([x, y]) => [
    round(nextX + (x - target.x) * sx),
    round(nextY + (y - target.y) * sy)
  ] as Point);
  let storedRotation = nextRotation;
  // Polygon placements carry their authored footprint directly. Bake rotation into
  // those vertices so every downstream geometry engine sees the same shape.
  if (polygon && deltaRotation) {
    const radians = deltaRotation * Math.PI / 180;
    polygon = polygon.map((point) => {
      const rotated = rotatePoint(point, newCenter, radians);
      return [round(rotated[0]), round(rotated[1])] as Point;
    });
    storedRotation = 0;
  }
  if (polygon) assertBuildingPolygon(polygon, originalWinding);

  const placementBounds = polygon && deltaRotation ? polygonBounds(polygon) : { x: nextX, y: nextY, widthFt: nextWidth, depthFt: nextDepth };
  const nextPlacement: PlacementComponent = { ...target, ...placementBounds, rotationDeg: storedRotation, polygon, ...(polygon ? { polygonVertexIds } : {}) };
  const ownerGeometryChanged = ownerGeometryKey(target) !== ownerGeometryKey(nextPlacement);
  if (!ownerGeometryChanged) return candidate;
  components[index] = nextPlacement;
  if (target.kind === "garage") {
    const radians = deltaRotation * Math.PI / 180;
    for (let i = 0; i < components.length; i += 1) {
      const component = components[i];
      if (component.kind !== "stall" || component.garageId !== target.id) continue;
      const rotated = rotatePoint([component.axleX, component.axleY], oldCenter, radians);
      const dx = newCenter[0] - oldCenter[0];
      const dy = newCenter[1] - oldCenter[1];
      components[i] = {
        ...component,
        axleX: round(rotated[0] + dx),
        axleY: round(rotated[1] + dy),
        headingDeg: round(component.headingDeg + deltaRotation)
      } satisfies StallComponent;
    }
  }
  invalidateOwnedRoofComponents(components, target.id, "Building placement changed; roof lock requires revalidation against the new footprint.");
  return staleCandidate(candidate, components, updatedAt);
}

function polygonBounds(polygon: ReadonlyArray<Point>) {
  const xs = polygon.map(([x]) => x), ys = polygon.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), widthFt: Math.max(...xs) - Math.min(...xs), depthFt: Math.max(...ys) - Math.min(...ys) };
}

export function mirrorPlacementComponent(candidate: CandidateRecord, componentId: string, axis: "horizontal" | "vertical", updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  const center: Point = [target.x + target.widthFt / 2, target.y + target.depthFt / 2];
  const identity = placementShapeIdentity(target);
  const expectedWinding = polygonWinding(identity.polygon);
  const polygon = identity.polygon.map(([x, y]) => [
    round(axis === "horizontal" ? center[0] * 2 - x : x),
    round(axis === "vertical" ? center[1] * 2 - y : y)
  ] as Point).reverse();
  const polygonVertexIds = [...identity.vertexIds].reverse();
  assertBuildingPolygon(polygon, expectedWinding);
  const bounds = polygonBounds(polygon);
  components[index] = { ...target, ...bounds, polygon, polygonVertexIds, rotationDeg: 0 };
  invalidateOwnedRoofComponents(components, target.id, "Building mirror changed the roof dependency geometry.");
  return staleCandidate(candidate, components, updatedAt);
}

export function editPlacementWallLength(candidate: CandidateRecord, componentId: string, wallRef: number | string, lengthDeltaFt: number, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  if (Math.abs(lengthDeltaFt) < 1e-9) return candidate;
  const identity = placementShapeIdentity(target);
  const polygon = identity.polygon;
  const wallIndex = resolvePlacementWallIndex(target, wallRef);
  const expectedWinding = polygonWinding(polygon);
  const a = polygon[wallIndex], bIndex = (wallIndex + 1) % polygon.length, b = polygon[bIndex];
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  const nextLength = length + lengthDeltaFt;
  if (length < 0.01 || nextLength < 2) throw new Error("Wall length must remain at least 2 ft.");
  const ux = dx / length, uy = dy / length, half = lengthDeltaFt / 2;
  polygon[wallIndex] = [round(a[0] - ux * half), round(a[1] - uy * half)];
  polygon[bIndex] = [round(b[0] + ux * half), round(b[1] + uy * half)];
  assertBuildingPolygon(polygon, expectedWinding);
  const bounds = polygonBounds(polygon);
  const nextPlacement: PlacementComponent = { ...target, ...bounds, polygon, polygonVertexIds: identity.vertexIds, rotationDeg: 0 };
  if (ownerGeometryKey(target) === ownerGeometryKey(nextPlacement)) return candidate;
  components[index] = nextPlacement;
  invalidateOwnedRoofComponents(components, target.id, "Wall length changed; roof lock requires revalidation.");
  return staleCandidate(candidate, components, updatedAt);
}

export function insertPlacementVertex(candidate: CandidateRecord, componentId: string, wallRef: number | string, point?: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  const identity = placementShapeIdentity(target);
  const polygon = identity.polygon, vertexIds = identity.vertexIds;
  const wallIndex = resolvePlacementWallIndex(target, wallRef);
  const expectedWinding = polygonWinding(polygon);
  const a = polygon[wallIndex], b = polygon[(wallIndex + 1) % polygon.length];
  const requested: Point = point ?? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const projected = projectPointToSegment(requested, a, b);
  const inserted: Point = [round(projected[0]), round(projected[1])];
  polygon.splice(wallIndex + 1, 0, inserted);
  vertexIds.splice(wallIndex + 1, 0, nextPlacementVertexId(target.id, vertexIds));
  assertBuildingPolygon(polygon, expectedWinding);
  components[index] = { ...target, ...polygonBounds(polygon), polygon, polygonVertexIds: vertexIds, rotationDeg: 0 };
  invalidateOwnedRoofComponents(components, target.id, "Footprint deflection point added; roof zones must be revalidated.");
  return staleCandidate(candidate, components, updatedAt);
}

export function removePlacementVertex(candidate: CandidateRecord, componentId: string, vertexRef: number | string, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  const identity = placementShapeIdentity(target);
  const polygon = identity.polygon, vertexIds = identity.vertexIds;
  const vertexIndex = resolvePlacementVertexIndex(target, vertexRef);
  const expectedWinding = polygonWinding(polygon);
  polygon.splice(vertexIndex, 1); vertexIds.splice(vertexIndex, 1);
  assertBuildingPolygon(polygon, expectedWinding);
  components[index] = { ...target, ...polygonBounds(polygon), polygon, polygonVertexIds: vertexIds, rotationDeg: 0 };
  invalidateOwnedRoofComponents(components, target.id, "Footprint deflection point removed; roof zones must be revalidated.");
  return staleCandidate(candidate, components, updatedAt);
}

export function editPlacementVertex(candidate: CandidateRecord, componentId: string, vertexRef: number | string, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  const identity = placementShapeIdentity(target);
  const vertexIndex = resolvePlacementVertexIndex(target, vertexRef);
  const expectedWinding = polygonWinding(identity.polygon);
  const polygon = identity.polygon.map(([x,y], i) => i === vertexIndex ? [round(point[0]), round(point[1])] as Point : [x,y] as Point);
  assertBuildingPolygon(polygon, expectedWinding);
  const bounds = polygonBounds(polygon);
  const nextPlacement: PlacementComponent = { ...target, ...bounds, polygon, polygonVertexIds: identity.vertexIds, rotationDeg: 0 };
  if (ownerGeometryKey(target) === ownerGeometryKey(nextPlacement)) return candidate;
  components[index] = nextPlacement;
  invalidateOwnedRoofComponents(components, target.id, "Building corner changed; roof lock requires revalidation.");
  return staleCandidate(candidate, components, updatedAt);
}

export function editPathPoint(candidate: CandidateRecord, componentId: string, pointIndex: number, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "driveway" && target.kind !== "route") throw new Error("Selected component is not a route.");
  if (pointIndex < 0 || pointIndex >= target.points.length) throw new Error("Route control point is out of range.");
  if (target.movableControlPoints?.length && !target.movableControlPoints.includes(pointIndex)) throw new Error("That route control point is locked.");
  const points = target.points.map((value, i) => i === pointIndex ? [round(point[0]), round(point[1])] as Point : value);
  components[index] = { ...target, points } satisfies PathComponent;
  return staleCandidate(candidate, components, updatedAt);
}

export function editPavementVertex(candidate: CandidateRecord, componentId: string, vertexIndex: number, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "pavement") throw new Error("Selected component is not pavement.");
  if (vertexIndex < 0 || vertexIndex >= target.polygon.length) throw new Error("Pavement vertex is out of range.");
  const expectedWinding = polygonWinding(target.polygon);
  const polygon = target.polygon.map((value, i) => i === vertexIndex ? [round(point[0]), round(point[1])] as Point : value);
  assertPavementPolygon(polygon, expectedWinding);
  components[index] = { ...target, polygon } satisfies PolygonComponent;
  return staleCandidate(candidate, components, updatedAt);
}

export function editOpeningComponent(candidate: CandidateRecord, componentId: string, edit: { openingWidthFt?: number; offsetFt?: number }, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "opening") throw new Error("Selected component is not an opening.");
  const openingWidthFt = round(edit.openingWidthFt ?? target.openingWidthFt);
  const offsetFt = round(edit.offsetFt ?? target.offsetFt);
  if (openingWidthFt <= 0 || offsetFt < 0) throw new Error("Opening width must be positive and offset cannot be negative.");
  components[index] = { ...target, openingWidthFt, offsetFt } satisfies OpeningComponent;
  return staleCandidate(candidate, components, updatedAt);
}

export type RoofZoneEdit = Omit<Partial<Pick<RoofZone,
  "label" | "footprint" | "plateZFt" | "ridgeA" | "ridgeB" | "solveBy" | "pitchRise" | "pitchRun" |
  "ridgeZFt" | "ridgeZCheckFt" | "pitchCheckRise" | "pitchCheckRun" | "source"
>>, "footprint"> & {
  footprint?: Point[] | null;
};

export function createRoofComponent(candidate: CandidateRecord, ownerId: string, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const owner = components.find((item): item is PlacementComponent =>
    item.id === ownerId && (item.kind === "home" || item.kind === "garage"));
  if (!owner) throw new Error("Roof owner must be a home or garage placement.");
  if (components.some((item) => item.kind === "roof" && item.ownerId === ownerId)) {
    throw new Error("This building already has a roof model.");
  }
  const roof: RoofComponent = {
    id: `roof-${ownerId}`, kind: "roof", label: `${owner.label} roof`, ownerId,
    status: "UNLOCKED", staleReason: "Roof model created; enter exact geometry before locking.",
    zones: [{
      id: `${ownerId}-roof-zone-1`, label: "Main gable", status: "UNLOCKED", type: "gable",
      plateZFt: null, ridgeA: null, ridgeB: null, solveBy: "PITCH",
      pitchRise: null, pitchRun: 12, ridgeZFt: null
    }]
  };
  components.push(roof);
  return staleCandidate(candidate, components, updatedAt);
}

export function addRoofZone(candidate: CandidateRecord, roofId: string, label = "Additional gable", updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === roofId);
  const target = assertEditable(components[index]);
  if (target.kind !== "roof") throw new Error("Selected component is not a roof.");
  const suffix = target.zones.reduce((max, zone) => {
    const match = zone.id.match(/-(\d+)$/); return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
  const zone: RoofZone = {
    id: `${target.ownerId}-roof-zone-${suffix}`, label, status: "UNLOCKED", type: "gable",
    plateZFt: null, ridgeA: null, ridgeB: null, solveBy: "PITCH",
    pitchRise: null, pitchRun: 12, ridgeZFt: null
  };
  components[index] = { ...target, status: "UNLOCKED", ownerGeometryKey: undefined,
    staleReason: "Roof zone added; roof requires revalidation.", zones: [...target.zones, zone] };
  return staleCandidate(candidate, components, updatedAt);
}

export function removeRoofZone(candidate: CandidateRecord, roofId: string, zoneId: string, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === roofId);
  const target = assertEditable(components[index]);
  if (target.kind !== "roof") throw new Error("Selected component is not a roof.");
  if (!target.zones.some((zone) => zone.id === zoneId)) throw new Error("Roof zone not found.");
  const zones = target.zones.filter((zone) => zone.id !== zoneId);
  components[index] = { ...target, status: "UNLOCKED", ownerGeometryKey: undefined,
    staleReason: "Roof zone removed; roof requires revalidation.", zones };
  return staleCandidate(candidate, components, updatedAt);
}

export function editRoofZone(candidate: CandidateRecord, roofId: string, zoneId: string, edit: RoofZoneEdit, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === roofId);
  const target = assertEditable(components[index]);
  if (target.kind !== "roof") throw new Error("Selected component is not a roof.");
  const zoneIndex = target.zones.findIndex((zone) => zone.id === zoneId);
  if (zoneIndex < 0) throw new Error("Roof zone not found.");
  const normalizePoint = (value: Point | null | undefined, fallback: Point | null) =>
    value === undefined ? fallback : value === null ? null : [round(value[0]), round(value[1])] as Point;
  const numeric = (value: number | null | undefined, fallback: number | null | undefined) =>
    value === undefined ? fallback ?? null : value === null ? null : round(value);
  const optionalNumeric = (value: number | null | undefined, fallback: number | null | undefined) =>
    value === undefined ? fallback : value === null ? (fallback === undefined ? undefined : null) : round(value);
  const zone = target.zones[zoneIndex];
  const authored: RoofZone = {
    ...zone,
    label: edit.label ?? zone.label,
    footprint: edit.footprint === undefined ? zone.footprint : edit.footprint === null ? undefined : edit.footprint.map(([x,y]) => [round(x),round(y)] as Point),
    plateZFt: numeric(edit.plateZFt, zone.plateZFt),
    ridgeA: normalizePoint(edit.ridgeA, zone.ridgeA),
    ridgeB: normalizePoint(edit.ridgeB, zone.ridgeB),
    solveBy: edit.solveBy ?? zone.solveBy,
    pitchRise: numeric(edit.pitchRise, zone.pitchRise),
    pitchRun: numeric(edit.pitchRun, zone.pitchRun),
    ridgeZFt: numeric(edit.ridgeZFt, zone.ridgeZFt),
    ridgeZCheckFt: optionalNumeric(edit.ridgeZCheckFt, zone.ridgeZCheckFt),
    pitchCheckRise: optionalNumeric(edit.pitchCheckRise, zone.pitchCheckRise),
    pitchCheckRun: optionalNumeric(edit.pitchCheckRun, zone.pitchCheckRun),
    source: edit.source ?? zone.source,
    status: zone.status
  };
  if (JSON.stringify(authored) === JSON.stringify(zone)) return candidate;
  const next: RoofZone = { ...authored, status: "UNLOCKED" };
  const zones = target.zones.map((item, i) => i === zoneIndex ? next : { ...item, status: "UNLOCKED" as const });
  components[index] = { ...target, status: "UNLOCKED", ownerGeometryKey: undefined,
    staleReason: "Roof draft changed; validate and lock this exact geometry.", zones };
  return staleCandidate(candidate, components, updatedAt);
}

export function lockRoofComponent(candidate: CandidateRecord, roofId: string, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === roofId);
  const target = assertEditable(components[index]);
  if (target.kind !== "roof") throw new Error("Selected component is not a roof.");
  const owner = components.find((item): item is PlacementComponent =>
    item.id === target.ownerId && (item.kind === "home" || item.kind === "garage"));
  if (!owner) throw new Error("Roof owner placement is missing.");
  const trial: RoofComponent = {
    ...target, status: "LOCKED", ownerGeometryKey: ownerGeometryKey(owner), staleReason: undefined,
    zones: target.zones.map((zone) => ({ ...zone, status: "LOCKED" }))
  };
  const validation = validateRoofComponent(trial, owner);
  if (!validation.authoritative) {
    throw new Error(`Roof cannot lock: ${validation.errors.join("; ") || "geometry is incomplete"}`);
  }
  components[index] = trial;
  return staleCandidate(candidate, components, updatedAt);
}

export function unlockRoofComponent(candidate: CandidateRecord, roofId: string, reason = "Roof manually unlocked for editing.", updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === roofId);
  const target = assertEditable(components[index]);
  if (target.kind !== "roof") throw new Error("Selected component is not a roof.");
  components[index] = { ...target, status: "UNLOCKED", ownerGeometryKey: undefined, staleReason: reason,
    zones: target.zones.map((zone) => ({ ...zone, status: "UNLOCKED" })) };
  return staleCandidate(candidate, components, updatedAt);
}

export function applyCandidateEvaluation(candidate: CandidateRecord, evaluation: CandidateEvaluation, updatedAt = new Date().toISOString()): CandidateRecord {
  if (evaluation.candidateId !== candidate.id) throw new Error("Evaluation candidate id does not match the working candidate.");
  const classification = classifyCandidate(evaluation);
  const history = candidate.evaluationHistory.filter((item) => item.id !== evaluation.id);
  return {
    ...candidate,
    status: classification.status,
    evidenceState: "CURRENT",
    classificationReason: `${classification.reason} Current evidence is Intervention Editor screening; authoritative outbound proof remains a separate hard gate.`,
    evaluationHistory: [...history, evaluation],
    currentEvaluationId: evaluation.id,
    updatedAt
  };
}

export function currentRepairClasses(candidate: CandidateRecord): string[] {
  if (!candidate.currentEvaluationId) return [];
  const evaluation = candidate.evaluationHistory.find((item) => item.id === candidate.currentEvaluationId);
  return [...new Set(evaluation?.gates.flatMap((gate) => gate.repairClasses ?? []) ?? [])];
}

export function suggestedEditableComponent(candidate: CandidateRecord) {
  const repairs = currentRepairClasses(candidate);
  const priority = [
    repairs.some((value) => value.includes("garage")) ? "garage" : null,
    repairs.some((value) => value.includes("drive") || value.includes("route")) ? "driveway" : null,
    repairs.some((value) => value.includes("pavement")) ? "pavement" : null,
    repairs.some((value) => value.includes("opening")) ? "opening" : null,
    repairs.some((value) => value.includes("building")) ? "home" : null
  ].filter(Boolean);
  return candidate.components.find((component) => isInterventionEditable(component) && priority.includes(component.kind))
    ?? candidate.components.find(isInterventionEditable)
    ?? null;
}
