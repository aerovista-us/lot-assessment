"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from "react";
import type {
  CandidateComponent,
  CandidateRecord,
  OpeningComponent,
  PathComponent,
  PlacementComponent,
  PolygonComponent,
  RoofComponent
} from "@/packages/candidates";
import { isInterventionEditable } from "@/packages/candidates/intervention";
import { assertPolygonIntegrity, polygonWinding } from "@/packages/candidates/geometry-integrity";
import { placementShapeIdentity, placementWallId } from "@/packages/candidates/shape-topology";
import { validateCandidateRoofs } from "@/packages/roof-geometry";

export type DirectManipulation =
  | { kind: "move-placement"; componentId: string; x: number; y: number }
  | { kind: "rotate-placement"; componentId: string; rotationDeg: number }
  | { kind: "move-path-point"; componentId: string; pointIndex: number; point: readonly [number, number] }
  | { kind: "move-pavement-vertex"; componentId: string; vertexIndex: number; point: readonly [number, number] }
  | { kind: "move-opening"; componentId: string; offsetFt: number }
  | { kind: "move-building-vertex"; componentId: string; vertexIndex: number; vertexId: string; point: readonly [number, number] }
  | { kind: "resize-building-wall"; componentId: string; wallIndex: number; wallId: string; lengthDeltaFt: number }
  | { kind: "insert-building-vertex"; componentId: string; wallIndex: number; wallId: string; point: readonly [number, number] }
  | { kind: "remove-building-vertex"; componentId: string; vertexIndex: number; vertexId: string };
type Point = readonly [number, number];
type DragState =
  | { kind: "placement"; pointerId: number; componentId: string; start: Point; startX: number; startY: number }
  | { kind: "rotation"; pointerId: number; componentId: string; center: Point; limit: number }
  | { kind: "path-point"; pointerId: number; componentId: string; pointIndex: number }
  | { kind: "pavement-vertex"; pointerId: number; componentId: string; vertexIndex: number }
  | { kind: "opening"; pointerId: number; componentId: string; ownerId: string }
  | { kind: "building-vertex"; pointerId: number; componentId: string; vertexIndex: number }
  | { kind: "building-wall"; pointerId: number; componentId: string; wallIndex: number; start: Point; startLength: number; unit: Point };

type Preview =
  | { kind: "placement"; componentId: string; x: number; y: number }
  | { kind: "rotation"; componentId: string; rotationDeg: number }
  | { kind: "path-point"; componentId: string; pointIndex: number; point: Point }
  | { kind: "pavement-vertex"; componentId: string; vertexIndex: number; point: Point }
  | { kind: "opening"; componentId: string; offsetFt: number }
  | { kind: "building-vertex"; componentId: string; vertexIndex: number; point: Point }
  | { kind: "building-wall"; componentId: string; wallIndex: number; lengthDeltaFt: number; lengthFt: number }
  | null;

