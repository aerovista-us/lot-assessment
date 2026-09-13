import { FULL_SIZE_SUV, filletPath, type Obstacle, type VehicleSpec } from "@/packages/circulation";
import { auditMotionPath, type GarageOpening, type HardenedMobilityResult, type MotionPose } from "@/packages/circulation/hardened";
import { rectangle, type Point, type Polygon } from "@/packages/geometry";
import { placementPolygon, type AxisAlignedPlacement, type DrivePath, type PlacementCandidate, type PlacementProblem } from "@/packages/placement";

export type CandidateDriveMobilityAudit = {
  driveId: string;
  garageId: string | null;
  hardPass: boolean;
  promotionReady: boolean;
  status: "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL";
  generatedDoor: {
    wall: GarageOpening["wall"];
    openingWidthFt: number;
    sidePierFt: number;
    source: "GENERATED_PLANNING_GEOMETRY";
  } | null;
  targetGarage: { widthFt: number; depthFt: number } | null;
  pathIssues: string[];
  warnings: string[];
  failures: string[];
  result: HardenedMobilityResult | null;
};

export type CandidateMobilityAudit = {
  schemaVersion: "lotscope-candidate-mobility-v1";
  pass: boolean;
  promotionReady: boolean;
  status: "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL";
  driveWidthFt: number;
  turningPavementWidthFt: number;
  pavementModel: "CENTERLINE_CORRIDOR_V1" | "CURVATURE_AWARE_FLARE_V2";
  doorModel: "CENTERED_OPENING_WITH_1FT_PIERS";
  drives: CandidateDriveMobilityAudit[];
  warnings: string[];
  failures: string[];
};

const GENERATED_DOOR_PIER_FT = 1;
const HARD_DOOR_CLEARANCE_FT = 0.25;
const COMFORTABLE_DOOR_CLEARANCE_FT = 0.75;
const PREFERRED_FIXED_CLEARANCE_FT = 1;
const TURN_PAVEMENT_COMFORT_FT = 0.75;

function homeResidualObstacles(home: AxisAlignedPlacement, garage: AxisAlignedPlacement): Obstacle[] {
  const hx1 = home.x;
  const hy1 = home.y;
  const hx2 = home.x + home.widthFt;
  const hy2 = home.y + home.depthFt;
  const gx1 = garage.x;
  const gy1 = garage.y;
  const gx2 = garage.x + garage.widthFt;
  const gy2 = garage.y + garage.depthFt;
  const ix1 = Math.max(hx1, gx1);
  const iy1 = Math.max(hy1, gy1);
  const ix2 = Math.min(hx2, gx2);
  const iy2 = Math.min(hy2, gy2);

  if (ix2 <= ix1 || iy2 <= iy1) return [{ id: home.id, label: home.id, polygon: placementPolygon(home) }];

  return [
    { id: "west", x: hx1, y: hy1, w: ix1 - hx1, d: home.depthFt },
    { id: "east", x: ix2, y: hy1, w: hx2 - ix2, d: home.depthFt },
    { id: "north", x: ix1, y: hy1, w: ix2 - ix1, d: iy1 - hy1 },
    { id: "south", x: ix1, y: iy2, w: ix2 - ix1, d: hy2 - iy2 }
  ]
    .filter((piece) => piece.w > 0.05 && piece.d > 0.05)
    .map((piece) => ({ id: `${home.id}:${piece.id}`, label: home.id, polygon: rectangle(piece.x, piece.y, piece.w, piece.d) }));
}

function obstaclesForDrive(candidate: PlacementCandidate, garageId?: string): Obstacle[] {
  const targetGarage = garageId ? candidate.placements.find((item) => item.id === garageId) : undefined;
  const obstacles: Obstacle[] = [];

  for (const item of candidate.placements) {
    if (item.id === garageId) continue;
    if (item.kind === "home") {
      if (targetGarage?.integrationGroupId && item.integrationGroupId === targetGarage.integrationGroupId) obstacles.push(...homeResidualObstacles(item, targetGarage));
      else obstacles.push({ id: item.id, label: item.id, polygon: placementPolygon(item) });
      continue;
    }
    if (item.circulationObstacle === false) continue;
    if (targetGarage?.integrationGroupId && item.integrationGroupId === targetGarage.integrationGroupId) continue;
    obstacles.push({ id: item.id, label: item.id, polygon: placementPolygon(item) });
  }

  return obstacles;
}

