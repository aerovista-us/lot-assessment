"use client";

import type { CandidateComponent, CandidateRecord, PathComponent, PlacementComponent, PolygonComponent } from "@/packages/candidates";

const points = (polygon: ReadonlyArray<readonly [number, number]>) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

function placementTransform(item: PlacementComponent) {
  const rotation = item.rotationDeg ?? 0;
  if (!rotation) return undefined;
  const cx = item.x + item.widthFt / 2;
  const cy = item.y + item.depthFt / 2;
  return `rotate(${rotation} ${cx} ${cy})`;
}

function stallPolygon(component: Extract<CandidateComponent, { kind: "stall" }>) {
  const length = 20.5;
  const width = 8;
  const rearOverhang = 4;
  const heading = component.headingDeg * Math.PI / 180;
  const hx = Math.cos(heading), hy = Math.sin(heading), wx = -hy, wy = hx;
  const centerOffset = length / 2 - rearOverhang;
  const cx = component.axleX + hx * centerOffset;
  const cy = component.axleY + hy * centerOffset;
  const hl = length / 2, hw = width / 2;
  return [
    [cx + hx * hl + wx * hw, cy + hy * hl + wy * hw],
    [cx + hx * hl - wx * hw, cy + hy * hl - wy * hw],
    [cx - hx * hl - wx * hw, cy - hy * hl - wy * hw],
    [cx - hx * hl + wx * hw, cy - hy * hl + wy * hw]
  ] as Array<[number, number]>;
}

export function CandidatePlan({ candidate, selectedComponentId, onSelectComponent }: { candidate: CandidateRecord; selectedComponentId?: string | null; onSelectComponent?: (componentId: string) => void }) {
  const placements = candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage");
  const placementById = new Map(placements.map((item) => [item.id, item]));
  const parcels = candidate.components.filter((item): item is PolygonComponent => item.kind === "parcel" && "polygon" in item);
  const envelopes = candidate.components.filter((item): item is PolygonComponent => item.kind === "envelope" && "polygon" in item);
  const pavement = candidate.components.filter((item): item is PolygonComponent => item.kind === "pavement" && "polygon" in item);
  const paths = candidate.components.filter((item): item is PathComponent => (item.kind === "driveway" || item.kind === "route") && "points" in item);
  const stalls = candidate.components.filter((item) => item.kind === "stall");
  const openings = candidate.components.filter((item) => item.kind === "opening");

  const selectableClass = (id: string, base: string) => `${base}${onSelectComponent ? " candidate-plan-selectable" : ""}${selectedComponentId === id ? " candidate-plan-selected" : ""}`;
  const select = (id: string) => onSelectComponent ? () => onSelectComponent(id) : undefined;

  return <svg className="candidate-plan-svg" viewBox="-4 -4 166 66" role="img" aria-label={`${candidate.label} component plan`}>
    <rect x="-4" y="-4" width="166" height="66" className="candidate-plan-bg" />
    {parcels.map((item) => <polygon key={item.id} data-component-id={item.id} points={points(item.polygon)} className={selectableClass(item.id, "candidate-plan-parcel")} onClick={select(item.id)} />)}
    {envelopes.map((item) => <polygon key={item.id} data-component-id={item.id} points={points(item.polygon)} className={selectableClass(item.id, "candidate-plan-envelope")} onClick={select(item.id)} />)}
    {pavement.map((item) => <polygon key={item.id} data-component-id={item.id} points={points(item.polygon)} className={selectableClass(item.id, "candidate-plan-pavement")} onClick={select(item.id)} />)}
    {paths.map((item) => <polyline key={item.id} data-component-id={item.id} points={points(item.points)} className={selectableClass(item.id, "candidate-plan-route")} onClick={select(item.id)} />)}
    {placements.map((item) => <g key={item.id} data-component-id={item.id} transform={placementTransform(item)} className={selectableClass(item.id, `candidate-plan-component component-${item.kind}`)} onClick={select(item.id)}>
      {item.polygon ? <polygon points={points(item.polygon)} /> : <rect x={item.x} y={item.y} width={item.widthFt} height={item.depthFt} rx=".5" />}
      <text x={item.x + item.widthFt / 2} y={item.y + item.depthFt / 2}>{item.label}</text>
    </g>)}
    {openings.map((item) => {
      const owner = placementById.get(item.ownerId);
      if (!owner) return null;
      const transform = placementTransform(owner);
      const start = item.offsetFt;
      const end = item.offsetFt + item.openingWidthFt;
      if (item.wall === "east") return <line key={item.id} data-component-id={item.id} transform={transform} x1={owner.x + owner.widthFt} y1={owner.y + start} x2={owner.x + owner.widthFt} y2={owner.y + end} className={selectableClass(item.id, "candidate-plan-opening")} onClick={select(item.id)} />;
      if (item.wall === "west") return <line key={item.id} data-component-id={item.id} transform={transform} x1={owner.x} y1={owner.y + start} x2={owner.x} y2={owner.y + end} className={selectableClass(item.id, "candidate-plan-opening")} onClick={select(item.id)} />;
      if (item.wall === "north") return <line key={item.id} data-component-id={item.id} transform={transform} x1={owner.x + start} y1={owner.y} x2={owner.x + end} y2={owner.y} className={selectableClass(item.id, "candidate-plan-opening")} onClick={select(item.id)} />;
      return <line key={item.id} data-component-id={item.id} transform={transform} x1={owner.x + start} y1={owner.y + owner.depthFt} x2={owner.x + end} y2={owner.y + owner.depthFt} className={selectableClass(item.id, "candidate-plan-opening")} onClick={select(item.id)} />;
    })}
    {stalls.map((item) => <polygon key={item.id} data-component-id={item.id} points={points(stallPolygon(item))} className={selectableClass(item.id, "candidate-plan-stall")} onClick={select(item.id)} />)}
    <line x1="148" y1="0" x2="148" y2="50" className="candidate-plan-street" />
    <text x="153" y="25" transform="rotate(90 153 25)" className="candidate-plan-street-label">PENNSYLVANIA</text>
  </svg>;
}
