import { polygonArea, rotatePolygon, type Point } from "@/packages/geometry";
import type { PlacementComponent, RoofComponent, RoofZone } from "@/packages/candidates";
import { placementShapeIdentity } from "@/packages/candidates/shape-topology";

export const ROOF_GEOMETRY_SCHEMA = "lotscope-roof-geometry-v1" as const;

export const ROOF_TOLERANCE = Object.freeze({
  planFt: 0.02,
  zFt: 0.02,
  pitchRatio: 0.002,
  centerFt: 0.03
});

export const ROOF_RULES = Object.freeze([
  "Single roof SOT: every elevation, section, axon and export consumes the same solved roof geometry.",
  "Fail closed: incomplete, stale, unsupported or inconsistent roof data may render only as CONCEPT_ONLY.",
  "Plan first: every locked ridge is a world-coordinate line tied to an explicit roof-zone footprint.",
  "One vertical authority: solve by PITCH or RIDGE_Z; never treat both as independently authoritative.",
  "Derive the other: pitch derives ridge elevation, or ridge elevation derives pitch from the measured run.",
  "Centered gable v1: each authoritative gable zone is rectangular and its ridge bisects the cross-span, aligns to a zone axis and spans the full gable-end distance.",
  "Irregular owners: multiple rectangular zones must tile the exact owner footprint with no area gaps or interior overlaps.",
  "Zone continuity: touching authoritative roof zones must agree in Z along their entire shared interface within tolerance.",
  "Common datum: plate/bearing and ridge values are feet in model Z, never drawing pixels.",
  "Traceable source: every locked zone records geometry provenance.",
  "No view overrides: a renderer may not move a ridge or alter slope to improve appearance.",
  "Geometry dependency: a locked roof is valid only for the exact owner footprint key it was locked against.",
  "Unsupported roof types remain concept-only until a validated solver exists."
] as const);
function rounded(value: number) {
  if (!Number.isFinite(value)) throw new Error("roof geometry must be finite");
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function placementPolygon(owner: PlacementComponent): Point[] {
  const polygon = placementShapeIdentity(owner).polygon.map(([x, y]) => [x, y] as Point);
  const rotationDeg = owner.rotationDeg ?? 0;
  if (!rotationDeg || owner.polygon) return polygon;
  const center: Point = [owner.x + owner.widthFt / 2, owner.y + owner.depthFt / 2];
  return rotatePolygon(polygon, center, rotationDeg * Math.PI / 180);
}

export function ownerGeometryKey(owner: PlacementComponent) {
  return JSON.stringify({
    id: owner.id,
    rotationDeg: rounded(owner.rotationDeg ?? 0),
    polygon: placementPolygon(owner).map(([x, y]) => [rounded(x), rounded(y)])
  });
}

function pointOnSegment(point: Point, a: Point, b: Point, epsilon = ROOF_TOLERANCE.planFt) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const wx = point[0] - a[0], wy = point[1] - a[1];
  const cross = vx * wy - vy * wx;
  if (Math.abs(cross) > epsilon * Math.max(1, Math.hypot(vx, vy))) return false;
  const dot = wx * vx + wy * vy, len = vx * vx + vy * vy;
  return dot >= -epsilon && dot <= len + epsilon;
}
function pointInPolygon(point: Point, polygon: ReadonlyArray<Point>) {
  for (let i = 0; i < polygon.length; i += 1) {
    if (pointOnSegment(point, polygon[i], polygon[(i + 1) % polygon.length])) return true;
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i], b = polygon[j];
    if (((a[1] > point[1]) !== (b[1] > point[1]))
      && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / ((b[1] - a[1]) || 1e-12) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function subtract(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}
function normalize(v: Point): Point | null {
  const length = Math.hypot(v[0], v[1]);
  return length > 1e-9 ? [v[0] / length, v[1] / length] : null;
}
function dot(a: Point, b: Point) {
  return a[0] * b[0] + a[1] * b[1];
}
function cross2(a: Point, b: Point) {
  return a[0] * b[1] - a[1] * b[0];
}
function pointOnBoundary(point: Point, polygon: ReadonlyArray<Point>) {
  return polygon.some((a, index) => pointOnSegment(point, a, polygon[(index + 1) % polygon.length]));
}
function rectangleCheck(polygon: ReadonlyArray<Point>) {
  if (polygon.length !== 4) return { ok: false, detail: `expected 4 vertices, received ${polygon.length}` };
  const edges = polygon.map((point, index) => subtract(polygon[(index + 1) % polygon.length], point));
  const lengths = edges.map((edge) => Math.hypot(edge[0], edge[1]));
  if (lengths.some((length) => length <= ROOF_TOLERANCE.planFt)) return { ok: false, detail: "zero/short rectangle edge" };
  const angularTolerance = 0.002;
  const rightAngles = edges.every((edge, index) => {
    const next = edges[(index + 1) % edges.length];
    return Math.abs(dot(edge, next) / (lengths[index] * lengths[(index + 1) % lengths.length])) <= angularTolerance;
  });
  const oppositeParallel = [0, 1].every((index) => {
    const opposite = edges[index + 2];
    return Math.abs(cross2(edges[index], opposite) / (lengths[index] * lengths[index + 2])) <= angularTolerance;
  });
  return { ok: rightAngles && oppositeParallel, detail: rightAngles && oppositeParallel ? "rectangular zone" : "zone is not a rectangle" };
}
function properSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const abC = cross2(subtract(b, a), subtract(c, a));
  const abD = cross2(subtract(b, a), subtract(d, a));
  const cdA = cross2(subtract(d, c), subtract(a, c));
  const cdB = cross2(subtract(d, c), subtract(b, c));
  const epsilon = 1e-8;
  if ([abC, abD, cdA, cdB].some((value) => Math.abs(value) <= epsilon)) return false;
  return Math.sign(abC) !== Math.sign(abD) && Math.sign(cdA) !== Math.sign(cdB);
}
function strictlyInside(point: Point, polygon: ReadonlyArray<Point>) {
  return pointInPolygon(point, polygon) && !pointOnBoundary(point, polygon);
}
function polygonContained(inner: ReadonlyArray<Point>, outer: ReadonlyArray<Point>) {
  if (!inner.every((point) => pointInPolygon(point, outer))) return false;
  for (let i = 0; i < inner.length; i += 1) {
    for (let j = 0; j < outer.length; j += 1) {
      if (properSegmentsIntersect(inner[i], inner[(i + 1) % inner.length], outer[j], outer[(j + 1) % outer.length])) return false;
    }
  }
  return true;
}
function polygonsInteriorOverlap(a: ReadonlyArray<Point>, b: ReadonlyArray<Point>) {
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (properSegmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
    }
  }
  if (a.some((point) => strictlyInside(point, b)) || b.some((point) => strictlyInside(point, a))) return true;
  const centroid = (polygon: ReadonlyArray<Point>): Point => [
    polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
    polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length
  ];
  return strictlyInside(centroid(a), b) || strictlyInside(centroid(b), a);
}
function collinearOverlap(a: Point, b: Point, c: Point, d: Point): [Point, Point] | null {
  const edge = subtract(b, a), unit = normalize(edge);
  if (!unit) return null;
  const length = Math.hypot(edge[0], edge[1]);
  const normal: Point = [-unit[1], unit[0]];
  if (Math.abs(dot(subtract(c, a), normal)) > ROOF_TOLERANCE.planFt
    || Math.abs(dot(subtract(d, a), normal)) > ROOF_TOLERANCE.planFt) return null;
  const tc = dot(subtract(c, a), unit), td = dot(subtract(d, a), unit);
  const low = Math.max(0, Math.min(tc, td)), high = Math.min(length, Math.max(tc, td));
  if (high - low <= ROOF_TOLERANCE.planFt) return null;
  return [
    [a[0] + unit[0] * low, a[1] + unit[1] * low],
    [a[0] + unit[0] * high, a[1] + unit[1] * high]
  ];
}
function sharedBoundarySegments(a: ReadonlyArray<Point>, b: ReadonlyArray<Point>) {
  const shared: Array<[Point, Point]> = [];
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      const overlap = collinearOverlap(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]);
      if (overlap) shared.push(overlap);
    }
  }
  return shared;
}
export function pitchRatio(rise: number | null, run: number | null) {
  return Number.isFinite(rise) && Number.isFinite(run) && (run as number) > 0
    ? (rise as number) / (run as number)
    : null;
}

