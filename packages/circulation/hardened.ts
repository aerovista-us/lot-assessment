import {
  type Point,
  type Polygon,
  distancePointToSegment,
  distanceToPolygonBoundary,
  pointInPolygon,
  polygonsIntersect,
  rectangle
} from "@/packages/geometry";
import { FULL_SIZE_SUV, type Obstacle, type VehicleSpec, vehiclePolygon } from "@/packages/circulation";

export type Gear = -1 | 0 | 1;

export type MotionPose = {
  x: number;
  y: number;
  headingRad: number;
  gear?: Gear;
};

export type GarageOpening = {
  garage: { x: number; y: number; widthFt: number; depthFt: number };
  wall: "east" | "west" | "north" | "south";
  openingStartFt: number;
  openingEndFt: number;
  hardClearanceFt?: number;
  comfortableClearanceFt?: number;
};

export type HardenedMobilityStatus = "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL";

export type HardenedMobilityResult = {
  pass: boolean;
  status: HardenedMobilityStatus;
  sampledPoses: MotionPose[];
  sampleCount: number;
  gearChanges: number;
  offParcelSamples: number;
  collisions: string[];
  pavementViolationSamples: number;
  minimumBoundaryClearanceFt: number | null;
  minimumObstacleClearanceFt: number | null;
  minimumTurningRadiusFt: number | null;
  turningRadiusPass: boolean;
  doorClearanceFt: number | null;
  doorPass: boolean;
  finalParkedPass: boolean | null;
  reverseReplayPass: boolean;
  warnings: string[];
  failures: string[];
};

function wrap(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function interpolatePose(a: MotionPose, b: MotionPose, t: number): MotionPose {
  const deltaHeading = wrap(b.headingRad - a.headingRad);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    headingRad: a.headingRad + deltaHeading * t,
    gear: a.gear ?? b.gear ?? 0
  };
}

/**
 * Densifies explicit solver/planner poses so the evidence audit is not dependent
 * on the planner's internal primitive sampling density.
 */
export function interpolateMotionPoses(poses: readonly MotionPose[], maxStepFt = 0.25): MotionPose[] {
  if (poses.length <= 1) return poses.map((pose) => ({ ...pose }));
  const out: MotionPose[] = [];
  for (let i = 0; i < poses.length - 1; i += 1) {
    const a = poses[i];
    const b = poses[i + 1];
    const travel = Math.hypot(b.x - a.x, b.y - a.y);
    const headingTravel = Math.abs(wrap(b.headingRad - a.headingRad));
    // Heading-only transitions deserve samples too; 2° is a useful independent audit resolution.
    const steps = Math.max(1, Math.ceil(travel / maxStepFt), Math.ceil(headingTravel / (2 * Math.PI / 180)));
    for (let step = 0; step < steps; step += 1) out.push(interpolatePose(a, b, step / steps));
  }
  out.push({ ...poses[poses.length - 1] });
  return out;
}

function polygonBoundaryDistance(a: Polygon, b: Polygon): number {
  if (polygonsIntersect(a, b)) return 0;
  let minimum = Infinity;
  for (const point of a) {
    for (let i = 0; i < b.length; i += 1) {
      minimum = Math.min(minimum, distancePointToSegment(point, b[i], b[(i + 1) % b.length]));
    }
  }
  for (const point of b) {
    for (let i = 0; i < a.length; i += 1) {
      minimum = Math.min(minimum, distancePointToSegment(point, a[i], a[(i + 1) % a.length]));
    }
  }
  return Number.isFinite(minimum) ? minimum : Infinity;
}

function bodyInsideAny(body: Polygon, zones: readonly Polygon[], epsilon = 0.08): boolean {
  return body.every((corner) => zones.some((zone) => pointInPolygon(corner, zone, epsilon)));
}

