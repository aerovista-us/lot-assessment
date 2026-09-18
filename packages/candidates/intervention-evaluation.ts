import { evaluateSweptPath, FULL_SIZE_SUV, vehiclePolygon, type Obstacle } from "@/packages/circulation";
import { pointInPolygon, polygonInside, rectangle, rotatePolygon, type Point, type Polygon } from "@/packages/geometry";
import {
  applyCandidateEvaluation,
  editOpeningComponent,
  editPathPoint,
  editPavementVertex,
  editPlacementComponent
} from "@/packages/candidates/intervention";
import type {
  CandidateEvaluation,
  CandidateRecord,
  GateEvaluation,
  OpeningComponent,
  PathComponent,
  PlacementComponent,
  PolygonComponent,
  StallComponent
} from "@/packages/candidates";

export const INTERVENTION_SCREEN_VERSION = "lotscope-intervention-screen-v1" as const;

export type InterventionScreenResult = {
  evaluation: CandidateEvaluation;
  hardLocalFailures: number;
  watchCount: number;
  screeningScore: number;
};

function placementPolygon(component: PlacementComponent): Point[] {
  const base = component.polygon?.map(([x, y]) => [x, y] as Point)
    ?? rectangle(component.x, component.y, component.widthFt, component.depthFt);
  const rotation = component.rotationDeg ?? 0;
  if (!rotation || component.polygon) return base;
  const center: Point = [component.x + component.widthFt / 2, component.y + component.depthFt / 2];
  return rotatePolygon(base, center, rotation * Math.PI / 180);
}
function placementComponents(candidate: CandidateRecord) {
  return candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage");
}

function parcelPolygon(candidate: CandidateRecord): Polygon | null {
  const parcel = candidate.components.find((item): item is PolygonComponent => item.kind === "parcel");
  return parcel?.polygon ?? null;
}

function principalEnvelope(candidate: CandidateRecord): Polygon | null {
  const envelope = candidate.components.find((item): item is PolygonComponent => item.kind === "envelope");
  return envelope?.polygon ?? null;
}

function obstacleList(candidate: CandidateRecord, garageId?: string): Obstacle[] {
  return placementComponents(candidate)
    .filter((item) => item.id !== garageId)
    .map((item) => ({ id: item.id, label: item.label, polygon: placementPolygon(item) }));
}

function cross(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(point: Point, a: Point, b: Point, epsilon = 1e-9) {
  return point[0] >= Math.min(a[0], b[0]) - epsilon && point[0] <= Math.max(a[0], b[0]) + epsilon &&
    point[1] >= Math.min(a[1], b[1]) - epsilon && point[1] <= Math.max(a[1], b[1]) + epsilon;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const epsilon = 1e-9;
  const abC = cross(a, b, c), abD = cross(a, b, d);
  const cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (Math.abs(abC) <= epsilon && onSegment(c, a, b, epsilon)) return true;
  if (Math.abs(abD) <= epsilon && onSegment(d, a, b, epsilon)) return true;
  if (Math.abs(cdA) <= epsilon && onSegment(a, c, d, epsilon)) return true;
  if (Math.abs(cdB) <= epsilon && onSegment(b, c, d, epsilon)) return true;
  return Math.sign(abC) !== Math.sign(abD) && Math.sign(cdA) !== Math.sign(cdB);
}

function polygonsOverlap(a: Polygon, b: Polygon) {
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
    }
  }
  return pointInPolygon(a[0], b, 0.001) || pointInPolygon(b[0], a, 0.001);
}