function distanceOutside(value: number, low: number, high: number) {
  if (value < low) return low - value;
  if (value > high) return value - high;
  return 0;
}

function inferEntryWall(garage: AxisAlignedPlacement, point: Point): GarageOpening["wall"] {
  const west = Math.abs(point[0] - garage.x) + distanceOutside(point[1], garage.y, garage.y + garage.depthFt);
  const east = Math.abs(point[0] - (garage.x + garage.widthFt)) + distanceOutside(point[1], garage.y, garage.y + garage.depthFt);
  const north = Math.abs(point[1] - garage.y) + distanceOutside(point[0], garage.x, garage.x + garage.widthFt);
  const south = Math.abs(point[1] - (garage.y + garage.depthFt)) + distanceOutside(point[0], garage.x, garage.x + garage.widthFt);
  const choices: Array<[GarageOpening["wall"], number]> = [["west", west], ["east", east], ["north", north], ["south", south]];
  return choices.sort((a, b) => a[1] - b[1])[0][0];
}

function generatedOpening(garage: AxisAlignedPlacement, wall: GarageOpening["wall"]): GarageOpening | null {
  const crossDimension = wall === "east" || wall === "west" ? garage.depthFt : garage.widthFt;
  const openingWidth = crossDimension - GENERATED_DOOR_PIER_FT * 2;
  if (openingWidth <= 0) return null;
  const openingStart = (wall === "east" || wall === "west" ? garage.y : garage.x) + GENERATED_DOOR_PIER_FT;
  return {
    garage: { x: garage.x, y: garage.y, widthFt: garage.widthFt, depthFt: garage.depthFt },
    wall,
    openingStartFt: openingStart,
    openingEndFt: openingStart + openingWidth,
    hardClearanceFt: HARD_DOOR_CLEARANCE_FT,
    comfortableClearanceFt: COMFORTABLE_DOOR_CLEARANCE_FT
  };
}

function parkedRearAxlePose(garage: AxisAlignedPlacement, wall: GarageOpening["wall"], vehicle: VehicleSpec): MotionPose | null {
  const longitudinal = wall === "east" || wall === "west" ? garage.widthFt : garage.depthFt;
  const cross = wall === "east" || wall === "west" ? garage.depthFt : garage.widthFt;
  const longResidual = longitudinal - vehicle.lengthFt;
  const crossResidual = cross - vehicle.widthFt;
  if (longResidual < -0.02 || crossResidual < -0.02) return null;

  const endClearance = Math.max(0, longResidual / 2);
  const axleInset = vehicle.rearOverhangFt + endClearance;
  if (wall === "east") return { x: garage.x + garage.widthFt - axleInset, y: garage.y + garage.depthFt / 2, headingRad: Math.PI, gear: 1 };
  if (wall === "west") return { x: garage.x + axleInset, y: garage.y + garage.depthFt / 2, headingRad: 0, gear: 1 };
  if (wall === "north") return { x: garage.x + garage.widthFt / 2, y: garage.y + axleInset, headingRad: Math.PI / 2, gear: 1 };
  return { x: garage.x + garage.widthFt / 2, y: garage.y + garage.depthFt - axleInset, headingRad: -Math.PI / 2, gear: 1 };
}

function segmentCorridor(a: Point, b: Point, widthFt: number): Polygon {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * widthFt / 2;
  const ny = (dx / length) * widthFt / 2;
  return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
}

/**
 * A 12 ft straight driveway does not imply a 12 ft paved envelope through a 25 ft
 * rear-axle-radius turn. The front outside corner of the design vehicle sweeps farther
 * from the axle path than half the vehicle width. Compute the local paved flare needed
 * to contain that full-body sweep, then add a modest construction/driver comfort margin.
 */
function requiredTurningPavementWidth(vehicle: VehicleSpec, driveWidthFt: number): number {
  const radius = vehicle.minRearAxleRadiusFt;
  const halfWidth = vehicle.widthFt / 2;
  const rearAxleToFront = vehicle.wheelbaseFt + vehicle.frontOverhangFt;
  const outerFrontOffset = Math.sqrt((radius + halfWidth) ** 2 + rearAxleToFront ** 2) - radius;
  const required = outerFrontOffset * 2 + TURN_PAVEMENT_COMFORT_FT * 2;
  return Math.max(driveWidthFt, Math.ceil(required * 4) / 4);
}