function lineIntersections(body: Polygon, axis: "x" | "y", value: number): number[] {
  const intersections: number[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const a = body[i];
    const b = body[(i + 1) % body.length];
    const av = axis === "x" ? a[0] : a[1];
    const bv = axis === "x" ? b[0] : b[1];
    const da = av - value;
    const db = bv - value;
    if (Math.abs(da) < 1e-9) intersections.push(axis === "x" ? a[1] : a[0]);
    if (da * db > 0 || Math.abs(av - bv) < 1e-9) continue;
    const t = (value - av) / (bv - av);
    if (t < -1e-9 || t > 1 + 1e-9) continue;
    const orth = axis === "x" ? a[1] + (b[1] - a[1]) * t : a[0] + (b[0] - a[0]) * t;
    intersections.push(orth);
  }
  return intersections;
}

/** Returns null while the body is not crossing the target garage wall. */
export function garageOpeningClearance(body: Polygon, opening: GarageOpening): number | null {
  const g = opening.garage;
  const vertical = opening.wall === "east" || opening.wall === "west";
  const axis: "x" | "y" = vertical ? "x" : "y";
  const wallCoordinate = opening.wall === "east"
    ? g.x + g.widthFt
    : opening.wall === "west"
      ? g.x
      : opening.wall === "north"
        ? g.y
        : g.y + g.depthFt;
  const intersections = lineIntersections(body, axis, wallCoordinate);
  if (intersections.length < 2) return null;
  const low = Math.min(...intersections);
  const high = Math.max(...intersections);
  return Math.min(low - opening.openingStartFt, opening.openingEndFt - high);
}

function minimumRadius(poses: readonly MotionPose[]): number | null {
  let minimum = Infinity;
  for (let i = 0; i < poses.length - 1; i += 1) {
    const a = poses[i];
    const b = poses[i + 1];
    const ds = Math.hypot(b.x - a.x, b.y - a.y);
    const dHeading = Math.abs(wrap(b.headingRad - a.headingRad));
    if (ds < 0.02 || dHeading < 0.001) continue;
    // Chord/angle relationship is more stable than ds/dTheta for larger samples.
    const radius = ds / (2 * Math.sin(Math.min(dHeading, Math.PI - 1e-6) / 2));
    if (Number.isFinite(radius)) minimum = Math.min(minimum, radius);
  }
  return Number.isFinite(minimum) ? minimum : null;
}

function countGearChanges(poses: readonly MotionPose[]): number {
  let changes = 0;
  let previous: Gear | null = null;
  for (const pose of poses) {
    const gear = pose.gear ?? 0;
    if (gear === 0) continue;
    if (previous != null && gear !== previous) changes += 1;
    previous = gear;
  }
  return changes;
}

function staticAudit(args: {
  parcel: Polygon;
  poses: readonly MotionPose[];
  vehicle: VehicleSpec;
  obstacles: readonly Obstacle[];
  pavementZones: readonly Polygon[];
  allowedNonPavementZones: readonly Polygon[];
  allowOutside?: (point: Point) => boolean;
  garageOpening?: GarageOpening;
}) {
  let offParcelSamples = 0;
  let pavementViolationSamples = 0;
  let minimumBoundary = Infinity;
  let minimumObstacle = Infinity;
  let minimumDoor = Infinity;
  const collisionLabels = new Set<string>();

  for (const pose of args.poses) {
    const body = vehiclePolygon(args.vehicle, pose.x, pose.y, pose.headingRad);
    let completeBodyInParcel = true;
    for (const corner of body) {
      if (args.allowOutside?.(corner)) {
        completeBodyInParcel = false;
        continue;
      }
      if (!pointInPolygon(corner, args.parcel, 0.12)) {
        offParcelSamples += 1;
        completeBodyInParcel = false;
      }
    }

    if (completeBodyInParcel) {
      for (const corner of body) minimumBoundary = Math.min(minimumBoundary, distanceToPolygonBoundary(corner, args.parcel));
      if (args.pavementZones.length && !bodyInsideAny(body, [...args.pavementZones, ...args.allowedNonPavementZones], 0.12)) pavementViolationSamples += 1;
    }

    for (const obstacle of args.obstacles) {
      if (polygonsIntersect(body, obstacle.polygon)) collisionLabels.add(obstacle.label);
      minimumObstacle = Math.min(minimumObstacle, polygonBoundaryDistance(body, obstacle.polygon));
    }

    if (args.garageOpening) {
      const door = garageOpeningClearance(body, args.garageOpening);
      if (door != null) minimumDoor = Math.min(minimumDoor, door);
    }
  }

  return {
    offParcelSamples,
    pavementViolationSamples,
    collisions: [...collisionLabels],
    minimumBoundaryClearanceFt: Number.isFinite(minimumBoundary) ? minimumBoundary : null,
    minimumObstacleClearanceFt: Number.isFinite(minimumObstacle) ? minimumObstacle : null,
    doorClearanceFt: Number.isFinite(minimumDoor) ? minimumDoor : null
  };
}