export function pitch12Label(ratio: number | null) {
  if (!Number.isFinite(ratio)) return null;
  const rise12 = (ratio as number) * 12;
  return `${rise12.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}:12`;
}

function zoneFootprint(owner: PlacementComponent, zone: RoofZone) {
  return zone.footprint?.length && zone.footprint.length >= 3
    ? zone.footprint.map(([x, y]) => [x, y] as Point)
    : placementPolygon(owner);
}

export type SolvedRoofZone = {
  zoneId: string;
  status: "UNLOCKED" | "LOCKED" | "INVALID";
  authoritative: boolean;
  errors: string[];
  footprint: Point[];
  plateZFt: number | null;
  ridgeA: Point | null;
  ridgeB: Point | null;
  ridgeZFt: number | null;
  runFt: number | null;
  pitchRatio: number | null;
  pitch12: string | null;
  checks: Array<{ id: string; ok: boolean; detail?: string }>;
};

export function roofZoneHeightAt(zone: SolvedRoofZone, point: Point) {
  if (!zone.authoritative || !zone.ridgeA || !zone.ridgeB || zone.ridgeZFt == null || zone.pitchRatio == null) return null;
  const unit = normalize(subtract(zone.ridgeB, zone.ridgeA));
  if (!unit) return null;
  const normal: Point = [-unit[1], unit[0]];
  const offset = Math.abs(dot(subtract(point, zone.ridgeA), normal));
  return zone.ridgeZFt - offset * zone.pitchRatio;
}
function zoneInterfaceCheck(a: SolvedRoofZone, b: SolvedRoofZone) {
  const shared = sharedBoundarySegments(a.footprint, b.footprint);
  if (!shared.length) return { adjacent: false, continuous: false, maxDeltaFt: null as number | null };
  let maxDelta = 0;
  for (const [start, end] of shared) {
    const midpoint: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    for (const point of [start, midpoint, end]) {
      const za = roofZoneHeightAt(a, point), zb = roofZoneHeightAt(b, point);
      if (za == null || zb == null) return { adjacent: true, continuous: false, maxDeltaFt: null as number | null };
      maxDelta = Math.max(maxDelta, Math.abs(za - zb));
    }
  }
  return { adjacent: true, continuous: maxDelta <= ROOF_TOLERANCE.zFt, maxDeltaFt: rounded(maxDelta) };
}

