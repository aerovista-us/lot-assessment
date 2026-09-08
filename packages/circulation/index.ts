import {
  Point,
  Polygon,
  distance,
  pointInPolygon,
  polygonsIntersect
} from "@/packages/geometry";

export type VehicleSpec = {
  id: string;
  label: string;
  lengthFt: number;
  widthFt: number;
  wheelbaseFt: number;
  frontOverhangFt: number;
  rearOverhangFt: number;
  minRearAxleRadiusFt: number;
};

export type PathPose = {
  x: number;
  y: number;
  headingRad: number;
  kind: "straight" | "arc";
};

export type PathIssue =
  | { kind: "short-tangent"; at: Point; needFt: number; haveFt: number; turnDeg: number }
  | { kind: "path-reversal"; at: Point; turnDeg: number };

export type Obstacle = {
  id?: string;
  label: string;
  polygon: Polygon;
};

export type SweepResult = {
  pass: boolean;
  poses: PathPose[];
  pathIssues: PathIssue[];
  offParcelCount: number;
  collisions: string[];
  minimumBoundaryClearanceFt: number | null;
};

export const FULL_SIZE_SUV: VehicleSpec = {
  id: "FS-SUV",
  label: "Full-size SUV / pickup (F-150 SuperCrew / Tahoe class)",
  lengthFt: 20.5,
  widthFt: 8,
  wheelbaseFt: 13.1,
  frontOverhangFt: 3.4,
  rearOverhangFt: 4,
  minRearAxleRadiusFt: 25
};

function heading(a: Point, b: Point): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

function wrap(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function unit(a: Point, b: Point): Point {
  const d = distance(a, b) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
}

export function vehiclePolygon(vehicle: VehicleSpec, axleX: number, axleY: number, headingRad: number): Point[] {
  const hx = Math.cos(headingRad);
  const hy = Math.sin(headingRad);
  const axleToBodyCenter = vehicle.lengthFt / 2 - vehicle.rearOverhangFt;
  const cx = axleX + hx * axleToBodyCenter;
  const cy = axleY + hy * axleToBodyCenter;
  const wx = -hy;
  const wy = hx;
  const halfLength = vehicle.lengthFt / 2;
  const halfWidth = vehicle.widthFt / 2;

  return [
    [cx + hx * halfLength + wx * halfWidth, cy + hy * halfLength + wy * halfWidth],
    [cx + hx * halfLength - wx * halfWidth, cy + hy * halfLength - wy * halfWidth],
    [cx - hx * halfLength - wx * halfWidth, cy - hy * halfLength - wy * halfWidth],
    [cx - hx * halfLength + wx * halfWidth, cy - hy * halfLength + wy * halfWidth]
  ];
}

/** Converts a rear-axle centerline polyline into sampled straight/arc poses. */
export function filletPath(rawPath: readonly Point[], radiusFt: number): { poses: PathPose[]; issues: PathIssue[] } {
  const path = rawPath.map(([x, y]) => [x, y] as Point);
  const poses: PathPose[] = [];
  const issues: PathIssue[] = [];
  if (path.length < 2) return { poses, issues };

  const sampleStraight = (a: Point, b: Point, skipEnd = false) => {
    const d = distance(a, b);
    const steps = Math.max(1, Math.ceil(d / 2.5));
    const h = heading(a, b);
    for (let i = 0; i < steps; i += 1) {
      const t = i / steps;
      poses.push({
        x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        headingRad: h,
        kind: "straight"
      });
    }
    if (!skipEnd) poses.push({ x: b[0], y: b[1], headingRad: h, kind: "straight" });
  };

  let cursor = path[0];
  for (let i = 1; i < path.length - 1; i += 1) {
    const A = i === 1 ? path[0] : cursor;
    const B = path[i];
    const C = path[i + 1];
    const dIn = distance(A, B);
    const dOut = distance(B, C);
    const hIn = heading(A, B);
    const hOut = heading(B, C);
    const delta = wrap(hOut - hIn);
    const phi = Math.abs(delta);

    if (phi > (150 * Math.PI) / 180) {
      issues.push({ kind: "path-reversal", at: B, turnDeg: Math.round((phi * 180) / Math.PI) });
      sampleStraight(cursor, B, true);
      cursor = B;
      continue;
    }

    if (phi < (12 * Math.PI) / 180) {
      sampleStraight(cursor, B, true);
      cursor = B;
      continue;
    }

    const tangent = radiusFt * Math.tan(phi / 2);
    const available = Math.min(dIn, dOut);
    if (available < tangent - 0.4) {
      issues.push({
        kind: "short-tangent",
        at: B,
        needFt: Math.round(tangent * 10) / 10,
        haveFt: Math.round(available * 10) / 10,
        turnDeg: Math.round((phi * 180) / Math.PI)
      });
      sampleStraight(cursor, B, true);
      cursor = B;
      continue;
    }

    const uIn = unit(A, B);
    const sign = delta >= 0 ? 1 : -1;
    const normal: Point = sign > 0 ? [-uIn[1], uIn[0]] : [uIn[1], -uIn[0]];
    const p1: Point = [B[0] - uIn[0] * tangent, B[1] - uIn[1] * tangent];
    const uOut = unit(B, C);
    const p2: Point = [B[0] + uOut[0] * tangent, B[1] + uOut[1] * tangent];
    const center: Point = [p1[0] + normal[0] * radiusFt, p1[1] + normal[1] * radiusFt];

    sampleStraight(cursor, p1, true);
    const a1 = Math.atan2(p1[1] - center[1], p1[0] - center[0]);
    const a2 = Math.atan2(p2[1] - center[1], p2[0] - center[0]);
    const sweep = wrap(a2 - a1);
    const steps = Math.max(6, Math.ceil((Math.abs(sweep) * radiusFt) / 2));
    for (let s = 0; s <= steps; s += 1) {
      const angle = a1 + (sweep * s) / steps;
      poses.push({
        x: center[0] + Math.cos(angle) * radiusFt,
        y: center[1] + Math.sin(angle) * radiusFt,
        headingRad: angle + (sign > 0 ? Math.PI / 2 : -Math.PI / 2),
        kind: "arc"
      });
    }
    cursor = p2;
  }

  sampleStraight(cursor, path[path.length - 1]);
  return { poses, issues };
}

function boundaryClearance(body: Polygon, parcel: Polygon): number | null {
  let min = Infinity;
  for (const point of body) {
    for (let i = 0; i < parcel.length; i += 1) {
      const a = parcel[i];
      const b = parcel[(i + 1) % parcel.length];
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const denom = abx * abx + aby * aby || 1;
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby) / denom));
      const qx = a[0] + abx * t;
      const qy = a[1] + aby * t;
      min = Math.min(min, Math.hypot(point[0] - qx, point[1] - qy));
    }
  }
  return Number.isFinite(min) ? min : null;
}