export function auditMotionPath(args: {
  parcel: Polygon;
  poses: readonly MotionPose[];
  vehicle?: VehicleSpec;
  obstacles?: readonly Obstacle[];
  parkedVehiclePolygons?: readonly { label: string; polygon: Polygon }[];
  pavementZones?: readonly Polygon[];
  allowedNonPavementZones?: readonly Polygon[];
  allowOutside?: (point: Point) => boolean;
  garageOpening?: GarageOpening;
  preferredClearanceFt?: number;
  maximumComfortableGearChanges?: number;
  maxInterpolationStepFt?: number;
  turningRadiusToleranceFt?: number;
  requireFinalParkedInGarage?: boolean;
}): HardenedMobilityResult {
  const vehicle = args.vehicle ?? FULL_SIZE_SUV;
  const sampledPoses = interpolateMotionPoses(args.poses, args.maxInterpolationStepFt ?? 0.25);
  const obstacles: Obstacle[] = [
    ...(args.obstacles ?? []),
    ...(args.parkedVehiclePolygons ?? []).map((item) => ({ label: item.label, polygon: item.polygon }))
  ];
  const staticResult = staticAudit({
    parcel: args.parcel,
    poses: sampledPoses,
    vehicle,
    obstacles,
    pavementZones: args.pavementZones ?? [],
    allowedNonPavementZones: args.allowedNonPavementZones ?? [],
    allowOutside: args.allowOutside,
    garageOpening: args.garageOpening
  });

  const measuredRadius = minimumRadius(sampledPoses);
  const radiusPass = measuredRadius == null || measuredRadius + (args.turningRadiusToleranceFt ?? 0.35) >= vehicle.minRearAxleRadiusFt;
  const gearChanges = countGearChanges(args.poses);
  const preferredClearance = args.preferredClearanceFt ?? 1;
  const minimumFixed = Math.min(
    staticResult.minimumBoundaryClearanceFt ?? Infinity,
    staticResult.minimumObstacleClearanceFt ?? Infinity
  );
  const finalBody = sampledPoses.length ? vehiclePolygon(vehicle, sampledPoses[sampledPoses.length - 1].x, sampledPoses[sampledPoses.length - 1].y, sampledPoses[sampledPoses.length - 1].headingRad) : null;
  const garagePoly = args.garageOpening ? rectangle(args.garageOpening.garage.x, args.garageOpening.garage.y, args.garageOpening.garage.widthFt, args.garageOpening.garage.depthFt) : null;
  const finalParkedPass = args.requireFinalParkedInGarage
    ? Boolean(finalBody && garagePoly && finalBody.every((point) => pointInPolygon(point, garagePoly, 0.08)))
    : null;

  const hardDoor = args.garageOpening?.hardClearanceFt ?? 0;
  const comfortableDoor = args.garageOpening?.comfortableClearanceFt ?? 0.75;
  const doorPass = staticResult.doorClearanceFt == null || staticResult.doorClearanceFt >= hardDoor;
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!args.poses.length) failures.push("No motion poses were supplied.");
  if (staticResult.offParcelSamples > 0) failures.push(`${staticResult.offParcelSamples} sampled body positions leave the parcel outside an allowed street transition.`);
  if (staticResult.collisions.length) failures.push(`Vehicle body collides with: ${staticResult.collisions.join(", ")}.`);
  if (staticResult.pavementViolationSamples > 0) failures.push(`${staticResult.pavementViolationSamples} sampled body positions leave the modeled pavement / allowed maneuver zones.`);
  if (!radiusPass) failures.push(`Independent curvature audit measures ${measuredRadius?.toFixed(2)} ft minimum radius below the ${vehicle.minRearAxleRadiusFt.toFixed(2)} ft vehicle requirement.`);
  if (!doorPass) failures.push(`Garage-door crossing clearance ${staticResult.doorClearanceFt?.toFixed(3)} ft is below the hard ${hardDoor.toFixed(2)} ft threshold.`);
  if (finalParkedPass === false) failures.push("Final full vehicle body is not enclosed by the target garage polygon.");

  if (Number.isFinite(minimumFixed) && minimumFixed < preferredClearance) warnings.push(`Minimum fixed-obstruction/boundary clearance is ${minimumFixed.toFixed(2)} ft, below the preferred ${preferredClearance.toFixed(2)} ft.`);
  if (staticResult.doorClearanceFt != null && staticResult.doorClearanceFt < comfortableDoor) warnings.push(`Garage-door crossing margin is ${staticResult.doorClearanceFt.toFixed(3)} ft, below the ${comfortableDoor.toFixed(2)} ft practical comfort target.`);
  const comfortableGears = args.maximumComfortableGearChanges ?? 2;
  if (gearChanges > comfortableGears) warnings.push(`Path uses ${gearChanges} gear changes; practical-use target is ${comfortableGears} or fewer.`);

  // Exact reverse replay has identical body envelopes in reverse order. We still rerun
  // the independent static audit so future direction-sensitive rules have one place to land.
  const reversePoses = [...sampledPoses].reverse().map((pose) => ({ ...pose, gear: pose.gear === 1 ? -1 : pose.gear === -1 ? 1 : pose.gear } as MotionPose));
  const reverseResult = staticAudit({
    parcel: args.parcel,
    poses: reversePoses,
    vehicle,
    obstacles,
    pavementZones: args.pavementZones ?? [],
    allowedNonPavementZones: args.allowedNonPavementZones ?? [],
    allowOutside: args.allowOutside,
    garageOpening: args.garageOpening
  });
  const reverseReplayPass = reverseResult.offParcelSamples === 0 && reverseResult.collisions.length === 0 && reverseResult.pavementViolationSamples === 0 && (reverseResult.doorClearanceFt == null || reverseResult.doorClearanceFt >= hardDoor);
  if (!reverseReplayPass) failures.push("Reverse-outbound replay fails one or more static body-envelope gates.");

  const pass = failures.length === 0;
  let status: HardenedMobilityStatus = "PASS";
  if (!pass) status = "FAIL";
  else if (warnings.length) status = "WATCH";
  else if (Number.isFinite(minimumFixed) && minimumFixed < preferredClearance + 0.25) status = "PASS_TIGHT";

  return {
    pass,
    status,
    sampledPoses,
    sampleCount: sampledPoses.length,
    gearChanges,
    offParcelSamples: staticResult.offParcelSamples,
    collisions: staticResult.collisions,
    pavementViolationSamples: staticResult.pavementViolationSamples,
    minimumBoundaryClearanceFt: staticResult.minimumBoundaryClearanceFt,
    minimumObstacleClearanceFt: staticResult.minimumObstacleClearanceFt,
    minimumTurningRadiusFt: measuredRadius,
    turningRadiusPass: radiusPass,
    doorClearanceFt: staticResult.doorClearanceFt,
    doorPass,
    finalParkedPass,
    reverseReplayPass,
    warnings,
    failures
  };
}
