"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  CandidateComponent,
  CandidateRecord,
  OpeningComponent,
  PathComponent,
  PlacementComponent,
  PolygonComponent
} from "@/packages/candidates";
import { isInterventionEditable } from "@/packages/candidates/intervention";

export type DirectManipulation =
  | { kind: "move-placement"; componentId: string; x: number; y: number }
  | { kind: "rotate-placement"; componentId: string; rotationDeg: number }
  | { kind: "move-path-point"; componentId: string; pointIndex: number; point: readonly [number, number] }
  | { kind: "move-pavement-vertex"; componentId: string; vertexIndex: number; point: readonly [number, number] }
  | { kind: "move-opening"; componentId: string; offsetFt: number };
type Point = readonly [number, number];
type DragState =
  | { kind: "placement"; pointerId: number; componentId: string; start: Point; startX: number; startY: number }
  | { kind: "rotation"; pointerId: number; componentId: string; center: Point; limit: number }
  | { kind: "path-point"; pointerId: number; componentId: string; pointIndex: number }
  | { kind: "pavement-vertex"; pointerId: number; componentId: string; vertexIndex: number }
  | { kind: "opening"; pointerId: number; componentId: string; ownerId: string };

type Preview =
  | { kind: "placement"; componentId: string; x: number; y: number }
  | { kind: "rotation"; componentId: string; rotationDeg: number }
  | { kind: "path-point"; componentId: string; pointIndex: number; point: Point }
  | { kind: "pavement-vertex"; componentId: string; vertexIndex: number; point: Point }
  | { kind: "opening"; componentId: string; offsetFt: number }
  | null;

const pointString = (polygon: ReadonlyArray<Point>) => polygon.map(([x, y]) => `${x},${y}`).join(" ");
const roundQuarter = (value: number) => Math.round(value * 4) / 4;
const roundDegree = (value: number) => Math.round(value);
function rotatePoint(point: Point, origin: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180;
  const c = Math.cos(radians), s = Math.sin(radians);
  const x = point[0] - origin[0], y = point[1] - origin[1];
  return [origin[0] + x * c - y * s, origin[1] + x * s + y * c];
}

function placementTransform(item: PlacementComponent) {
  const rotation = item.rotationDeg ?? 0;
  if (!rotation) return undefined;
  const cx = item.x + item.widthFt / 2, cy = item.y + item.depthFt / 2;
  return `rotate(${rotation} ${cx} ${cy})`;
}