function structureOverlapGate(candidate: CandidateRecord): GateEvaluation {
  const placements = placementComponents(candidate);
  const conflicts: string[] = [];
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i], b = placements[j];
      if (a.kind === "home" && b.kind === "home") continue;
      if (polygonsOverlap(placementPolygon(a), placementPolygon(b))) conflicts.push(`${a.label} / ${b.label}`);
    }
  }
  return {
    id: "intervention-structure",
    label: "Structure overlap screen",
    status: conflicts.length ? "FAIL" : "PASS",
    summary: conflicts.length ? `Overlapping modeled footprints: ${conflicts.join(", ")}.` : "No garage/structure footprint overlaps are detected in the edited geometry.",
    blockerClass: "geometry",
    repairClasses: conflicts.length ? ["translate-building", "translate-garage", "rotate-garage"] : undefined
  };
}
function containmentGates(candidate: CandidateRecord): GateEvaluation[] {
  const parcel = parcelPolygon(candidate);
  const envelope = principalEnvelope(candidate);
  const placements = placementComponents(candidate);
  const outsideParcel = !parcel ? placements.map((item) => item.label) : placements.filter((item) => !polygonInside(placementPolygon(item), parcel, 0.08)).map((item) => item.label);
  const homesOutsideEnvelope = !envelope ? placements.filter((item) => item.kind === "home").map((item) => item.label) : placements.filter((item) => item.kind === "home" && !polygonInside(placementPolygon(item), envelope, 0.08)).map((item) => item.label);
  return [
    {
      id: "parcel",
      label: "Parcel containment",
      status: outsideParcel.length ? "FAIL" : "PASS",
      summary: outsideParcel.length ? `Outside modeled parcel: ${outsideParcel.join(", ")}.` : "Edited homes and garages remain inside the modeled parcel.",
      blockerClass: "parcel"
    },
    {
      id: "intervention-principal-envelope",
      label: "Principal-building envelope",
      status: homesOutsideEnvelope.length ? "FAIL" : "PASS",
      summary: homesOutsideEnvelope.length ? `Residential mass outside the principal envelope: ${homesOutsideEnvelope.join(", ")}.` : "Residential mass remains inside the principal-building envelope.",
      blockerClass: "geometry",
      repairClasses: homesOutsideEnvelope.length ? ["translate-building", "reproportion-building"] : undefined
    }
  ];
}
function programAndParkingGates(candidate: CandidateRecord): GateEvaluation[] {
  const homes = candidate.components.filter((item) => item.kind === "home");
  const garages = candidate.components.filter((item): item is PlacementComponent => item.kind === "garage");
  const stalls = candidate.components.filter((item): item is StallComponent => item.kind === "stall");
  const programPass = homes.length >= 2 && garages.length >= 2 && stalls.length >= 4;
  const garageById = new Map(garages.map((garage) => [garage.id, garage]));
  const outside: string[] = [];
  for (const stall of stalls) {
    const garage = garageById.get(stall.garageId);
    if (!garage) {
      outside.push(`${stall.label} (garage missing)`);
      continue;
    }
    const body = vehiclePolygon(FULL_SIZE_SUV, stall.axleX, stall.axleY, stall.headingDeg * Math.PI / 180);
    if (!polygonInside(body, placementPolygon(garage), 0.18)) outside.push(stall.label);
  }
  return [
    {
      id: "program",
      label: "Program preservation",
      status: programPass ? "WATCH" : "FAIL",
      summary: programPass ? "Two homes, two garages and at least four modeled stalls remain present. Conditioned-area and room-packing capacity are not rerun by this screening layer." : `Program count changed: ${homes.length} homes, ${garages.length} garages, ${stalls.length} stalls.`,
      blockerClass: "program"
    },
    {
      id: "intervention-parking",
      label: "Enclosed parked-body screen",
      status: outside.length ? "FAIL" : "PASS",
      summary: outside.length ? `Full design vehicle is not enclosed at: ${outside.join(", ")}.` : "All modeled final stall poses enclose the full design vehicle.",
      blockerClass: "geometry",
      repairClasses: outside.length ? ["resize-garage", "translate-garage", "adjust-rotation"] : undefined
    }
  ];
}
function openingGate(candidate: CandidateRecord): GateEvaluation {
  const placements = new Map(placementComponents(candidate).map((item) => [item.id, item]));
  const openings = candidate.components.filter((item): item is OpeningComponent => item.kind === "opening");
  const invalid: string[] = [];
  for (const opening of openings) {
    const owner = placements.get(opening.ownerId);
    if (!owner) {
      invalid.push(`${opening.label} (owner missing)`);
      continue;
    }
    const wallLength = opening.wall === "east" || opening.wall === "west" ? owner.depthFt : owner.widthFt;
    if (opening.offsetFt < 0 || opening.openingWidthFt <= 0 || opening.offsetFt + opening.openingWidthFt > wallLength + 0.02) invalid.push(opening.label);
  }
  return {
    id: "intervention-opening",
    label: "Garage opening geometry",
    status: invalid.length ? "FAIL" : "PASS",
    summary: invalid.length ? `Opening geometry exceeds its modeled wall: ${invalid.join(", ")}.` : "Modeled garage openings fit their owning garage walls.",
    blockerClass: "clearance",
    repairClasses: invalid.length ? ["edit-opening", "resize-garage"] : undefined
  };
}

