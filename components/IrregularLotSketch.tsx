"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";

type Point = [number, number];

type Preset = {
  id: string;
  label: string;
  points: Point[];
  frontageEdge: number;
};

export type IrregularLotSnapshot = {
  points: Point[];
  frontageEdge: number;
  frontageStreet: string;
  areaSqFt: number;
  frontageLengthFt: number;
  boundingWidthFt: number;
  boundingDepthFt: number;
  screenWidthFt: number;
  screenDepthFt: number;
  simple: boolean;
  complete: boolean;
};

type Props = {
  onChange: (snapshot: IrregularLotSnapshot) => void;
  initialSnapshot?: IrregularLotSnapshot | null;
};

const PRESETS: Preset[] = [
  {
    id: "trap",
    label: "Trapezoid / wedge",
    frontageEdge: 1,
    points: [[0, 8], [130, 0], [130, 55], [0, 42]]
  },
  {
    id: "flag",
    label: "Flag lot",
    frontageEdge: 1,
    points: [[0, 0], [40, 0], [40, 18], [110, 18], [110, 70], [0, 70]]
  },
  {
    id: "l",
    label: "L-shaped parcel",
    frontageEdge: 1,
    points: [[0, 0], [90, 0], [90, 36], [140, 36], [140, 80], [0, 80]]
  },
  {
    id: "pondy",
    label: "Pondy Lot 2 example",
    frontageEdge: 1,
    points: [[0, 0], [148, 0], [148, 50], [125.143, 43.016], [84.813, 43.016], [0, 57.01]]
  }
];

const EPSILON = 1e-7;

function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function bounds(points: Point[]) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 160, maxY: 100, width: 160, depth: 100 };
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(maxX - minX, 0),
    depth: Math.max(maxY - minY, 0)
  };
}

