import {
  Point,
  Polygon,
  polygonInside,
  polygonsIntersect,
  rectangle,
  translatePolygon
} from "@/packages/geometry";
import {
  FULL_SIZE_SUV,
  Obstacle,
  SweepResult,
  VehicleSpec,
  evaluateSweptPath
} from "@/packages/circulation";

export type AxisAlignedPlacement = {
  id: string;
  kind: "home" | "garage" | "reserved" | "other";
  x: number;
  y: number;
  widthFt: number;
  depthFt: number;
  movable: boolean;
  movementLimitFt?: number;
};

export type DrivePath = {
  id: string;
  garageId?: string;
  points: Point[];
  movableControlPoints?: number[];
  controlPointLimitFt?: number;
};

export type PlacementCandidate = {
  id: string;
  family: string;
  placements: AxisAlignedPlacement[];
  drives: DrivePath[];
  metadata?: Record<string, string | number | boolean>;
};

export type PlacementProblem = {
  parcel: Polygon;
  buildableEnvelope: Polygon;
  vehicle?: VehicleSpec;
  allowVehicleOutside?: (point: Point) => boolean;
  minimumStructureSeparationFt?: number;
};

export type CandidateEvaluation = {
  pass: boolean;
  containmentPass: boolean;
  overlapPass: boolean;
  separationPass: boolean;
  circulationPass: boolean;
  issues: string[];
  sweeps: Array<{ driveId: string; result: SweepResult }>;
  minimumClearanceFt: number | null;
};

export type RepairAction = {
  kind: "shift-placement" | "shift-drive-point";
  targetId: string;
  dx: number;
  dy: number;
  pointIndex?: number;
};

export type RepairResult = {
  status: "PASS" | "NEAR_PASS" | "FAIL";
  candidate: PlacementCandidate;
  evaluation: CandidateEvaluation;
  actions: RepairAction[];
  tested: number;
};

export type SearchResult = {
  candidate: PlacementCandidate;
  evaluation: CandidateEvaluation;
};

export function placementPolygon(item: AxisAlignedPlacement): Point[] {
  return rectangle(item.x, item.y, item.widthFt, item.depthFt);
}

function rectSeparation(a: AxisAlignedPlacement, b: AxisAlignedPlacement): number {
  const dx = Math.max(b.x - (a.x + a.widthFt), a.x - (b.x + b.widthFt), 0);
  const dy = Math.max(b.y - (a.y + a.depthFt), a.y - (b.y + b.depthFt), 0);
  return Math.hypot(dx, dy);
}

function obstaclesForDrive(candidate: PlacementCandidate, garageId?: string): Obstacle[] {
  return candidate.placements
    .filter((item) => item.id !== garageId)
    .map((item) => ({ id: item.id, label: item.id, polygon: placementPolygon(item) }));
}

export function evaluatePlacement(problem: PlacementProblem, candidate: PlacementCandidate): CandidateEvaluation {
  const issues: string[] = [];
  let containmentPass = true;
  let overlapPass = true;
  let separationPass = true;

  for (const item of candidate.placements) {
    const poly = placementPolygon(item);
    if (!polygonInside(poly, problem.buildableEnvelope, 0.08)) {
      containmentPass = false;
      issues.push(`${item.id}: outside buildable envelope`);
    }
  }

  for (let i = 0; i < candidate.placements.length; i += 1) {
    for (let j = i + 1; j < candidate.placements.length; j += 1) {
      const a = candidate.placements[i];
      const b = candidate.placements[j];
      if (polygonsIntersect(placementPolygon(a), placementPolygon(b), 0.02)) {
        overlapPass = false;
        issues.push(`${a.id}/${b.id}: footprints overlap`);
      }
      const required = problem.minimumStructureSeparationFt ?? 0;
      if (required > 0 && rectSeparation(a, b) < required - 0.02) {
        separationPass = false;
        issues.push(`${a.id}/${b.id}: separation ${rectSeparation(a, b).toFixed(2)}′ < ${required}′`);
      }
    }
  }

  const sweeps = candidate.drives.map((drive) => ({
    driveId: drive.id,
    result: evaluateSweptPath({
      parcel: problem.parcel,
      path: drive.points,
      obstacles: obstaclesForDrive(candidate, drive.garageId),
      vehicle: problem.vehicle ?? FULL_SIZE_SUV,
      allowOutside: problem.allowVehicleOutside
    })
  }));
  const circulationPass = sweeps.every(({ result }) => result.pass);
  for (const { driveId, result } of sweeps) {
    if (result.offParcelCount) issues.push(`${driveId}: ${result.offParcelCount} swept-body parcel violations`);
    for (const collision of result.collisions) issues.push(`${driveId}: swept body hits ${collision}`);
    for (const pathIssue of result.pathIssues) {
      if (pathIssue.kind === "short-tangent") {
        issues.push(`${driveId}: short tangent ${pathIssue.haveFt}′ < ${pathIssue.needFt}′`);
      }
    }
  }

  const finiteClearances = sweeps
    .map(({ result }) => result.minimumBoundaryClearanceFt)
    .filter((value): value is number => value != null && Number.isFinite(value));

  return {
    pass: containmentPass && overlapPass && separationPass && circulationPass,
    containmentPass,
    overlapPass,
    separationPass,
    circulationPass,
    issues: [...new Set(issues)],
    sweeps,
    minimumClearanceFt: finiteClearances.length ? Math.min(...finiteClearances) : null
  };
}