function routeGate(candidate: CandidateRecord): GateEvaluation {
  const parcel = parcelPolygon(candidate);
  const paths = candidate.components.filter((item): item is PathComponent => item.kind === "driveway" || item.kind === "route");
  if (!parcel || !paths.length) return { id: "intervention-route-screen", label: "Route-hint sweep", status: "WATCH", summary: "No editable route hint is available for the screening sweep.", blockerClass: "circulation", repairClasses: ["reshape-drive"] };
  const issues: string[] = [];
  let targetedFailure = false;
  let untargetedWatch = false;
  let minClearance: number | null = null;
  for (const path of paths) {
    const result = evaluateSweptPath({
      parcel,
      path: path.points,
      obstacles: obstacleList(candidate, path.garageId),
      vehicle: FULL_SIZE_SUV,
      allowOutside: ([x]) => x >= 147.8
    });
    if (result.minimumBoundaryClearanceFt != null) minClearance = minClearance == null ? result.minimumBoundaryClearanceFt : Math.min(minClearance, result.minimumBoundaryClearanceFt);
    if (!result.pass) {
      const detail = [
        result.offParcelCount ? `${result.offParcelCount} off-parcel body samples` : null,
        result.collisions.length ? `collisions: ${result.collisions.join(", ")}` : null,
        result.pathIssues.length ? `${result.pathIssues.length} path issue(s)` : null
      ].filter(Boolean).join("; ");
      issues.push(`${path.label}: ${detail || "screening sweep failed"}`);
      if (path.garageId) targetedFailure = true;
      else untargetedWatch = true;
    }
  }
  const status = targetedFailure ? "FAIL" : untargetedWatch ? "WATCH" : "PASS";
  return {
    id: "intervention-route-screen",
    label: "Route-hint full-body sweep",
    status,
    summary: issues.length ? `${issues.join(" ")} Untargeted route hints remain screening evidence only.` : "Current route hints clear the generic full-body parcel/obstacle/25-ft-radius screening pass.",
    blockerClass: "circulation",
    repairClasses: status === "PASS" ? undefined : ["reshape-drive", "local-pavement-flare", "translate-garage", "rotate-garage"],
    metrics: { minimumBoundaryClearanceFt: minClearance }
  };
}
export function evaluateInterventionCandidate(candidate: CandidateRecord, rulesVersion: string, createdAt = new Date().toISOString(), suffix = "exact"): InterventionScreenResult {
  const gates: GateEvaluation[] = [
    ...containmentGates(candidate),
    structureOverlapGate(candidate),
    ...programAndParkingGates(candidate),
    openingGate(candidate),
    routeGate(candidate),
    {
      id: "authoritative-outbound",
      label: "Independent outbound circulation",
      status: "FAIL",
      summary: "Intervention Editor screening does not run the independent stall-to-Pennsylvania outbound planner. This hard gate remains open until the authoritative circulation pipeline proves it.",
      blockerClass: "circulation",
      repairClasses: ["reshape-drive", "local-pavement-flare", "translate-garage", "rotate-garage"],
      metrics: { authoritativeProof: false }
    },
    {
      id: "accessory-review",
      label: "Accessory / rotated-garage review",
      status: "PROFESSIONAL_REVIEW",
      summary: "Accessory-envelope, close-separation, fire/eave/drainage and permit-level interpretation remain professional/AHJ checks.",
      blockerClass: "setback",
      repairClasses: ["translate-garage", "adjust-rotation"]
    }
  ];
  const hardLocalFailures = gates.filter((gate) => gate.status === "FAIL" && gate.id !== "authoritative-outbound").length;
  const watchCount = gates.filter((gate) => gate.status === "WATCH" || gate.status === "PROFESSIONAL_REVIEW").length;
  const fundamentalFail = gates.some((gate) => gate.status === "FAIL" && (gate.blockerClass === "parcel" || gate.blockerClass === "program"));
  const screeningScore = Math.max(0, 100 - hardLocalFailures * 25 - watchCount * 4);
  const token = createdAt.replace(/[-:.TZ]/g, "").slice(0, 17);
  const evaluation: CandidateEvaluation = {
    id: `eval-${candidate.id}-intervention-${token}-${suffix}`,
    candidateId: candidate.id,
    createdAt,
    engineVersion: INTERVENTION_SCREEN_VERSION,
    rulesVersion,
    schemaVersion: INTERVENTION_SCREEN_VERSION,
    status: fundamentalFail ? "FAIL" : "PARTIAL_FAIL",
    promotionReady: false,
    score: screeningScore,
    gates,
    summary: fundamentalFail
      ? "Edited geometry fails a fundamental parcel/program screening gate; authoritative outbound proof also remains open."
      : hardLocalFailures
        ? `${hardLocalFailures} local screening blocker(s) remain; authoritative outbound proof also remains open.`
        : "Local intervention screening is clear or watch-only, but authoritative independent outbound proof remains open."
  };
  return { evaluation, hardLocalFailures, watchCount, screeningScore };
}