const pointString = (polygon: ReadonlyArray<Point>) => polygon.map(([x, y]) => `${x},${y}`).join(" ");
const snapTo = (value: number, step: number) => step > 0 ? Math.round(value / step) * step : value;
const DEFAULT_VIEW = { x: -4, y: -4, width: 166, height: 66 };
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
export function DirectManipulationPlan({ candidate, selectedComponentId, disabled = false, onSelectComponent, onMirrorPlacement, onCommit }: {
  candidate: CandidateRecord;
  selectedComponentId?: string | null;
  disabled?: boolean;
  onSelectComponent?: (componentId: string) => void;
  onMirrorPlacement?: (componentId: string, axis: "horizontal" | "vertical") => void;
  onCommit: (change: DirectManipulation) => void;
}) {
  const planRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [snapFt, setSnapFt] = useState(.25);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEW);
  const [contextMenu, setContextMenu] = useState<null | {
    left:number; top:number; svgX:number; svgY:number; componentId?:string; wallIndex?:number; wallId?:string; vertexIndex?:number; vertexId?:string;
  }>(null);
  const previewRef = useRef<Preview>(null);
  const placements = useMemo(() => candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage"), [candidate.components]);
  const placementById = useMemo(() => new Map(placements.map((item) => [item.id, item])), [placements]);
  const parcels = candidate.components.filter((item): item is PolygonComponent => item.kind === "parcel");
  const envelopes = candidate.components.filter((item): item is PolygonComponent => item.kind === "envelope");
  const pavement = candidate.components.filter((item): item is PolygonComponent => item.kind === "pavement");
  const paths = candidate.components.filter((item): item is PathComponent => item.kind === "driveway" || item.kind === "route");
  const stalls = candidate.components.filter((item) => item.kind === "stall");
  const openings = candidate.components.filter((item): item is OpeningComponent => item.kind === "opening");
  const roofs = candidate.components.filter((item): item is RoofComponent => item.kind === "roof");
  const roofValidationById = useMemo(() => new Map(validateCandidateRoofs(candidate.components).results.map((result) => [result.roofId, result])), [candidate.components]);

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

  function placementPolygonPoints(item: PlacementComponent): Point[] {
    const base = item.polygon ?? [
      [item.x, item.y], [item.x + item.widthFt, item.y],
      [item.x + item.widthFt, item.y + item.depthFt], [item.x, item.y + item.depthFt]
    ] as Point[];
    if (!preview || preview.componentId !== item.id) return base;
    if (preview.kind === "building-vertex") return base.map((point, index) => index === preview.vertexIndex ? preview.point : point);
    if (preview.kind === "building-wall") {
      const aIndex = preview.wallIndex, bIndex = (aIndex + 1) % base.length;
      const half = preview.lengthDeltaFt / 2, [ux, uy] = [
        (base[bIndex][0] - base[aIndex][0]) / Math.max(.001, Math.hypot(base[bIndex][0] - base[aIndex][0], base[bIndex][1] - base[aIndex][1])),
        (base[bIndex][1] - base[aIndex][1]) / Math.max(.001, Math.hypot(base[bIndex][0] - base[aIndex][0], base[bIndex][1] - base[aIndex][1]))
      ];
      return base.map((point, index) => index === aIndex ? [point[0] - ux * half, point[1] - uy * half] : index === bIndex ? [point[0] + ux * half, point[1] + uy * half] : point);
    }
    return base;
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

  function fitSelection() {
    const item = selectedComponentId ? placementById.get(selectedComponentId) : undefined;
    if (!item) { setViewBox(DEFAULT_VIEW); return; }
    const polygon = placementPolygonPoints(item);
    const xs = polygon.map(([x]) => x), ys = polygon.map(([, y]) => y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const pad=Math.max(6, Math.max(maxX-minX,maxY-minY)*.35);
    setViewBox({x:minX-pad,y:minY-pad,width:Math.max(24,maxX-minX+pad*2),height:Math.max(18,maxY-minY+pad*2)});
  }
  function zoomAt(factor: number, point?: Point) {
    const anchor=point ?? [viewBox.x+viewBox.width/2, viewBox.y+viewBox.height/2] as Point;
    const width=Math.max(18,Math.min(220,viewBox.width*factor));
    const ratio=width/viewBox.width, height=viewBox.height*ratio;
    setViewBox({x:anchor[0]-(anchor[0]-viewBox.x)*ratio,y:anchor[1]-(anchor[1]-viewBox.y)*ratio,width,height});
  }
  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoomAt(event.deltaY < 0 ? .86 : 1.16, svgPoint(event.clientX,event.clientY));
  }
  function previewIntegrity(item: PlacementComponent) {
    if (!preview || preview.componentId !== item.id || (preview.kind !== "building-vertex" && preview.kind !== "building-wall")) return true;
    try {
      const original=item.polygon ?? [[item.x,item.y],[item.x+item.widthFt,item.y],[item.x+item.widthFt,item.y+item.depthFt],[item.x,item.y+item.depthFt]] as Point[];
      assertPolygonIntegrity(placementPolygonPoints(item),{label:"Building footprint",minVertices:4,minEdgeFt:.5,minAreaSqFt:4,expectedWinding:polygonWinding(original)});
      return true;
    } catch { return false; }
  }

  useEffect(() => {
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        setContextMenu(null); dragRef.current=null; previewRef.current=null; setDrag(null); setPreview(null);
      }
      if((event.key==="Delete"||event.key==="Backspace") && contextMenu?.componentId && contextMenu.vertexIndex!==undefined){
        const item=placementById.get(contextMenu.componentId);
        const count=item ? placementPolygonPoints(item).length : 0;
        if(item && count>4){ event.preventDefault(); runContext({kind:"remove-building-vertex",componentId:item.id,vertexIndex:contextMenu.vertexIndex,vertexId:contextMenu.vertexId ?? placementShapeIdentity(item).vertexIds[contextMenu.vertexIndex]}); }
      }
    };
    window.addEventListener("keydown",onKeyDown);
    return ()=>window.removeEventListener("keydown",onKeyDown);
  },[contextMenu,candidate.updatedAt]);

  function openContextMenu(event: ReactMouseEvent<SVGElement>, target: {componentId?:string;wallIndex?:number;wallId?:string;vertexIndex?:number;vertexId?:string} = {}) {
    if (disabled) return;
    event.preventDefault(); event.stopPropagation();
    const point=svgPoint(event.clientX,event.clientY);
    if(target.componentId) onSelectComponent?.(target.componentId);
    const bounds=planRef.current?.getBoundingClientRect();
    const menuWidth=196, menuHeight=190, inset=8;
    const left=bounds ? Math.max(inset,Math.min(event.clientX-bounds.left,bounds.width-menuWidth-inset)) : event.clientX;
    const top=bounds ? Math.max(inset,Math.min(event.clientY-bounds.top,bounds.height-menuHeight-inset)) : event.clientY;
    setContextMenu({left,top,svgX:snapTo(point[0],snapFt),svgY:snapTo(point[1],snapFt),...target});
  }
  function runContext(action: DirectManipulation) { onCommit(action); setContextMenu(null); }


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
        x: snapTo(active.startX + point[0] - active.start[0], snapFt),
        y: snapTo(active.startY + point[1] - active.start[1], snapFt) });
      return;
    }
    if (active.kind === "rotation") {
      let rotationDeg = roundDegree(Math.atan2(point[1] - active.center[1], point[0] - active.center[0]) * 180 / Math.PI + 90);
      rotationDeg = Math.max(-active.limit, Math.min(active.limit, rotationDeg));
      updatePreview({ kind: "rotation", componentId: active.componentId, rotationDeg });
      return;
    }
    if (active.kind === "building-vertex") {
      updatePreview({ kind: "building-vertex", componentId: active.componentId, vertexIndex: active.vertexIndex, point: [snapTo(point[0],snapFt), snapTo(point[1],snapFt)] });
      return;
    }
    if (active.kind === "building-wall") {
      const dx = point[0] - active.start[0], dy = point[1] - active.start[1];
      const projected = dx * active.unit[0] + dy * active.unit[1];
      const delta = snapTo(projected * 2, snapFt);
      updatePreview({ kind: "building-wall", componentId: active.componentId, wallIndex: active.wallIndex, lengthDeltaFt: delta, lengthFt: Math.max(2, snapTo(active.startLength + delta,snapFt)) });
      return;
    }
    if (active.kind === "path-point") {
      updatePreview({ kind: "path-point", componentId: active.componentId, pointIndex: active.pointIndex, point: [snapTo(point[0],snapFt), snapTo(point[1],snapFt)] });
      return;
    }
    if (active.kind === "pavement-vertex") {
      updatePreview({ kind: "pavement-vertex", componentId: active.componentId, vertexIndex: active.vertexIndex, point: [snapTo(point[0],snapFt), snapTo(point[1],snapFt)] });
      return;
    }
    const opening = openings.find((item) => item.id === active.componentId);
    const owner = active.kind === "opening" ? placementById.get(active.ownerId) : undefined;
    if (!opening || !owner) return;
    const center: Point = [owner.x + owner.widthFt / 2, owner.y + owner.depthFt / 2];
    const local = rotatePoint(point, center, -(owner.rotationDeg ?? 0));
    const wallLength = opening.wall === "east" || opening.wall === "west" ? owner.depthFt : owner.widthFt;
    const coordinate = opening.wall === "east" || opening.wall === "west" ? local[1] - owner.y : local[0] - owner.x;
    const offsetFt = Math.max(0, Math.min(wallLength - opening.openingWidthFt, snapTo(coordinate - opening.openingWidthFt / 2,snapFt)));
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
      if (committed.kind === "building-vertex") { const item=placementById.get(committed.componentId); if(item) onCommit({ kind: "move-building-vertex", componentId: committed.componentId, vertexIndex: committed.vertexIndex, vertexId: placementShapeIdentity(item).vertexIds[committed.vertexIndex], point: committed.point }); }
      if (committed.kind === "building-wall") { const item=placementById.get(committed.componentId); if(item) onCommit({ kind: "resize-building-wall", componentId: committed.componentId, wallIndex: committed.wallIndex, wallId: placementWallId(placementShapeIdentity(item).vertexIds, committed.wallIndex), lengthDeltaFt: committed.lengthDeltaFt }); }
    }
    try { svgRef.current?.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    dragRef.current = null; previewRef.current = null; setDrag(null); setPreview(null);
  }

  const selectableClass = (item: CandidateComponent, base: string) => `${base}${isInterventionEditable(item) ? " candidate-plan-selectable" : ""}${selectedComponentId === item.id ? " candidate-plan-selected" : ""}`;
  const click = (item: CandidateComponent) => (event: ReactPointerEvent<SVGElement>) => {
    event.stopPropagation(); onSelectComponent?.(item.id);
  };

  return <div ref={planRef} className="direct-manipulation-wrap" onPointerDownCapture={(event)=>{ const target=event.target as Element; if(contextMenu && !target.closest(".direct-context-menu")) setContextMenu(null); }}><div className="direct-plan-toolbar"><button type="button" onClick={()=>zoomAt(.82)}>+</button><button type="button" onClick={()=>zoomAt(1.22)}>−</button><button type="button" onClick={()=>setViewBox(DEFAULT_VIEW)}>Fit all</button><button type="button" onClick={fitSelection} disabled={!selectedComponentId}>Fit selection</button><span>Snap</span>{([1,.5,.25,0] as const).map((step)=><button type="button" key={step} className={snapFt===step?"active":""} onClick={()=>setSnapFt(step)}>{step===1?"1′":step===.5?"6\"":step===.25?"3\"":"Free"}</button>)}</div><svg ref={svgRef} className={`candidate-plan-svg direct-manipulation-plan${drag ? " is-dragging" : ""}`} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
    role="img" aria-label={`${candidate.label} direct manipulation plan`}
    onContextMenu={(event)=>openContextMenu(event)}
    onPointerDown={(event)=>{ if(event.button===0 && event.target===event.currentTarget) setContextMenu(null); }}
    onWheel={handleWheel} onPointerMove={handleMove} onPointerUp={finish} onPointerCancel={finish}>
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
      const livePolygon = item.polygon && selectedComponentId===rawItem.id ? placementPolygonPoints(item) : item.polygon;
      const invalidPreview = !previewIntegrity(rawItem);
      return <g key={item.id} data-component-id={item.id} transform={placementTransform(item)}
        className={selectableClass(rawItem, `candidate-plan-component component-${item.kind}${movable ? " direct-draggable-placement" : ""}${invalidPreview ? " direct-preview-invalid" : ""}`)}
        onContextMenu={(event)=>openContextMenu(event,{componentId:rawItem.id})}
        onPointerDown={movable ? (event) => begin(event, { kind: "placement", pointerId: event.pointerId, componentId: rawItem.id,
          start: svgPoint(event.clientX, event.clientY), startX: rawItem.x, startY: rawItem.y }, rawItem.id) : click(rawItem)}>
        {livePolygon ? <polygon points={pointString(livePolygon)} /> : <rect x={item.x} y={item.y} width={item.widthFt} height={item.depthFt} rx=".5" />}
        <text x={item.x + item.widthFt / 2} y={item.y + item.depthFt / 2}>{item.label}</text>
      </g>;
    })}
    {placements.flatMap((rawItem) => {
      if (selectedComponentId !== rawItem.id || rawItem.locked || !rawItem.resizable) return [];
      const item = displayPlacement(rawItem), polygon = placementPolygonPoints(item), identity = placementShapeIdentity(rawItem);
      const wallControls = polygon.map((a, wallIndex) => {
        const b = polygon[(wallIndex + 1) % polygon.length], mid: Point = [(a[0]+b[0])/2,(a[1]+b[1])/2];
        const length = Math.hypot(b[0]-a[0],b[1]-a[1]), unit: Point = [(b[0]-a[0])/Math.max(.001,length),(b[1]-a[1])/Math.max(.001,length)];
        const shownLength = preview?.kind === "building-wall" && preview.componentId === rawItem.id && preview.wallIndex === wallIndex ? preview.lengthFt : length;
        const wallId = placementWallId(identity.vertexIds, wallIndex);
        return <g key={`${rawItem.id}-wall-${wallIndex}`} className="direct-building-wall-control" onContextMenu={(event)=>openContextMenu(event,{componentId:rawItem.id,wallIndex,wallId})}>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
          <circle cx={mid[0]} cy={mid[1]} r="1.15" onPointerDown={(event) => begin(event,{kind:"building-wall",pointerId:event.pointerId,componentId:rawItem.id,wallIndex,start:svgPoint(event.clientX,event.clientY),startLength:length,unit},rawItem.id)} />
          <circle cx={mid[0]} cy={mid[1]} r=".55" className="building-add-point-handle" onDoubleClick={(event) => { event.stopPropagation(); onCommit({kind:"insert-building-vertex",componentId:rawItem.id,wallIndex,wallId,point:mid}); }} />
          <text x={mid[0]} y={mid[1]-1.8}>{shownLength.toFixed(1)}′</text>
        </g>;
      });
      const vertexControls = polygon.map((point, vertexIndex) => { const vertexId=identity.vertexIds[vertexIndex]; return <g key={`${rawItem.id}-vertex-${vertexId}`} onContextMenu={(event)=>openContextMenu(event,{componentId:rawItem.id,vertexIndex,vertexId})}><circle cx={point[0]} cy={point[1]} r="1.05" className="direct-control-handle building-vertex-handle" onPointerDown={(event) => begin(event,{kind:"building-vertex",pointerId:event.pointerId,componentId:rawItem.id,vertexIndex},rawItem.id)} onDoubleClick={(event) => { event.stopPropagation(); if(polygon.length>4) onCommit({kind:"remove-building-vertex",componentId:rawItem.id,vertexIndex,vertexId}); }} /><title>{polygon.length>4?`Drag ${vertexId} · double-click to remove point`:`Drag ${vertexId}`}</title></g>; });
      return [...wallControls,...vertexControls];
    })}
    {placements.map((rawItem) => {
      const item = displayPlacement(rawItem);
      const canRotate = !rawItem.locked && rawItem.movable !== false;
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
    {roofs.flatMap((roof) => {
      const validation = roofValidationById.get(roof.id);
      const ownerPreviewActive = Boolean(preview && preview.componentId === roof.ownerId
        && ["placement", "rotation", "building-vertex", "building-wall"].includes(preview.kind));
      const roofClass = ownerPreviewActive ? "roof-unlocked"
        : validation?.authoritative ? "roof-locked"
        : validation?.status === "FAIL_CLOSED_INVALID" ? "roof-invalid"
        : "roof-unlocked";
      const displayZones = Array.isArray((roof as unknown as { zones?: unknown }).zones)
        ? (roof.zones ?? []).filter((zone) => Boolean(zone && typeof zone === "object"))
        : [];
      return displayZones.map((zone) => {
      if (!zone.ridgeA || !zone.ridgeB) return null;
      return <g key={`${roof.id}-${zone.id}`} data-component-id={roof.id}
        className={selectableClass(roof, `candidate-plan-roof ${roofClass}`)}
        onPointerDown={click(roof)}>
        <line x1={zone.ridgeA[0]} y1={zone.ridgeA[1]} x2={zone.ridgeB[0]} y2={zone.ridgeB[1]} />
        <text x={(zone.ridgeA[0] + zone.ridgeB[0]) / 2} y={(zone.ridgeA[1] + zone.ridgeB[1]) / 2 - 1.2}>{zone.label}</text>
      </g>;
    });
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
  </svg>
    {contextMenu && (()=> {
      const item=contextMenu.componentId ? placementById.get(contextMenu.componentId) : undefined;
      const polygon=item ? placementPolygonPoints(item) : [];
      return <div className="direct-context-menu" style={{left:contextMenu.left,top:contextMenu.top}} onContextMenu={(event)=>event.preventDefault()}>
          {item && contextMenu.wallIndex !== undefined && <button onClick={()=>runContext({kind:"insert-building-vertex",componentId:item.id,wallIndex:contextMenu.wallIndex!,wallId:contextMenu.wallId ?? placementWallId(placementShapeIdentity(item).vertexIds,contextMenu.wallIndex!),point:[contextMenu.svgX,contextMenu.svgY]})}>Add deflection point <kbd>A</kbd></button>}
          {item && contextMenu.vertexIndex !== undefined && polygon.length>4 && <button className="danger" onClick={()=>runContext({kind:"remove-building-vertex",componentId:item.id,vertexIndex:contextMenu.vertexIndex!,vertexId:contextMenu.vertexId ?? placementShapeIdentity(item).vertexIds[contextMenu.vertexIndex!]})}>Remove point <kbd>Del</kbd></button>}
          {item && item.kind==="home" && <><button onClick={()=>{ onSelectComponent?.(item.id); setContextMenu(null); }}>Edit dimensions</button><button onClick={()=>{ onMirrorPlacement?.(item.id,"horizontal"); setContextMenu(null); }}>Mirror left ↔ right</button><button onClick={()=>{ onMirrorPlacement?.(item.id,"vertical"); setContextMenu(null); }}>Mirror top ↔ bottom</button></>}
          {item && <button onClick={()=>{onSelectComponent?.(item.id);setContextMenu(null);}}>Select building</button>}
          {!item && <button onClick={()=>setContextMenu(null)}>Close menu</button>}
        </div>;
    })()}

  </div>;
}