function pavementZones(
  poses: ReturnType<typeof filletPath>["poses"],
  driveWidthFt: number,
  turningWidthFt: number
): Polygon[] {
  const zones: Polygon[] = [];
  for (let i = 0; i < poses.length - 1; i += 1) {
    const a: Point = [poses[i].x, poses[i].y];
    const b: Point = [poses[i + 1].x, poses[i + 1].y];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.02) continue;
    const width = poses[i].kind === "arc" || poses[i + 1].kind === "arc" ? turningWidthFt : driveWidthFt;
    zones.push(segmentCorridor(a, b, width));
  }
  for (let i = 1; i < poses.length - 1; i += 1) {
    const pose = poses[i];
    const width = pose.kind === "arc" ? turningWidthFt : driveWidthFt;
    zones.push(rectangle(pose.x - width / 2, pose.y - width / 2, width, width));
  }
  return zones;
}

function pathIssueLabels(issues: ReturnType<typeof filletPath>["issues"]) {
  return issues.map((issue) => issue.kind === "short-tangent"
    ? `short tangent ${issue.haveFt.toFixed(1)} ft < ${issue.needFt.toFixed(1)} ft at a ${issue.turnDeg}° turn`
    : `unmodeled path reversal at a ${issue.turnDeg}° turn`);
}

