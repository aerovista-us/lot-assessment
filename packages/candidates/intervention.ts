import { rotatePoint, type Point } from "@/packages/geometry";
import {
  classifyCandidate,
  cloneCandidateComponents,
  markEvidenceStale,
  type CandidateComponent,
  type CandidateEvaluation,
  type CandidateRecord,
  type OpeningComponent,
  type PathComponent,
  type PlacementComponent,
  type PolygonComponent,
  type StallComponent
} from "@/packages/candidates";

export type EditableCandidateComponent = PlacementComponent | PathComponent | OpeningComponent | (PolygonComponent & { kind: "pavement" });

export function isInterventionEditable(component: CandidateComponent): component is EditableCandidateComponent {
  if (component.locked) return false;
  return ["home", "garage", "driveway", "route", "pavement", "opening"].includes(component.kind);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
function staleCandidate(candidate: CandidateRecord, components: CandidateComponent[], updatedAt: string): CandidateRecord {
  return markEvidenceStale({
    ...candidate,
    components,
    classificationReason: "Staff intervention geometry changed. Prior evaluation remains historical; this exact state requires revalidation."
  }, updatedAt);
}

function assertEditable<T extends CandidateComponent>(component: T | undefined): T {
  if (!component) throw new Error("Component not found.");
  if (!isInterventionEditable(component)) throw new Error("This component is locked or not editable in Intervention Editor v1.");
  return component;
}

export type PlacementEdit = {
  x?: number;
  y?: number;
  widthFt?: number;
  depthFt?: number;
  rotationDeg?: number;
};

export function editPlacementComponent(candidate: CandidateRecord, componentId: string, edit: PlacementEdit, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  const nextX = round(edit.x ?? target.x);
  const nextY = round(edit.y ?? target.y);
  const nextWidth = round(edit.widthFt ?? target.widthFt);
  const nextDepth = round(edit.depthFt ?? target.depthFt);
  const rotationLimit = target.rotationLimitDeg ?? 180;
  const nextRotation = round(Math.max(-rotationLimit, Math.min(rotationLimit, edit.rotationDeg ?? target.rotationDeg ?? 0)));
  if (nextWidth <= 0 || nextDepth <= 0) throw new Error("Placement dimensions must be positive.");
  if (!target.resizable && (nextWidth !== target.widthFt || nextDepth !== target.depthFt)) throw new Error("This component is size-locked.");
  if (target.movable === false && (nextX !== target.x || nextY !== target.y)) throw new Error("This component is position-locked.");

  const oldCenter: Point = [target.x + target.widthFt / 2, target.y + target.depthFt / 2];
  const newCenter: Point = [nextX + nextWidth / 2, nextY + nextDepth / 2];
  const deltaRotation = nextRotation - (target.rotationDeg ?? 0);
  const sx = nextWidth / target.widthFt;
  const sy = nextDepth / target.depthFt;
  let polygon = target.polygon?.map(([x, y]) => [
    round(nextX + (x - target.x) * sx),
    round(nextY + (y - target.y) * sy)
  ] as Point);
  let storedRotation = nextRotation;
  // Polygon placements carry their authored footprint directly. Bake rotation into
  // those vertices so every downstream geometry engine sees the same shape.
  if (polygon && deltaRotation) {
    const radians = deltaRotation * Math.PI / 180;
    polygon = polygon.map((point) => {
      const rotated = rotatePoint(point, newCenter, radians);
      return [round(rotated[0]), round(rotated[1])] as Point;
    });
    storedRotation = 0;
  }

  const placementBounds = polygon && deltaRotation ? polygonBounds(polygon) : { x: nextX, y: nextY, widthFt: nextWidth, depthFt: nextDepth };
  components[index] = { ...target, ...placementBounds, rotationDeg: storedRotation, polygon };
  if (target.kind === "garage") {
    const radians = deltaRotation * Math.PI / 180;
    for (let i = 0; i < components.length; i += 1) {
      const component = components[i];
      if (component.kind !== "stall" || component.garageId !== target.id) continue;
      const rotated = rotatePoint([component.axleX, component.axleY], oldCenter, radians);
      const dx = newCenter[0] - oldCenter[0];
      const dy = newCenter[1] - oldCenter[1];
      components[i] = {
        ...component,
        axleX: round(rotated[0] + dx),
        axleY: round(rotated[1] + dy),
        headingDeg: round(component.headingDeg + deltaRotation)
      } satisfies StallComponent;
    }
  }
  return staleCandidate(candidate, components, updatedAt);
}

function polygonBounds(polygon: Point[]) {
  const xs = polygon.map(([x]) => x), ys = polygon.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), widthFt: Math.max(...xs) - Math.min(...xs), depthFt: Math.max(...ys) - Math.min(...ys) };
}