export function shiftPlacement(candidate: PlacementCandidate, id: string, dx: number, dy: number): PlacementCandidate {
  return {
    ...candidate,
    placements: candidate.placements.map((item) =>
      item.id === id ? { ...item, x: item.x + dx, y: item.y + dy } : item
    )
  };
}

export function shiftDriveControlPoint(
  candidate: PlacementCandidate,
  driveId: string,
  pointIndex: number,
  dx: number,
  dy: number
): PlacementCandidate {
  return {
    ...candidate,
    drives: candidate.drives.map((drive) => {
      if (drive.id !== driveId) return drive;
      return {
        ...drive,
        points: drive.points.map((point, index) =>
          index === pointIndex ? [point[0] + dx, point[1] + dy] as Point : point
        )
      };
    })
  };
}

function signature(candidate: PlacementCandidate): string {
  const structures = candidate.placements
    .map((p) => `${p.id}:${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .sort()
    .join("|");
  const drives = candidate.drives
    .map((d) => `${d.id}:${d.points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(";")}`)
    .sort()
    .join("|");
  return `${structures}::${drives}`;
}

function actionMagnitude(actions: RepairAction[]): number {
  return actions.reduce((sum, action) => sum + Math.hypot(action.dx, action.dy), 0);
}

/**
 * Bounded local repair. Search order deliberately mirrors the lot-design skill:
 * drive control points first, then movable structures. Each step is deterministic
 * and never changes parcel, setbacks, vehicle assumptions, or locked elements.
 */
export function boundedRepair(
  problem: PlacementProblem,
  source: PlacementCandidate,
  options?: {
    stepScheduleFt?: number[];
    maxActions?: number;
    maxStates?: number;
  }
): RepairResult {
  const initial = evaluatePlacement(problem, source);
  if (initial.pass) return { status: "PASS", candidate: source, evaluation: initial, actions: [], tested: 1 };

  const steps = options?.stepScheduleFt ?? [1, 0.5, 0.25];
  const maxActions = options?.maxActions ?? 3;
  const maxStates = options?.maxStates ?? 4000;
  const queue: Array<{ candidate: PlacementCandidate; actions: RepairAction[] }> = [{ candidate: source, actions: [] }];
  const seen = new Set<string>([signature(source)]);
  let tested = 1;
  let best = { candidate: source, evaluation: initial, actions: [] as RepairAction[] };

  const score = (evaluation: CandidateEvaluation, actions: RepairAction[]) => {
    const failures = Number(!evaluation.containmentPass) + Number(!evaluation.overlapPass) +
      Number(!evaluation.separationPass) + Number(!evaluation.circulationPass);
    const collisionCount = evaluation.sweeps.reduce((sum, item) => sum + item.result.collisions.length + item.result.offParcelCount, 0);
    return failures * 1000 + collisionCount * 20 + actionMagnitude(actions);
  };

  while (queue.length && tested < maxStates) {
    const state = queue.shift()!;
    if (state.actions.length >= maxActions) continue;

    const mutations: Array<{ candidate: PlacementCandidate; action: RepairAction }> = [];

    for (const drive of state.candidate.drives) {
      const movable = drive.movableControlPoints ?? [];
      const limit = drive.controlPointLimitFt ?? 2;
      for (const pointIndex of movable) {
        for (const step of steps) {
          for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Point[]) {
            const totalDx = state.actions
              .filter((a) => a.kind === "shift-drive-point" && a.targetId === drive.id && a.pointIndex === pointIndex)
              .reduce((sum, a) => sum + a.dx, 0) + dx;
            const totalDy = state.actions
              .filter((a) => a.kind === "shift-drive-point" && a.targetId === drive.id && a.pointIndex === pointIndex)
              .reduce((sum, a) => sum + a.dy, 0) + dy;
            if (Math.hypot(totalDx, totalDy) > limit + 1e-6) continue;
            mutations.push({
              candidate: shiftDriveControlPoint(state.candidate, drive.id, pointIndex, dx, dy),
              action: { kind: "shift-drive-point", targetId: drive.id, pointIndex, dx, dy }
            });
          }
        }
      }
    }

    for (const item of state.candidate.placements) {
      if (!item.movable) continue;
      const limit = item.movementLimitFt ?? 2;
      for (const step of steps) {
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Point[]) {
          const totalDx = state.actions
            .filter((a) => a.kind === "shift-placement" && a.targetId === item.id)
            .reduce((sum, a) => sum + a.dx, 0) + dx;
          const totalDy = state.actions
            .filter((a) => a.kind === "shift-placement" && a.targetId === item.id)
            .reduce((sum, a) => sum + a.dy, 0) + dy;
          if (Math.hypot(totalDx, totalDy) > limit + 1e-6) continue;
          mutations.push({
            candidate: shiftPlacement(state.candidate, item.id, dx, dy),
            action: { kind: "shift-placement", targetId: item.id, dx, dy }
          });
        }
      }
    }

    for (const mutation of mutations) {
      const key = signature(mutation.candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      tested += 1;
      const actions = [...state.actions, mutation.action];
      const evaluation = evaluatePlacement(problem, mutation.candidate);
      if (evaluation.pass) {
        return { status: "PASS", candidate: mutation.candidate, evaluation, actions, tested };
      }
      if (score(evaluation, actions) < score(best.evaluation, best.actions)) {
        best = { candidate: mutation.candidate, evaluation, actions };
      }
      if (actions.length < maxActions) queue.push({ candidate: mutation.candidate, actions });
      if (tested >= maxStates) break;
    }
  }

  const improved = score(best.evaluation, best.actions) < score(initial, []);
  return {
    status: improved ? "NEAR_PASS" : "FAIL",
    candidate: best.candidate,
    evaluation: best.evaluation,
    actions: best.actions,
    tested
  };
}

/**
 * Deterministic coarse grid placement for rectangular templates. It intentionally
 * performs no architectural ranking; callers can layer topology/program scoring on
 * top. `fixedPlacements` may include locked garages/buildings or reserved zones.
 */
export function searchGridPlacements(args: {
  problem: PlacementProblem;
  family: string;
  templates: Array<Omit<AxisAlignedPlacement, "x" | "y"> & { xRange: [number, number]; yRange: [number, number] }>;
  fixedPlacements?: AxisAlignedPlacement[];
  drives?: DrivePath[];
  stepFt?: number;
  limit?: number;
  repairNearPasses?: boolean;
}): SearchResult[] {
  const step = args.stepFt ?? 1;
  const limit = args.limit ?? 50;
  const output: SearchResult[] = [];

  const recurse = (index: number, placed: AxisAlignedPlacement[]) => {
    if (output.length >= limit) return;
    if (index >= args.templates.length) {
      const candidate: PlacementCandidate = {
        id: `${args.family}-${output.length + 1}`,
        family: args.family,
        placements: [...(args.fixedPlacements ?? []), ...placed],
        drives: args.drives?.map((drive) => ({ ...drive, points: drive.points.map(([x, y]) => [x, y]) })) ?? []
      };
      let evaluation = evaluatePlacement(args.problem, candidate);
      let finalCandidate = candidate;
      if (!evaluation.pass && args.repairNearPasses) {
        const repair = boundedRepair(args.problem, candidate, { maxActions: 2, maxStates: 600 });
        finalCandidate = repair.candidate;
        evaluation = repair.evaluation;
      }
      if (evaluation.pass || args.repairNearPasses) output.push({ candidate: finalCandidate, evaluation });
      return;
    }

    const template = args.templates[index];
    for (let x = template.xRange[0]; x <= template.xRange[1] + 1e-6; x += step) {
      for (let y = template.yRange[0]; y <= template.yRange[1] + 1e-6; y += step) {
        const item: AxisAlignedPlacement = {
          id: template.id,
          kind: template.kind,
          x,
          y,
          widthFt: template.widthFt,
          depthFt: template.depthFt,
          movable: template.movable,
          movementLimitFt: template.movementLimitFt
        };
        const poly = placementPolygon(item);
        if (!polygonInside(poly, args.problem.buildableEnvelope, 0.08)) continue;
        if ([...(args.fixedPlacements ?? []), ...placed].some((other) => polygonsIntersect(poly, placementPolygon(other), 0.02))) continue;
        recurse(index + 1, [...placed, item]);
        if (output.length >= limit) return;
      }
    }
  };

  recurse(0, []);
  return output;
}
