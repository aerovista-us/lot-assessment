import type { Point } from "@/packages/geometry";

const EPS = 1e-6;

export type PolygonIntegrityOptions = {
  label?: string;
  minVertices?: number;
  minEdgeFt?: number;
  minAreaSqFt?: number;
  expectedWinding?: -1 | 1 | null;
};

export function signedPolygonArea(polygon: ReadonlyArray<Point>) {
  let twiceArea = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    twiceArea += x1 * y2 - x2 * y1;
  }
  return twiceArea / 2;
}

export function polygonWinding(polygon: ReadonlyArray<Point>): -1 | 1 | null {
  const area = signedPolygonArea(polygon);
  if (Math.abs(area) <= EPS) return null;
  return area > 0 ? 1 : -1;
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(value) <= EPS ? 0 : value;
}

function onSegment(a: Point, b: Point, p: Point) {
  if (orientation(a, b, p) !== 0) return false;
  return p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS
    && p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
}

function segmentsIntersectOrTouch(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
  return (o1 === 0 && onSegment(a, b, c)) || (o2 === 0 && onSegment(a, b, d))
    || (o3 === 0 && onSegment(c, d, a)) || (o4 === 0 && onSegment(c, d, b));
}

export function assertPolygonIntegrity(polygon: ReadonlyArray<Point>, options: PolygonIntegrityOptions = {}) {
  const label = options.label ?? "Polygon";
  const minVertices = options.minVertices ?? 3;
  const minEdgeFt = options.minEdgeFt ?? 0.5;
  const minAreaSqFt = options.minAreaSqFt ?? 1;
  if (polygon.length < minVertices) throw new Error(`${label} must retain at least ${minVertices} corners.`);

  for (const point of polygon) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) throw new Error(`${label} contains an invalid coordinate.`);
  }

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < minEdgeFt - EPS) {
      throw new Error(`${label} edges must remain at least ${minEdgeFt} ft long.`);
    }
    for (let j = i + 1; j < polygon.length; j += 1) {
      const adjacent = j === i || j === (i + 1) % polygon.length || i === (j + 1) % polygon.length;
      if (adjacent) continue;
      const c = polygon[j], d = polygon[(j + 1) % polygon.length];
      if (segmentsIntersectOrTouch(a, b, c, d)) throw new Error(`${label} cannot self-intersect or overlap.`);
    }
  }

  const area = Math.abs(signedPolygonArea(polygon));
  if (area < minAreaSqFt - EPS) throw new Error(`${label} area must remain at least ${minAreaSqFt} sq ft.`);
  const winding = polygonWinding(polygon);
  if (!winding) throw new Error(`${label} cannot collapse to zero area.`);
  if (options.expectedWinding && winding !== options.expectedWinding) throw new Error(`${label} winding cannot invert during an edit.`);
  return { areaSqFt: area, winding };
}

export function projectPointToSegment(point: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= EPS) return [a[0], a[1]];
  const raw = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq;
  const t = Math.max(0, Math.min(1, raw));
  return [a[0] + dx * t, a[1] + dy * t];
}