export function mirrorPlacementComponent(candidate: CandidateRecord, componentId: string, axis: "horizontal" | "vertical", updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  const center: Point = [target.x + target.widthFt / 2, target.y + target.depthFt / 2];
  const base = target.polygon ?? [
    [target.x, target.y], [target.x + target.widthFt, target.y],
    [target.x + target.widthFt, target.y + target.depthFt], [target.x, target.y + target.depthFt]
  ] as Point[];
  const polygon = base.map(([x, y]) => [
    round(axis === "horizontal" ? center[0] * 2 - x : x),
    round(axis === "vertical" ? center[1] * 2 - y : y)
  ] as Point).reverse();
  const bounds = polygonBounds(polygon);
  components[index] = { ...target, ...bounds, polygon, rotationDeg: 0 };
  return staleCandidate(candidate, components, updatedAt);
}

export function editPlacementWallLength(candidate: CandidateRecord, componentId: string, wallIndex: number, lengthDeltaFt: number, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  const polygon = (target.polygon ?? [
    [target.x, target.y], [target.x + target.widthFt, target.y],
    [target.x + target.widthFt, target.y + target.depthFt], [target.x, target.y + target.depthFt]
  ] as Point[]).map(([x,y]) => [x,y] as Point);
  if (wallIndex < 0 || wallIndex >= polygon.length) throw new Error("Wall index is out of range.");
  const a = polygon[wallIndex], bIndex = (wallIndex + 1) % polygon.length, b = polygon[bIndex];
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  const nextLength = length + lengthDeltaFt;
  if (length < 0.01 || nextLength < 2) throw new Error("Wall length must remain at least 2 ft.");
  const ux = dx / length, uy = dy / length, half = lengthDeltaFt / 2;
  polygon[wallIndex] = [round(a[0] - ux * half), round(a[1] - uy * half)];
  polygon[bIndex] = [round(b[0] + ux * half), round(b[1] + uy * half)];
  const bounds = polygonBounds(polygon);
  components[index] = { ...target, ...bounds, polygon, rotationDeg: 0 };
  return staleCandidate(candidate, components, updatedAt);
}

function placementPolygon(target: PlacementComponent): Point[] {
  return (target.polygon ?? [
    [target.x, target.y], [target.x + target.widthFt, target.y],
    [target.x + target.widthFt, target.y + target.depthFt], [target.x, target.y + target.depthFt]
  ] as Point[]).map(([x,y]) => [x,y] as Point);
}

function orientation(a: Point, b: Point, c: Point) {
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
}
function segmentsCross(a: Point,b: Point,c: Point,d: Point) {
  const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
  return ((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));
}
function assertSimplePolygon(polygon: Point[]) {
  if (polygon.length < 4) throw new Error("Building footprint must retain at least four corners.");
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    if(Math.hypot(b[0]-a[0],b[1]-a[1])<.5) throw new Error("Building walls must remain at least 0.5 ft long.");
    for(let j=i+1;j<polygon.length;j++){
      if(j===i || j===(i+1)%polygon.length || i===(j+1)%polygon.length) continue;
      const c=polygon[j],d=polygon[(j+1)%polygon.length];
      if(segmentsCross(a,b,c,d)) throw new Error("Building footprint cannot self-intersect.");
    }
  }
}

export function insertPlacementVertex(candidate: CandidateRecord, componentId: string, wallIndex: number, point?: Point, updatedAt = new Date().toISOString()) {
  const components=cloneCandidateComponents(candidate.components),index=components.findIndex((item)=>item.id===componentId),target=assertEditable(components[index]);
  if(target.kind!=="home"&&target.kind!=="garage") throw new Error("Selected component is not a placement.");
  if(!target.resizable) throw new Error("This building is shape-locked.");
  const polygon=placementPolygon(target);
  if(wallIndex<0||wallIndex>=polygon.length) throw new Error("Wall index is out of range.");
  const a=polygon[wallIndex],b=polygon[(wallIndex+1)%polygon.length];
  const inserted:Point=point ? [round(point[0]),round(point[1])] : [round((a[0]+b[0])/2),round((a[1]+b[1])/2)];
  polygon.splice(wallIndex+1,0,inserted);
  assertSimplePolygon(polygon);
  components[index]={...target,...polygonBounds(polygon),polygon,rotationDeg:0};
  return staleCandidate(candidate,components,updatedAt);
}

export function removePlacementVertex(candidate: CandidateRecord, componentId: string, vertexIndex: number, updatedAt = new Date().toISOString()) {
  const components=cloneCandidateComponents(candidate.components),index=components.findIndex((item)=>item.id===componentId),target=assertEditable(components[index]);
  if(target.kind!=="home"&&target.kind!=="garage") throw new Error("Selected component is not a placement.");
  if(!target.resizable) throw new Error("This building is shape-locked.");
  const polygon=placementPolygon(target);
  if(vertexIndex<0||vertexIndex>=polygon.length) throw new Error("Building vertex is out of range.");
  polygon.splice(vertexIndex,1);
  assertSimplePolygon(polygon);
  components[index]={...target,...polygonBounds(polygon),polygon,rotationDeg:0};
  return staleCandidate(candidate,components,updatedAt);
}

