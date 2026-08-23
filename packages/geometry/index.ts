export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export type SegmentSetback = {
  segmentIndex: number;
  distanceFt: number;
};

export function polygonArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const denom = abx * abx + aby * aby;
  if (!denom) return distance(p, a);
  const raw = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / denom;
  const t = Math.max(0, Math.min(1, raw));
  const q: Point = [a[0] + abx * t, a[1] + aby * t];
  return distance(p, q);
}

export function distanceToPolygonBoundary(p: Point, poly: Polygon): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    min = Math.min(min, distancePointToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return min;
}

export function pointInPolygon(point: Point, poly: Polygon, epsilon = 0.08): boolean {
  if (distanceToPolygonBoundary(point, poly) <= epsilon) return true;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function polygonInside(inner: Polygon, outer: Polygon, epsilon = 0.08): boolean {
  return inner.every((p) => pointInPolygon(p, outer, epsilon));
}

export function rectangle(x: number, y: number, width: number, height: number): Point[] {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height]
  ];
}

function lineIntersection(a: Point, b: Point, c: Point, d: Point): Point {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const [x3, y3] = c;
  const [x4, y4] = d;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return [(x2 + x3) / 2, (y2 + y3) / 2];
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

/**
 * Polygon offset using one inward setback distance per boundary segment.
 * Assumes the source polygon is consistently wound and reasonably simple/convex,
 * matching the deterministic method proven in the Pondy reference engine.
 */
export function insetPolygonBySegment(
  survey: Polygon,
  setbackForSegment: (segmentIndex: number) => number
): Point[] {
  const lines: Array<{ a: Point; b: Point }> = [];
  for (let i = 0; i < survey.length; i += 1) {
    const a = survey[i];
    const b = survey[(i + 1) % survey.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = setbackForSegment(i);
    lines.push({
      a: [a[0] + nx * offset, a[1] + ny * offset],
      b: [b[0] + nx * offset, b[1] + ny * offset]
    });
  }

  const out: Point[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const previous = lines[(i - 1 + lines.length) % lines.length];
    const current = lines[i];
    out.push(lineIntersection(previous.a, previous.b, current.a, current.b));
  }
  return out;
}

function projectionRange(poly: Polygon, nx: number, ny: number): [number, number] {
  const values = poly.map(([x, y]) => x * nx + y * ny);
  return [Math.min(...values), Math.max(...values)];
}

/** Separating-axis intersection for convex polygons. */
export function polygonsIntersect(a: Polygon, b: Polygon, epsilon = 0.02): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i += 1) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const nx = p2[1] - p1[1];
      const ny = p1[0] - p2[0];
      const [amin, amax] = projectionRange(a, nx, ny);
      const [bmin, bmax] = projectionRange(b, nx, ny);
      if (amax < bmin - epsilon || bmax < amin - epsilon) return false;
    }
  }
  return true;
}

export function translatePolygon(poly: Polygon, dx: number, dy: number): Point[] {
  return poly.map(([x, y]) => [x + dx, y + dy]);
}

export function rotatePoint(point: Point, origin: Point, radians: number): Point {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const x = point[0] - origin[0];
  const y = point[1] - origin[1];
  return [origin[0] + x * c - y * s, origin[1] + x * s + y * c];
}

export function rotatePolygon(poly: Polygon, origin: Point, radians: number): Point[] {
  return poly.map((p) => rotatePoint(p, origin, radians));
}