export function evaluateSweptPath(args: {
  parcel: Polygon;
  path: readonly Point[];
  obstacles?: readonly Obstacle[];
  vehicle?: VehicleSpec;
  allowOutside?: (point: Point) => boolean;
  parcelEpsilonFt?: number;
}): SweepResult {
  const vehicle = args.vehicle ?? FULL_SIZE_SUV;
  const { poses, issues } = filletPath(args.path, vehicle.minRearAxleRadiusFt);
  let offParcelCount = 0;
  const collisionLabels = new Set<string>();
  let minBoundary = Infinity;

  for (const pose of poses) {
    const body = vehiclePolygon(vehicle, pose.x, pose.y, pose.headingRad);
    let streetTransitionPose = false;
    let allNonStreetCornersInside = true;
    for (const corner of body) {
      if (args.allowOutside?.(corner)) {
        streetTransitionPose = true;
        continue;
      }
      if (!pointInPolygon(corner, args.parcel, args.parcelEpsilonFt ?? 0.2)) {
        offParcelCount += 1;
        allNonStreetCornersInside = false;
      }
    }

    // Do not let the intentional street/parcel crossing dominate the site's clearance metric.
    // Clearance becomes meaningful only once the complete vehicle body is inside the parcel.
    if (!streetTransitionPose && allNonStreetCornersInside) {
      const clearance = boundaryClearance(body, args.parcel);
      if (clearance != null) minBoundary = Math.min(minBoundary, clearance);
    }

    for (const obstacle of args.obstacles ?? []) {
      if (polygonsIntersect(body, obstacle.polygon)) collisionLabels.add(obstacle.label);
    }
  }

  const hardPathIssue = issues.some((issue) => issue.kind === "short-tangent");
  return {
    pass: offParcelCount === 0 && collisionLabels.size === 0 && !hardPathIssue,
    poses,
    pathIssues: issues,
    offParcelCount,
    collisions: [...collisionLabels],
    minimumBoundaryClearanceFt: Number.isFinite(minBoundary) ? minBoundary : null
  };
}