export function editPlacementVertex(candidate: CandidateRecord, componentId: string, vertexIndex: number, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "home" && target.kind !== "garage") throw new Error("Selected component is not a placement.");
  if (!target.resizable) throw new Error("This building is shape-locked.");
  const polygon = (target.polygon ?? [
    [target.x, target.y], [target.x + target.widthFt, target.y],
    [target.x + target.widthFt, target.y + target.depthFt], [target.x, target.y + target.depthFt]
  ] as Point[]).map(([x,y], i) => i === vertexIndex ? [round(point[0]), round(point[1])] as Point : [x,y] as Point);
  if (vertexIndex < 0 || vertexIndex >= polygon.length) throw new Error("Building vertex is out of range.");
  const bounds = polygonBounds(polygon);
  components[index] = { ...target, ...bounds, polygon, rotationDeg: 0 };
  return staleCandidate(candidate, components, updatedAt);
}

export function editPathPoint(candidate: CandidateRecord, componentId: string, pointIndex: number, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "driveway" && target.kind !== "route") throw new Error("Selected component is not a route.");
  if (pointIndex < 0 || pointIndex >= target.points.length) throw new Error("Route control point is out of range.");
  if (target.movableControlPoints?.length && !target.movableControlPoints.includes(pointIndex)) throw new Error("That route control point is locked.");
  const points = target.points.map((value, i) => i === pointIndex ? [round(point[0]), round(point[1])] as Point : value);
  components[index] = { ...target, points } satisfies PathComponent;
  return staleCandidate(candidate, components, updatedAt);
}
export function editPavementVertex(candidate: CandidateRecord, componentId: string, vertexIndex: number, point: Point, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "pavement") throw new Error("Selected component is not pavement.");
  if (vertexIndex < 0 || vertexIndex >= target.polygon.length) throw new Error("Pavement vertex is out of range.");
  const polygon = target.polygon.map((value, i) => i === vertexIndex ? [round(point[0]), round(point[1])] as Point : value);
  components[index] = { ...target, polygon } satisfies PolygonComponent;
  return staleCandidate(candidate, components, updatedAt);
}

export function editOpeningComponent(candidate: CandidateRecord, componentId: string, edit: { openingWidthFt?: number; offsetFt?: number }, updatedAt = new Date().toISOString()) {
  const components = cloneCandidateComponents(candidate.components);
  const index = components.findIndex((item) => item.id === componentId);
  const target = assertEditable(components[index]);
  if (target.kind !== "opening") throw new Error("Selected component is not an opening.");
  const openingWidthFt = round(edit.openingWidthFt ?? target.openingWidthFt);
  const offsetFt = round(edit.offsetFt ?? target.offsetFt);
  if (openingWidthFt <= 0 || offsetFt < 0) throw new Error("Opening width must be positive and offset cannot be negative.");
  components[index] = { ...target, openingWidthFt, offsetFt } satisfies OpeningComponent;
  return staleCandidate(candidate, components, updatedAt);
}
export function applyCandidateEvaluation(candidate: CandidateRecord, evaluation: CandidateEvaluation, updatedAt = new Date().toISOString()): CandidateRecord {
  if (evaluation.candidateId !== candidate.id) throw new Error("Evaluation candidate id does not match the working candidate.");
  const classification = classifyCandidate(evaluation);
  const history = candidate.evaluationHistory.filter((item) => item.id !== evaluation.id);
  return {
    ...candidate,
    status: classification.status,
    evidenceState: "CURRENT",
    classificationReason: `${classification.reason} Current evidence is Intervention Editor screening; authoritative outbound proof remains a separate hard gate.`,
    evaluationHistory: [...history, evaluation],
    currentEvaluationId: evaluation.id,
    updatedAt
  };
}

export function currentRepairClasses(candidate: CandidateRecord): string[] {
  if (!candidate.currentEvaluationId) return [];
  const evaluation = candidate.evaluationHistory.find((item) => item.id === candidate.currentEvaluationId);
  return [...new Set(evaluation?.gates.flatMap((gate) => gate.repairClasses ?? []) ?? [])];
}

export function suggestedEditableComponent(candidate: CandidateRecord) {
  const repairs = currentRepairClasses(candidate);
  const priority = [
    repairs.some((value) => value.includes("garage")) ? "garage" : null,
    repairs.some((value) => value.includes("drive") || value.includes("route")) ? "driveway" : null,
    repairs.some((value) => value.includes("pavement")) ? "pavement" : null,
    repairs.some((value) => value.includes("opening")) ? "opening" : null,
    repairs.some((value) => value.includes("building")) ? "home" : null
  ].filter(Boolean);
  return candidate.components.find((component) => isInterventionEditable(component) && priority.includes(component.kind))
    ?? candidate.components.find(isInterventionEditable)
    ?? null;
}