function edgeLength(a?: Point, b?: Point) {
  if (!a || !b) return 0;
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function orientation(a: Point, b: Point, c: Point) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) <= EPSILON) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: Point, b: Point, c: Point) {
  return b[0] <= Math.max(a[0], c[0]) + EPSILON &&
    b[0] + EPSILON >= Math.min(a[0], c[0]) &&
    b[1] <= Math.max(a[1], c[1]) + EPSILON &&
    b[1] + EPSILON >= Math.min(a[1], c[1]);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function isSimplePolygon(points: Point[]) {
  if (points.length < 3) return false;
  for (let i = 0; i < points.length; i += 1) {
    if (edgeLength(points[i], points[(i + 1) % points.length]) <= EPSILON) return false;
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j += 1) {
      const adjacent = j === i || j === i + 1 || (i === 0 && j === points.length - 1);
      if (adjacent) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

function parsePoints(text: string): Point[] {
  const parsed = text
    .split(/[\n;]+/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(/[,\s]+/).map(Number))
    .filter((row) => row.length >= 2 && Number.isFinite(row[0]) && Number.isFinite(row[1]))
    .map((row) => [row[0], row[1]] as Point);

  if (parsed.length > 1) {
    const first = parsed[0];
    const last = parsed[parsed.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) parsed.pop();
  }
  return parsed;
}

function formatPoints(points: Point[]) {
  return points.map(([x, y]) => `${x}, ${y}`).join("\n");
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function IrregularLotSketch({ onChange, initialSnapshot }: Props) {
  const initial = PRESETS[0];
  const restored = initialSnapshot?.points?.length ? initialSnapshot : null;
  const [points, setPoints] = useState<Point[]>(() => (restored?.points ?? initial.points).map((point) => [...point] as Point));
  const [frontageEdge, setFrontageEdge] = useState(() => restored?.frontageEdge ?? initial.frontageEdge);
  const [frontageStreet, setFrontageStreet] = useState(() => restored?.frontageStreet || "Front street");
  const [activePreset, setActivePreset] = useState(() => restored ? "custom" : initial.id);
  const [pointText, setPointText] = useState(() => formatPoints(restored?.points ?? initial.points));

  const snapshot = useMemo<IrregularLotSnapshot>(() => {
    const box = bounds(points);
    const edge = points.length >= 2 ? Math.min(frontageEdge, points.length - 1) : 0;
    const frontageLengthFt = points.length >= 2
      ? edgeLength(points[edge], points[(edge + 1) % points.length])
      : 0;
    const simple = isSimplePolygon(points);
    const areaSqFt = simple ? polygonArea(points) : 0;

    // Public v2.1 still runs a rectangular feasibility screen. For a valid
    // irregular parcel, preserve actual polygon area and selected frontage by
    // using an area-equivalent rectangle. Exact polygon setbacks remain Workbench work.
    const screenWidthFt = simple ? frontageLengthFt : 0;
    const screenDepthFt = simple && frontageLengthFt > 0 ? areaSqFt / frontageLengthFt : 0;

    return {
      points,
      frontageEdge: edge,
      frontageStreet,
      areaSqFt: round(areaSqFt),
      frontageLengthFt: round(frontageLengthFt),
      boundingWidthFt: round(box.width),
      boundingDepthFt: round(box.depth),
      screenWidthFt: round(screenWidthFt),
      screenDepthFt: round(screenDepthFt),
      simple,
      complete: points.length >= 3 && simple && areaSqFt > 0 && frontageLengthFt > 0
    };
  }, [points, frontageEdge, frontageStreet]);

  useEffect(() => {
    onChange(snapshot);
  }, [snapshot, onChange]);

  const drawing = useMemo(() => {
    const raw = bounds(points);
    const stableWidth = points.length < 3 ? Math.max(raw.maxX, 160) - Math.min(raw.minX, 0) : Math.max(raw.width, 1);
    const stableDepth = points.length < 3 ? Math.max(raw.maxY, 100) - Math.min(raw.minY, 0) : Math.max(raw.depth, 1);
    const minX = points.length < 3 ? Math.min(raw.minX, 0) : raw.minX;
    const minY = points.length < 3 ? Math.min(raw.minY, 0) : raw.minY;
    const width = 640;
    const height = 360;
    const pad = 28;
    const scale = Math.min((width - pad * 2) / stableWidth, (height - pad * 2) / stableDepth);
    const offsetX = pad - minX * scale + ((width - pad * 2) - stableWidth * scale) / 2;
    const offsetY = pad - minY * scale + ((height - pad * 2) - stableDepth * scale) / 2;
    return { width, height, scale, offsetX, offsetY };
  }, [points]);

  const toSvg = ([x, y]: Point) => [x * drawing.scale + drawing.offsetX, y * drawing.scale + drawing.offsetY] as Point;

  const setPreset = (preset: Preset) => {
    const next = preset.points.map((point) => [...point] as Point);
    setPoints(next);
    setPointText(formatPoints(next));
    setFrontageEdge(preset.frontageEdge);
    setActivePreset(preset.id);
  };

  const applyPoints = (next: Point[]) => {
    setPoints(next);
    setPointText(formatPoints(next));
    setActivePreset("custom");
    if (frontageEdge >= next.length) setFrontageEdge(0);
  };

  const handleCanvasClick = (event: MouseEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-frontage-edge]")) return;
    const svg = event.currentTarget;
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) return;
    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const local = pointer.matrixTransform(screenMatrix.inverse());
    const x = (local.x - drawing.offsetX) / drawing.scale;
    const y = (local.y - drawing.offsetY) / drawing.scale;
    const next = [...points, [round(x, 1), round(y, 1)] as Point];
    applyPoints(next);
  };

  const recordLabel = snapshot.complete
    ? "LOT RECORD READY"
    : points.length >= 3 && !snapshot.simple
      ? "FIX CROSSED EDGES"
      : "NEEDS 3+ CORNERS";

  return (
    <section className="irregular-tool" aria-label="Irregular parcel sketcher">
      <div className="irregular-head">
        <div>
          <p className="eyebrow">IRREGULAR PARCEL</p>
          <h3>Draw or paste the actual lot outline.</h3>
          <p>Click corners in order, paste survey-style x/y coordinates, then click an edge to mark the street frontage.</p>
        </div>
        <span className={snapshot.complete ? "lot-record good" : points.length >= 3 && !snapshot.simple ? "lot-record invalid" : "lot-record"}>{recordLabel}</span>
      </div>

      <div className="preset-row" aria-label="Parcel examples">
        {PRESETS.map((preset) => (
          <button type="button" key={preset.id} className={activePreset === preset.id ? "preset active" : "preset"} onClick={() => setPreset(preset)}>{preset.label}</button>
        ))}
        <button type="button" className="preset" onClick={() => applyPoints([])}>Blank</button>
      </div>

      <div className="sketch-grid">
        <div>
          <svg className="lot-sketch" viewBox={`0 0 ${drawing.width} ${drawing.height}`} onClick={handleCanvasClick} role="img" aria-label="Custom lot polygon. Click to add corners and click an edge to select frontage.">
            <rect width={drawing.width} height={drawing.height} className="sketch-bg" />
            <text x="16" y="22" className="sketch-help">CLICK TO ADD CORNERS · CLICK AN EDGE TO SET STREET FRONTAGE</text>
            {points.length >= 3 && <polygon points={points.map((point) => toSvg(point).join(",")).join(" ")} className={snapshot.simple ? "parcel-fill" : "parcel-fill invalid"} />}
            {points.map((point, index) => {
              if (points.length < 2) return null;
              const next = points[(index + 1) % points.length];
              const [x1, y1] = toSvg(point);
              const [x2, y2] = toSvg(next);
              const active = index === snapshot.frontageEdge;
              return <line key={`edge-${index}`} data-frontage-edge={index} x1={x1} y1={y1} x2={x2} y2={y2} className={active ? "parcel-edge frontage" : "parcel-edge"} onClick={(event) => { event.stopPropagation(); setFrontageEdge(index); }} />;
            })}
            {points.map((point, index) => {
              const [cx, cy] = toSvg(point);
              return <g key={`point-${index}`}><circle cx={cx} cy={cy} r="5" className="parcel-point" /><text x={cx + 7} y={cy - 7} className="point-label">{index + 1}</text></g>;
            })}
          </svg>
          <div className="sketch-actions">
            <button type="button" className="ghost-button" onClick={() => applyPoints(points.slice(0, -1))}>Undo corner</button>
            <button type="button" className="ghost-button" onClick={() => applyPoints([])}>Clear</button>
          </div>
        </div>

        <div className="vertex-panel">
          <label>
            <span>Vertices in feet</span>
            <textarea value={pointText} spellCheck={false} onChange={(event) => { setPointText(event.target.value); const parsed = parsePoints(event.target.value); setPoints(parsed); setActivePreset("custom"); if (frontageEdge >= parsed.length) setFrontageEdge(0); }} placeholder={"0, 0\n120, 0\n120, 50\n0, 50"} />
          </label>
          <label>
            <span>Frontage street name</span>
            <input value={frontageStreet} onChange={(event) => setFrontageStreet(event.target.value)} />
          </label>
          <p className="vertex-note">The selected street edge is orange. Coordinates are local feet, not latitude/longitude.</p>
          {points.length >= 3 && !snapshot.simple && <p className="vertex-error">The outline crosses itself or contains a zero-length edge. Reorder/fix the corners before LotScope can assess it.</p>}
        </div>
      </div>

      <div className="lot-facts">
        <div><span>Polygon area</span><strong>{snapshot.simple ? `${snapshot.areaSqFt.toLocaleString()} sq ft` : "invalid outline"}</strong></div>
        <div><span>Selected frontage</span><strong>{snapshot.frontageLengthFt.toLocaleString()} ft</strong></div>
        <div><span>Bounding box</span><strong>{snapshot.boundingWidthFt} × {snapshot.boundingDepthFt} ft</strong></div>
        <div><span>Public screen</span><strong>{snapshot.complete ? `${snapshot.screenWidthFt} × ${snapshot.screenDepthFt} ft` : "—"}</strong></div>
      </div>
      <p className="screen-note"><strong>How the public screen uses this:</strong> the polygon itself is recorded and its real area/frontage are measured. The current public feasibility math then uses an area-equivalent rectangle (selected frontage × area-equivalent depth). Exact irregular setback insets, placements, and vehicle paths remain deeper Workbench geometry.</p>

      <style jsx>{`
        .irregular-tool{margin:20px 0 6px;padding:16px;border:1px solid rgba(245,158,11,.24);border-radius:16px;background:rgba(245,158,11,.035)}
        .irregular-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.irregular-head h3{font-size:20px;margin:0;color:#f3f5f7}.irregular-head p:not(.eyebrow){margin:6px 0 0;color:#9ba3af;font-size:12px;line-height:1.5;max-width:650px}.lot-record{white-space:nowrap;font-size:9px;font-weight:900;letter-spacing:.08em;border:1px solid rgba(251,191,36,.3);color:#fbbf24;border-radius:999px;padding:7px 9px}.lot-record.good{border-color:rgba(74,222,128,.32);color:#86efac}.lot-record.invalid{border-color:rgba(248,113,113,.45);color:#fca5a5}
        .preset-row{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.preset{border:1px solid rgba(255,255,255,.1);background:#0c0f15;color:#c5cbd4;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer}.preset.active{border-color:rgba(245,158,11,.55);color:#fbd38b;background:rgba(245,158,11,.1)}
        .sketch-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(220px,.55fr);gap:12px}.lot-sketch{width:100%;min-height:280px;display:block;border:1px solid rgba(255,255,255,.1);border-radius:12px;cursor:crosshair;touch-action:manipulation}.sketch-bg{fill:#e9e7e0}.sketch-help{fill:#7c541d;font-size:10px;font-weight:900;letter-spacing:.04em}.parcel-fill{fill:#e5bd7870}.parcel-fill.invalid{fill:#ef444433}.parcel-edge{stroke:#26384c;stroke-width:3;cursor:pointer}.parcel-edge.frontage{stroke:#f97316;stroke-width:6}.parcel-point{fill:#0d1b33;stroke:#f8cf75;stroke-width:1.5}.point-label{fill:#0d1b33;font-size:10px;font-weight:900}.sketch-actions{display:flex;gap:8px;margin-top:8px}
        .vertex-panel{display:grid;gap:11px;align-content:start}.vertex-panel label{display:grid;gap:6px;color:#c3c9d2;font-size:11px;font-weight:800}.vertex-panel textarea,.vertex-panel input{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#0c0f15;color:#f3f5f7;padding:10px;outline:0}.vertex-panel textarea{min-height:170px;resize:vertical;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.vertex-panel textarea:focus,.vertex-panel input:focus{border-color:rgba(245,158,11,.5)}.vertex-note{margin:0;color:#7e8794;font-size:10px;line-height:1.45}.vertex-error{margin:0;color:#fca5a5;font-size:10px;line-height:1.45}
        .lot-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.lot-facts div{border:1px solid rgba(255,255,255,.08);background:#0c0f15;border-radius:10px;padding:10px}.lot-facts span{display:block;color:#7f8793;font-size:9px;text-transform:uppercase;letter-spacing:.06em}.lot-facts strong{display:block;margin-top:4px;font-size:12px;color:#f3f5f7}.screen-note{margin:11px 0 0;color:#9ba3af;font-size:11px;line-height:1.5}.screen-note strong{color:#f8cf75}
        @media(max-width:760px){.irregular-head{display:block}.lot-record{display:inline-block;margin-top:10px}.sketch-grid{grid-template-columns:1fr}.lot-facts{grid-template-columns:1fr 1fr}.lot-sketch{min-height:230px}}
      `}</style>
    </section>
  );
}