function auditDrive(problem: PlacementProblem, candidate: PlacementCandidate, drive: DrivePath, driveWidthFt: number): CandidateDriveMobilityAudit {
  const vehicle = problem.vehicle ?? FULL_SIZE_SUV;
  const garage = drive.garageId ? candidate.placements.find((item) => item.id === drive.garageId && item.kind === "garage") : undefined;
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!garage) {
    return {
      driveId: drive.id, garageId: drive.garageId ?? null, hardPass: false, promotionReady: false, status: "FAIL", generatedDoor: null, targetGarage: null,
      pathIssues: [], warnings, failures: ["Drive does not resolve to a modeled target garage."], result: null
    };
  }
  if (drive.points.length < 2) {
    return {
      driveId: drive.id, garageId: garage.id, hardPass: false, promotionReady: false, status: "FAIL", generatedDoor: null,
      targetGarage: { widthFt: garage.widthFt, depthFt: garage.depthFt }, pathIssues: [], warnings, failures: ["Drive has fewer than two control points."], result: null
    };
  }

  const wall = inferEntryWall(garage, drive.points[drive.points.length - 1]);
  const opening = generatedOpening(garage, wall);
  const parked = parkedRearAxlePose(garage, wall, vehicle);
  if (!opening || !parked) {
    failures.push(`Target garage ${garage.widthFt.toFixed(1)}×${garage.depthFt.toFixed(1)} ft cannot enclose the ${vehicle.lengthFt.toFixed(1)}×${vehicle.widthFt.toFixed(1)} ft design vehicle with this orientation.`);
    return {
      driveId: drive.id, garageId: garage.id, hardPass: false, promotionReady: false, status: "FAIL", generatedDoor: opening ? {
        wall, openingWidthFt: opening.openingEndFt - opening.openingStartFt, sidePierFt: GENERATED_DOOR_PIER_FT, source: "GENERATED_PLANNING_GEOMETRY"
      } : null,
      targetGarage: { widthFt: garage.widthFt, depthFt: garage.depthFt }, pathIssues: [], warnings, failures, result: null
    };
  }

  const extendedPath: Point[] = [...drive.points, [parked.x, parked.y]];
  const path = filletPath(extendedPath, vehicle.minRearAxleRadiusFt);
  const pathIssues = pathIssueLabels(path.issues);
  if (path.issues.length) failures.push(...pathIssues);
  const poses: MotionPose[] = path.poses.map((pose) => ({ x: pose.x, y: pose.y, headingRad: pose.headingRad, gear: 1 }));
  const turningPavementWidthFt = requiredTurningPavementWidth(vehicle, driveWidthFt);
  const result = auditMotionPath({
    parcel: problem.parcel,
    poses,
    vehicle,
    obstacles: obstaclesForDrive(candidate, garage.id),
    pavementZones: pavementZones(path.poses, driveWidthFt, turningPavementWidthFt),
    allowedNonPavementZones: [placementPolygon(garage)],
    allowOutside: problem.allowVehicleOutside,
    garageOpening: opening,
    preferredClearanceFt: PREFERRED_FIXED_CLEARANCE_FT,
    maximumComfortableGearChanges: 2,
    requireFinalParkedInGarage: true
  });

  failures.push(...result.failures);
  if (result.doorClearanceFt == null) failures.push("The independent audit did not observe a garage-wall crossing, so door clearance is unproven.");
  warnings.push(...result.warnings);
  const obstacleClearanceReady = result.minimumObstacleClearanceFt == null || result.minimumObstacleClearanceFt >= PREFERRED_FIXED_CLEARANCE_FT;
  if (!obstacleClearanceReady) warnings.push(`Fixed-obstacle clearance ${result.minimumObstacleClearanceFt?.toFixed(2)} ft is below the ${PREFERRED_FIXED_CLEARANCE_FT.toFixed(2)} ft promotion target.`);
  const doorComfortReady = result.doorClearanceFt != null && result.doorClearanceFt >= COMFORTABLE_DOOR_CLEARANCE_FT;
  const gearComfortReady = result.gearChanges <= 2;
  const hardPass = failures.length === 0 && result.pass && result.finalParkedPass === true && result.reverseReplayPass;
  const promotionReady = hardPass && obstacleClearanceReady && doorComfortReady && gearComfortReady;
  const nearComfort = promotionReady && ((result.minimumObstacleClearanceFt != null && result.minimumObstacleClearanceFt < PREFERRED_FIXED_CLEARANCE_FT + 0.25) || (result.doorClearanceFt != null && result.doorClearanceFt < COMFORTABLE_DOOR_CLEARANCE_FT + 0.25));
  const status: CandidateDriveMobilityAudit["status"] = !hardPass ? "FAIL" : !promotionReady ? "WATCH" : nearComfort ? "PASS_TIGHT" : "PASS";

  return {
    driveId: drive.id,
    garageId: garage.id,
    hardPass,
    promotionReady,
    status,
    generatedDoor: {
      wall,
      openingWidthFt: Number((opening.openingEndFt - opening.openingStartFt).toFixed(2)),
      sidePierFt: GENERATED_DOOR_PIER_FT,
      source: "GENERATED_PLANNING_GEOMETRY"
    },
    targetGarage: { widthFt: garage.widthFt, depthFt: garage.depthFt },
    pathIssues,
    warnings: [...new Set(warnings)],
    failures: [...new Set(failures)],
    result
  };
}

export function auditCandidateMobility(problem: PlacementProblem, candidate: PlacementCandidate, options?: { driveWidthFt?: number }): CandidateMobilityAudit {
  const driveWidthFt = options?.driveWidthFt ?? 12;
  const vehicle = problem.vehicle ?? FULL_SIZE_SUV;
  const turningPavementWidthFt = requiredTurningPavementWidth(vehicle, driveWidthFt);
  const drives = candidate.drives.map((drive) => auditDrive(problem, candidate, drive, driveWidthFt));
  const pass = drives.length > 0 && drives.every((drive) => drive.hardPass);
  const promotionReady = pass && drives.every((drive) => drive.promotionReady);
  let status: CandidateMobilityAudit["status"] = "PASS";
  if (!pass) status = "FAIL";
  else if (!promotionReady || drives.some((drive) => drive.status === "WATCH")) status = "WATCH";
  else if (drives.some((drive) => drive.status === "PASS_TIGHT")) status = "PASS_TIGHT";

  return {
    schemaVersion: "lotscope-candidate-mobility-v1",
    pass,
    promotionReady,
    status,
    driveWidthFt,
    turningPavementWidthFt,
    pavementModel: "CURVATURE_AWARE_FLARE_V2",
    doorModel: "CENTERED_OPENING_WITH_1FT_PIERS",
    drives,
    warnings: [...new Set(drives.flatMap((drive) => drive.warnings))],
    failures: [...new Set(drives.flatMap((drive) => drive.failures))]
  };
}