export type InterventionSuggestion = {
  id: string;
  label: string;
  summary: string;
  screeningScore: number;
  candidate: CandidateRecord;
};
function componentFingerprint(candidate: CandidateRecord, componentId: string) {
  return JSON.stringify(candidate.components.find((component) => component.id === componentId) ?? null);
}

export function exploreInterventionNeighborhood(
  candidate: CandidateRecord,
  componentId: string,
  rulesVersion: string,
  createdAt = new Date().toISOString()
): InterventionSuggestion[] {
  const target = candidate.components.find((component) => component.id === componentId);
  if (!target || target.locked) return [];
  const variants: CandidateRecord[] = [];
  const add = (variant: CandidateRecord) => {
    const fingerprint = componentFingerprint(variant, componentId);
    if (fingerprint === componentFingerprint(candidate, componentId)) return;
    if (!variants.some((item) => componentFingerprint(item, componentId) === fingerprint)) variants.push(variant);
  };

  if (target.kind === "home" || target.kind === "garage") {
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
      add(editPlacementComponent(candidate, componentId, { x: target.x + dx, y: target.y + dy }, createdAt));
    }
    if (target.kind === "garage") {
      for (const delta of [-10, -5, 5, 10]) {
        add(editPlacementComponent(candidate, componentId, { rotationDeg: (target.rotationDeg ?? 0) + delta }, createdAt));
      }
    }
    if (target.kind === "home" && target.resizable) {
      for (const delta of [-2, 2]) {
        add(editPlacementComponent(candidate, componentId, { widthFt: Math.max(1, target.widthFt + delta) }, createdAt));
        add(editPlacementComponent(candidate, componentId, { depthFt: Math.max(1, target.depthFt + delta) }, createdAt));
      }
    }
  }

  if (target.kind === "driveway" || target.kind === "route") {
    const movable = target.movableControlPoints?.length ? target.movableControlPoints : target.points.map((_, index) => index);
    for (const pointIndex of movable) {
      const point = target.points[pointIndex];
      if (!point) continue;
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) {
        add(editPathPoint(candidate, componentId, pointIndex, [point[0] + dx, point[1] + dy], createdAt));
      }
    }
  }
  if (target.kind === "pavement") {
    for (let vertexIndex = 0; vertexIndex < target.polygon.length; vertexIndex += 1) {
      const point = target.polygon[vertexIndex];
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
        add(editPavementVertex(candidate, componentId, vertexIndex, [point[0] + dx, point[1] + dy], createdAt));
      }
    }
  }

  if (target.kind === "opening") {
    for (const delta of [-1, 1]) {
      add(editOpeningComponent(candidate, componentId, { openingWidthFt: Math.max(1, target.openingWidthFt + delta) }, createdAt));
      add(editOpeningComponent(candidate, componentId, { offsetFt: Math.max(0, target.offsetFt + delta) }, createdAt));
    }
  }

  return variants.slice(0, 48).map((variant, index) => {
    const screen = evaluateInterventionCandidate(variant, rulesVersion, createdAt, `explore-${index + 1}`);
    const evaluated = applyCandidateEvaluation(variant, screen.evaluation, createdAt);
    return {
      id: `${componentId}-option-${index + 1}`,
      label: `${target.label} option ${index + 1}`,
      summary: `${screen.hardLocalFailures} local hard blocker(s), ${screen.watchCount} watch/review gate(s). Authoritative outbound remains open.`,
      screeningScore: screen.screeningScore,
      candidate: evaluated
    };
  }).sort((a, b) => b.screeningScore - a.screeningScore).slice(0, 5);
}