function stallPolygon(component: Extract<CandidateComponent, { kind: "stall" }>) {
  const length = 20.5, width = 8, rearOverhang = 4;
  const heading = component.headingDeg * Math.PI / 180;
  const hx = Math.cos(heading), hy = Math.sin(heading), wx = -hy, wy = hx;
  const centerOffset = length / 2 - rearOverhang;
  const cx = component.axleX + hx * centerOffset, cy = component.axleY + hy * centerOffset;
  const hl = length / 2, hw = width / 2;
  return [[cx + hx*hl + wx*hw, cy + hy*hl + wy*hw], [cx + hx*hl - wx*hw, cy + hy*hl - wy*hw],
    [cx - hx*hl - wx*hw, cy - hy*hl - wy*hw], [cx - hx*hl + wx*hw, cy - hy*hl + wy*hw]] as Point[];
}
export function DirectManipulationPlan({ candidate, selectedComponentId, disabled = false, onSelectComponent, onCommit }: {
  candidate: CandidateRecord;
  selectedComponentId?: string | null;
  disabled?: boolean;
  onSelectComponent?: (componentId: string) => void;
  onCommit: (change: DirectManipulation) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const previewRef = useRef<Preview>(null);
  const placements = useMemo(() => candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage"), [candidate.components]);
  const placementById = useMemo(() => new Map(placements.map((item) => [item.id, item])), [placements]);
  const parcels = candidate.components.filter((item): item is PolygonComponent => item.kind === "parcel");
  const envelopes = candidate.components.filter((item): item is PolygonComponent => item.kind === "envelope");
  const pavement = candidate.components.filter((item): item is PolygonComponent => item.kind === "pavement");
  const paths = candidate.components.filter((item): item is PathComponent => item.kind === "driveway" || item.kind === "route");
  const stalls = candidate.components.filter((item) => item.kind === "stall");
  const openings = candidate.components.filter((item): item is OpeningComponent => item.kind === "opening");

  const svgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return [0, 0];
    const mapped = point.matrixTransform(matrix.inverse());
    return [mapped.x, mapped.y];
  };
  function displayPlacement(item: PlacementComponent): PlacementComponent {
    if (preview?.componentId !== item.id) return item;
    if (preview.kind === "placement") {
      const dx = preview.x - item.x, dy = preview.y - item.y;
      return { ...item, x: preview.x, y: preview.y, polygon: item.polygon?.map(([x, y]) => [x + dx, y + dy]) };
    }
    if (preview.kind === "rotation") return { ...item, rotationDeg: preview.rotationDeg };
    return item;
  }

  function displayPath(item: PathComponent) {
    if (preview?.kind !== "path-point" || preview.componentId !== item.id) return item.points;
    return item.points.map((point, index) => index === preview.pointIndex ? preview.point : point);
  }

  function displayPavement(item: PolygonComponent) {
    if (preview?.kind !== "pavement-vertex" || preview.componentId !== item.id) return item.polygon;
    return item.polygon.map((point, index) => index === preview.vertexIndex ? preview.point : point);
  }

  function displayOpening(item: OpeningComponent) {
    if (preview?.kind === "opening" && preview.componentId === item.id) return { ...item, offsetFt: preview.offsetFt };
    return item;
  }

  function displayStall(item: Extract<CandidateComponent, { kind: "stall" }>) {
    if (!preview || (preview.kind !== "placement" && preview.kind !== "rotation") || preview.componentId !== item.garageId) return item;
    const rawOwner = placementById.get(item.garageId);
    if (!rawOwner) return item;
    const owner = displayPlacement(rawOwner);
    const oldCenter: Point = [rawOwner.x + rawOwner.widthFt / 2, rawOwner.y + rawOwner.depthFt / 2];
    const newCenter: Point = [owner.x + owner.widthFt / 2, owner.y + owner.depthFt / 2];
    const deltaRotation = (owner.rotationDeg ?? 0) - (rawOwner.rotationDeg ?? 0);
    const rotated = rotatePoint([item.axleX, item.axleY], oldCenter, deltaRotation);
    return { ...item, axleX: rotated[0] + newCenter[0] - oldCenter[0], axleY: rotated[1] + newCenter[1] - oldCenter[1], headingDeg: item.headingDeg + deltaRotation };
  }

  const updatePreview = (next: Preview) => { previewRef.current = next; setPreview(next); };

  function begin(event: ReactPointerEvent<SVGElement>, state: DragState, componentId: string) {
    if (disabled) return;
    event.preventDefault(); event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = state; setDrag(state); updatePreview(null); onSelectComponent?.(componentId);
  }
  function handleMove(event: ReactPointerEvent<SVGSVGElement>) {
    const active = dragRef.current;
    if (!active || disabled) return;
    const point = svgPoint(event.clientX, event.clientY);
    if (active.kind === "placement") {
      updatePreview({ kind: "placement", componentId: active.componentId,
        x: roundQuarter(active.startX + point[0] - active.start[0]),
        y: roundQuarter(active.startY + point[1] - active.start[1]) });
      return;
    }
    if (active.kind === "rotation") {
      let rotationDeg = roundDegree(Math.atan2(point[1] - active.center[1], point[0] - active.center[0]) * 180 / Math.PI + 90);
      rotationDeg = Math.max(-active.limit, Math.min(active.limit, rotationDeg));
      updatePreview({ kind: "rotation", componentId: active.componentId, rotationDeg });
      return;
    }
    if (active.kind === "path-point") {
      updatePreview({ kind: "path-point", componentId: active.componentId, pointIndex: active.pointIndex, point: [roundQuarter(point[0]), roundQuarter(point[1])] });
      return;
    }
    if (active.kind === "pavement-vertex") {
      updatePreview({ kind: "pavement-vertex", componentId: active.componentId, vertexIndex: active.vertexIndex, point: [roundQuarter(point[0]), roundQuarter(point[1])] });
      return;
    }
    const opening = openings.find((item) => item.id === active.componentId);
    const owner = active.kind === "opening" ? placementById.get(active.ownerId) : undefined;
    if (!opening || !owner) return;
    const center: Point = [owner.x + owner.widthFt / 2, owner.y + owner.depthFt / 2];
    const local = rotatePoint(point, center, -(owner.rotationDeg ?? 0));
    const wallLength = opening.wall === "east" || opening.wall === "west" ? owner.depthFt : owner.widthFt;
    const coordinate = opening.wall === "east" || opening.wall === "west" ? local[1] - owner.y : local[0] - owner.x;
    const offsetFt = Math.max(0, Math.min(wallLength - opening.openingWidthFt, roundQuarter(coordinate - opening.openingWidthFt / 2)));
    updatePreview({ kind: "opening", componentId: opening.id, offsetFt });
  }
  function finish(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const committed = previewRef.current;
    if (committed) {
      if (committed.kind === "placement") onCommit({ kind: "move-placement", componentId: committed.componentId, x: committed.x, y: committed.y });
      if (committed.kind === "rotation") onCommit({ kind: "rotate-placement", componentId: committed.componentId, rotationDeg: committed.rotationDeg });
      if (committed.kind === "path-point") onCommit({ kind: "move-path-point", componentId: committed.componentId, pointIndex: committed.pointIndex, point: committed.point });
      if (committed.kind === "pavement-vertex") onCommit({ kind: "move-pavement-vertex", componentId: committed.componentId, vertexIndex: committed.vertexIndex, point: committed.point });
      if (committed.kind === "opening") onCommit({ kind: "move-opening", componentId: committed.componentId, offsetFt: committed.offsetFt });
    }
    try { svgRef.current?.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    dragRef.current = null; previewRef.current = null; setDrag(null); setPreview(null);
  }

  const selectableClass = (item: CandidateComponent, base: string) => `${base}${isInterventionEditable(item) ? " candidate-plan-selectable" : ""}${selectedComponentId === item.id ? " candidate-plan-selected" : ""}`;
  const click = (item: CandidateComponent) => (event: ReactPointerEvent<SVGElement>) => {
    event.stopPropagation(); onSelectComponent?.(item.id);
  };

  return <svg ref={svgRef} className={`candidate-plan-svg direct-manipulation-plan${drag ? " is-dragging" : ""}`} viewBox="-4 -4 166 66"
    role="img" aria-label={`${candidate.label} direct manipulation plan`}
    onPointerMove={handleMove} onPointerUp={finish} onPointerCancel={finish}>
    <rect x="-4" y="-4" width="166" height="66" className="candidate-plan-bg" />
    {parcels.map((item) => <polygon key={item.id} points={pointString(item.polygon)} className="candidate-plan-parcel" />)}
    {envelopes.map((item) => <polygon key={item.id} points={pointString(item.polygon)} className="candidate-plan-envelope" />)}
    {pavement.map((item) => {
      const polygon = displayPavement(item);
      return <g key={item.id} className={selectableClass(item, "direct-pavement-group")} onPointerDown={click(item)}>
        <polygon points={pointString(polygon)} className="candidate-plan-pavement" />
      </g>;
    })}
    {paths.map((item) => {
      const routePoints = displayPath(item);
      return <g key={item.id} className={selectableClass(item, "direct-path-group")} onPointerDown={click(item)}>
        <polyline points={pointString(routePoints)} className="candidate-plan-route direct-route-hit" />
      </g>;
    })}
    {placements.map((rawItem) => {
      const item = displayPlacement(rawItem);
      const movable = !rawItem.locked && rawItem.movable !== false;
      return <g key={item.id} data-component-id={item.id} transform={placementTransform(item)}
        className={selectableClass(rawItem, `candidate-plan-component component-${item.kind}${movable ? " direct-draggable-placement" : ""}`)}
        onPointerDown={movable ? (event) => begin(event, { kind: "placement", pointerId: event.pointerId, componentId: rawItem.id,
          start: svgPoint(event.clientX, event.clientY), startX: rawItem.x, startY: rawItem.y }, rawItem.id) : click(rawItem)}>
        {item.polygon ? <polygon points={pointString(item.polygon)} /> : <rect x={item.x} y={item.y} width={item.widthFt} height={item.depthFt} rx=".5" />}
        <text x={item.x + item.widthFt / 2} y={item.y + item.depthFt / 2}>{item.label}</text>
      </g>;
    })}
    {placements.map((rawItem) => {
      const item = displayPlacement(rawItem);
      const canRotate = !rawItem.locked && (rawItem.kind === "garage" || !rawItem.polygon);
      if (!canRotate || selectedComponentId !== rawItem.id) return null;
      const center: Point = [item.x + item.widthFt / 2, item.y + item.depthFt / 2];
      const top: Point = rotatePoint([center[0], item.y], center, item.rotationDeg ?? 0);
      const knob: Point = rotatePoint([center[0], item.y - 4], center, item.rotationDeg ?? 0);
      const limit = rawItem.rotationLimitDeg ?? (rawItem.kind === "garage" ? 45 : 30);
      return <g key={`${rawItem.id}-rotate`} className="direct-rotation-control">
        <line x1={top[0]} y1={top[1]} x2={knob[0]} y2={knob[1]} />
        <circle cx={knob[0]} cy={knob[1]} r="1.45" onPointerDown={(event) => begin(event,
          { kind: "rotation", pointerId: event.pointerId, componentId: rawItem.id, center, limit }, rawItem.id)} />
      </g>;
    })}
    {openings.map((rawOpening) => {
      const item = displayOpening(rawOpening);
      const rawOwner = placementById.get(item.ownerId);
      if (!rawOwner) return null;
      const owner = displayPlacement(rawOwner);
      const transform = placementTransform(owner);
      const start = item.offsetFt, end = item.offsetFt + item.openingWidthFt;
      const props = { transform, className: "candidate-plan-opening direct-opening-line" };
      if (item.wall === "east") return <line key={item.id} {...props} x1={owner.x + owner.widthFt} y1={owner.y + start} x2={owner.x + owner.widthFt} y2={owner.y + end} />;
      if (item.wall === "west") return <line key={item.id} {...props} x1={owner.x} y1={owner.y + start} x2={owner.x} y2={owner.y + end} />;
      if (item.wall === "north") return <line key={item.id} {...props} x1={owner.x + start} y1={owner.y} x2={owner.x + end} y2={owner.y} />;
      return <line key={item.id} {...props} x1={owner.x + start} y1={owner.y + owner.depthFt} x2={owner.x + end} y2={owner.y + owner.depthFt} />;
    })}
    {stalls.map((item) => <polygon key={item.id} points={pointString(stallPolygon(displayStall(item)))} className="candidate-plan-stall" />)}
    {paths.flatMap((item) => displayPath(item).map((point, index) => {
      const movable = !item.locked && (!item.movableControlPoints?.length || item.movableControlPoints.includes(index));
      return <circle key={`${item.id}-${index}`} cx={point[0]} cy={point[1]} r={movable ? 1.45 : .85}
        className={`direct-control-handle route-handle${movable ? " movable" : " locked"}`}
        onPointerDown={movable ? (event) => begin(event,
          { kind: "path-point", pointerId: event.pointerId, componentId: item.id, pointIndex: index }, item.id) : undefined} />;
    }))}
    {pavement.flatMap((item) => selectedComponentId === item.id && !item.locked ? displayPavement(item).map((point, index) =>
      <circle key={`${item.id}-${index}`} cx={point[0]} cy={point[1]} r="1.25" className="direct-control-handle pavement-handle"
        onPointerDown={(event) => begin(event, { kind: "pavement-vertex", pointerId: event.pointerId, componentId: item.id, vertexIndex: index }, item.id)} />) : [])}
    {openings.map((rawOpening) => {
      const item = displayOpening(rawOpening), rawOwner = placementById.get(item.ownerId);
      if (!rawOwner || rawOpening.locked) return null;
      const owner = displayPlacement(rawOwner), mid = item.offsetFt + item.openingWidthFt / 2;
      const center: Point = [owner.x + owner.widthFt / 2, owner.y + owner.depthFt / 2];
      const local: Point = item.wall === "east" ? [owner.x + owner.widthFt, owner.y + mid] : item.wall === "west" ? [owner.x, owner.y + mid] : item.wall === "north" ? [owner.x + mid, owner.y] : [owner.x + mid, owner.y + owner.depthFt];
      const point = rotatePoint(local, center, owner.rotationDeg ?? 0);
      return <circle key={`${item.id}-handle`} cx={point[0]} cy={point[1]} r="1.1" className="direct-control-handle direct-opening-node"
        onPointerDown={(event) => begin(event, { kind: "opening", pointerId: event.pointerId, componentId: item.id, ownerId: item.ownerId }, item.id)} />;
    })}
    <line x1="148" y1="0" x2="148" y2="50" className="candidate-plan-street" />
    <text x="153" y="25" transform="rotate(90 153 25)" className="candidate-plan-street-label">PENNSYLVANIA</text>
  </svg>;
}