export function solveGableZone(owner: PlacementComponent, zone: RoofZone): SolvedRoofZone {
  const footprint = zoneFootprint(owner, zone);
  if (zone.status !== "LOCKED") {
    return {
      zoneId: zone.id, status: "UNLOCKED", authoritative: false, errors: [],
      footprint, plateZFt: zone.plateZFt, ridgeA: zone.ridgeA, ridgeB: zone.ridgeB,
      ridgeZFt: zone.ridgeZFt, runFt: null,
      pitchRatio: pitchRatio(zone.pitchRise, zone.pitchRun),
      pitch12: pitch12Label(pitchRatio(zone.pitchRise, zone.pitchRun)), checks: []
    };
  }

  const errors: string[] = [], checks: SolvedRoofZone["checks"] = [];
  if (zone.type !== "gable") errors.push(`Unsupported roof type ${zone.type}`);
  if (!zone.source?.trim()) errors.push("roof geometry source / provenance is required");
  if (!Number.isFinite(zone.plateZFt)) errors.push("plateZFt is required");
  if (!zone.ridgeA || !zone.ridgeB) errors.push("ridgeA and ridgeB world points are required");
  const rectangular = rectangleCheck(footprint);
  if (!rectangular.ok) errors.push(`Centered-gable v1 requires a rectangular roof zone: ${rectangular.detail}`);
  if (errors.length || !zone.ridgeA || !zone.ridgeB || !Number.isFinite(zone.plateZFt)) {
    return {
      zoneId: zone.id, status: "INVALID", authoritative: false, errors, footprint,
      plateZFt: zone.plateZFt, ridgeA: zone.ridgeA, ridgeB: zone.ridgeB,
      ridgeZFt: null, runFt: null, pitchRatio: null, pitch12: null, checks
    };
  }

  const unit = normalize(subtract(zone.ridgeB, zone.ridgeA));
  if (!unit) errors.push("ridge line has zero length");
  if (!unit) return {
    zoneId: zone.id, status: "INVALID", authoritative: false, errors, footprint,
    plateZFt: zone.plateZFt, ridgeA: zone.ridgeA, ridgeB: zone.ridgeB,
    ridgeZFt: null, runFt: null, pitchRatio: null, pitch12: null, checks
  };

  const normal: Point = [-unit[1], unit[0]];
  const ridgeCross = dot(zone.ridgeA, normal);
  const projections = footprint.map((point) => dot(point, normal));
  const low = Math.min(...projections), high = Math.max(...projections);
  const runLow = ridgeCross - low, runHigh = high - ridgeCross;
  const centered = Math.abs(runLow - runHigh) <= ROOF_TOLERANCE.centerFt;
  const endpointsInside = pointInPolygon(zone.ridgeA, footprint) && pointInPolygon(zone.ridgeB, footprint);
  const endpointsOnBoundary = pointOnBoundary(zone.ridgeA, footprint) && pointOnBoundary(zone.ridgeB, footprint);
  const edges = footprint.map((point, index) => subtract(footprint[(index + 1) % footprint.length], point));
  const ridgeParallelToZone = edges.some((edge) => {
    const edgeUnit = normalize(edge);
    return edgeUnit ? Math.abs(cross2(unit, edgeUnit)) <= 0.002 : false;
  });
  const ridgeAxis = footprint.map((point) => dot(point, unit));
  const axisLow = Math.min(...ridgeAxis), axisHigh = Math.max(...ridgeAxis);
  const endpointAxis = [dot(zone.ridgeA, unit), dot(zone.ridgeB, unit)].sort((a, b) => a - b);
  const fullRidgeSpan = Math.abs(endpointAxis[0] - axisLow) <= ROOF_TOLERANCE.centerFt
    && Math.abs(endpointAxis[1] - axisHigh) <= ROOF_TOLERANCE.centerFt;
  if (runLow <= ROOF_TOLERANCE.planFt || runHigh <= ROOF_TOLERANCE.planFt) {
    errors.push("ridge must lie inside the roof-zone cross-span");
  }
  if (!centered) {
    errors.push(`centered gable ridge is off center: side runs ${runLow.toFixed(3)} ft / ${runHigh.toFixed(3)} ft`);
  }
  if (!endpointsInside) errors.push("ridge endpoints must lie on or inside the roof-zone footprint");
  if (!endpointsOnBoundary) errors.push("centered-gable ridge endpoints must terminate on the roof-zone boundary");
  if (!ridgeParallelToZone) errors.push("centered-gable ridge must be parallel to a roof-zone edge");
  if (!fullRidgeSpan) errors.push("centered-gable ridge must span the full roof zone between opposite gable ends");

  const runFt = (runLow + runHigh) / 2;
  let ratio: number | null = null, ridgeZFt: number | null = null;

  if (zone.solveBy === "PITCH") {
    ratio = pitchRatio(zone.pitchRise, zone.pitchRun);
    if (!(ratio && ratio > 0)) errors.push("PITCH authority requires positive pitch rise/run");
    else ridgeZFt = (zone.plateZFt as number) + runFt * ratio;
    if (Number.isFinite(zone.ridgeZCheckFt) && ridgeZFt != null
      && Math.abs((zone.ridgeZCheckFt as number) - ridgeZFt) > ROOF_TOLERANCE.zFt) {
      errors.push(`ridgeZ check mismatch: solved ${ridgeZFt.toFixed(3)} ft vs check ${(zone.ridgeZCheckFt as number).toFixed(3)} ft`);
    }
  } else if (zone.solveBy === "RIDGE_Z") {
    if (!Number.isFinite(zone.ridgeZFt) || (zone.ridgeZFt as number) <= (zone.plateZFt as number)) {
      errors.push("RIDGE_Z authority requires ridgeZFt above plateZFt");
    } else {
      ridgeZFt = zone.ridgeZFt as number;
      ratio = (ridgeZFt - (zone.plateZFt as number)) / runFt;
    }
    const check = pitchRatio(zone.pitchCheckRise ?? null, zone.pitchCheckRun ?? null);
    if (check && ratio != null && Math.abs(check - ratio) > ROOF_TOLERANCE.pitchRatio) {
      errors.push(`pitch check mismatch: solved ${pitch12Label(ratio)} vs check ${pitch12Label(check)}`);
    }
  } else {
    errors.push("solveBy must be PITCH or RIDGE_Z");
  }

  checks.push({ id: "roof-zone-rectangle", ok: rectangular.ok, detail: rectangular.detail });
  checks.push({ id: "ridge-centered", ok: centered, detail: `${runLow.toFixed(3)} / ${runHigh.toFixed(3)} ft` });
  checks.push({ id: "ridge-endpoints-in-zone", ok: endpointsInside });
  checks.push({ id: "ridge-endpoints-boundary", ok: endpointsOnBoundary });
  checks.push({ id: "ridge-parallel-zone", ok: ridgeParallelToZone });
  checks.push({ id: "ridge-full-span", ok: fullRidgeSpan });
  checks.push({ id: "vertical-authority", ok: zone.solveBy === "PITCH" || zone.solveBy === "RIDGE_Z", detail: zone.solveBy });

  return {
    zoneId: zone.id,
    status: errors.length ? "INVALID" : "LOCKED",
    authoritative: errors.length === 0,
    errors, footprint,
    plateZFt: zone.plateZFt, ridgeA: zone.ridgeA, ridgeB: zone.ridgeB,
    ridgeZFt, runFt: rounded(runFt), pitchRatio: ratio,
    pitch12: pitch12Label(ratio), checks
  };
}
export type RoofValidation = {
  schemaVersion: typeof ROOF_GEOMETRY_SCHEMA;
  roofId: string;
  ownerId: string;
  status: "NO_MODEL" | "CONCEPT_ONLY" | "ROOF_GEOMETRY_LOCKED" | "FAIL_CLOSED_INVALID";
  authoritative: boolean;
  safe: boolean;
  errors: string[];
  ownerGeometryCurrent: boolean;
  zones: SolvedRoofZone[];
};

export function validateRoofComponent(roof: RoofComponent | null | undefined, owner: PlacementComponent | null | undefined): RoofValidation {
  if (roof && !owner) {
    return {
      schemaVersion: ROOF_GEOMETRY_SCHEMA, roofId: roof.id,
      ownerId: roof.ownerId, status: "FAIL_CLOSED_INVALID",
      authoritative: false, safe: false, errors: ["roof owner placement is missing"], ownerGeometryCurrent: false, zones: []
    };
  }
  if (!roof || !owner) {
    return {
      schemaVersion: ROOF_GEOMETRY_SCHEMA, roofId: roof?.id ?? "none",
      ownerId: roof?.ownerId ?? owner?.id ?? "none", status: "NO_MODEL",
      authoritative: false, safe: true, errors: [], ownerGeometryCurrent: false, zones: []
    };
  }

  const currentKey = ownerGeometryKey(owner);
  const ownerGeometryCurrent = !roof.ownerGeometryKey || roof.ownerGeometryKey === currentKey;
  const zones = roof.zones.map((zone) => solveGableZone(owner, zone));
  const zoneErrors = zones.flatMap((zone) => zone.errors);
  const errors = [...zoneErrors];
  if (roof.status === "LOCKED" && !roof.ownerGeometryKey) errors.push("locked roof is missing ownerGeometryKey");
  if (roof.status === "LOCKED" && !ownerGeometryCurrent) errors.push("owner footprint changed after roof lock");
  if (roof.status === "LOCKED" && !zones.length) errors.push("locked roof requires at least one roof zone");
  if (roof.status === "LOCKED" && zones.some((zone) => !zone.authoritative)) errors.push("all locked roof zones must validate");

  if (roof.status === "LOCKED" && zones.length) {
    const ownerFootprint = placementPolygon(owner);
    const outside = zones.filter((zone) => !polygonContained(zone.footprint, ownerFootprint)).map((zone) => zone.zoneId);
    if (outside.length) errors.push(`roof zone(s) extend outside the owner footprint: ${outside.join(", ")}`);

    const overlaps: string[] = [];
    for (let i = 0; i < zones.length; i += 1) {
      for (let j = i + 1; j < zones.length; j += 1) {
        if (polygonsInteriorOverlap(zones[i].footprint, zones[j].footprint)) overlaps.push(`${zones[i].zoneId} / ${zones[j].zoneId}`);
      }
    }
    if (overlaps.length) errors.push(`roof zones overlap in plan: ${overlaps.join(", ")}`);

    const ownerArea = polygonArea(ownerFootprint);
    const zoneArea = zones.reduce((sum, zone) => sum + polygonArea(zone.footprint), 0);
    const areaDelta = Math.abs(zoneArea - ownerArea);
    if (areaDelta > 0.1) errors.push(`roof-zone coverage differs from owner footprint by ${areaDelta.toFixed(3)} sq ft`);

    if (zones.length > 1 && zones.every((zone) => zone.authoritative)) {
      const adjacency = Array.from({ length: zones.length }, () => new Set<number>());
      for (let i = 0; i < zones.length; i += 1) {
        for (let j = i + 1; j < zones.length; j += 1) {
          const interfaceCheck = zoneInterfaceCheck(zones[i], zones[j]);
          if (!interfaceCheck.adjacent) continue;
          adjacency[i].add(j); adjacency[j].add(i);
          if (!interfaceCheck.continuous) {
            errors.push(`roof-zone interface ${zones[i].zoneId} / ${zones[j].zoneId} is vertically discontinuous${interfaceCheck.maxDeltaFt == null ? "" : ` by ${interfaceCheck.maxDeltaFt.toFixed(3)} ft`}`);
          }
        }
      }
      const seen = new Set<number>([0]), queue = [0];
      while (queue.length) {
        const index = queue.shift() as number;
        for (const neighbor of adjacency[index]) if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
      }
      if (seen.size !== zones.length) errors.push("roof zones do not form one edge-connected roof surface");
    }
  }

  const authoritative = roof.status === "LOCKED" && errors.length === 0 && zones.length > 0;
  return {
    schemaVersion: ROOF_GEOMETRY_SCHEMA, roofId: roof.id, ownerId: owner.id,
    status: errors.length ? "FAIL_CLOSED_INVALID" : authoritative ? "ROOF_GEOMETRY_LOCKED" : "CONCEPT_ONLY",
    authoritative, safe: errors.length === 0, errors, ownerGeometryCurrent, zones
  };
}

export function roofForOwner(components: ReadonlyArray<{ kind: string; ownerId?: string }>, ownerId: string) {
  return components.find((item) => item.kind === "roof" && item.ownerId === ownerId) as RoofComponent | undefined;
}

export function validateCandidateRoofs(components: ReadonlyArray<any>) {
  const placements = components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage");
  const roofs = components.filter((item): item is RoofComponent => item.kind === "roof");
  const byOwner = new Map(placements.map((owner) => [owner.id, owner]));
  const roofsByOwner = new Map<string, RoofComponent[]>();
  for (const roof of roofs) roofsByOwner.set(roof.ownerId, [...(roofsByOwner.get(roof.ownerId) ?? []), roof]);
  const results: RoofValidation[] = [];
  for (const owner of placements) {
    const owned = roofsByOwner.get(owner.id) ?? [];
    if (owned.length <= 1) {
      results.push(validateRoofComponent(owned[0], owner));
      continue;
    }
    for (const roof of owned) {
      results.push({
        schemaVersion: ROOF_GEOMETRY_SCHEMA,
        roofId: roof.id,
        ownerId: owner.id,
        status: "FAIL_CLOSED_INVALID",
        authoritative: false,
        safe: false,
        errors: [`multiple roof components target the same owner: ${owned.map((item) => item.id).join(", ")}`],
        ownerGeometryCurrent: false,
        zones: []
      });
    }
  }
  for (const roof of roofs) if (!byOwner.has(roof.ownerId)) results.push(validateRoofComponent(roof, undefined));
  const locked = results.filter((item) => item.status === "ROOF_GEOMETRY_LOCKED").length;
  const conceptOnly = results.filter((item) => item.status === "CONCEPT_ONLY").length;
  const missing = results.filter((item) => item.status === "NO_MODEL").length;
  const invalid = results.filter((item) => item.status === "FAIL_CLOSED_INVALID").length;
  return {
    schemaVersion: ROOF_GEOMETRY_SCHEMA,
    results,
    requiredOwnerCount: placements.length,
    locked, conceptOnly, missing, invalid,
    safe: results.every((item) => item.safe),
    renderPolicy: invalid > 0 ? "FAIL_CLOSED_INVALID" as const
      : missing > 0 || conceptOnly > 0 ? "CONCEPT_ONLY_REQUIRED" as const
      : placements.length > 0 ? "AUTHORITATIVE_ALLOWED" as const
      : "NO_BUILDING_ROOFS_REQUIRED" as const
  };
}
