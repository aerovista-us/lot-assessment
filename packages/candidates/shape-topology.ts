import type { Point } from "@/packages/geometry";
import type { PlacementComponent } from "@/packages/candidates";

export type PlacementShapeIdentity = {
  polygon: Point[];
  vertexIds: string[];
};

export function placementShapeIdentity(target: PlacementComponent): PlacementShapeIdentity {
  const polygon = (target.polygon ?? [
    [target.x, target.y], [target.x + target.widthFt, target.y],
    [target.x + target.widthFt, target.y + target.depthFt], [target.x, target.y + target.depthFt]
  ] as Point[]).map(([x,y]) => [x,y] as Point);
  const stored = target.polygonVertexIds;
  const vertexIds = stored?.length === polygon.length
    ? [...stored]
    : polygon.map((_, index) => `${target.id}:v${index + 1}`);
  return { polygon, vertexIds };
}

export function placementWallId(vertexIds: ReadonlyArray<string>, wallIndex: number) {
  if (wallIndex < 0 || wallIndex >= vertexIds.length) throw new Error("Wall index is out of range.");
  return `${vertexIds[wallIndex]}→${vertexIds[(wallIndex + 1) % vertexIds.length]}`;
}

export function nextPlacementVertexId(componentId: string, vertexIds: ReadonlyArray<string>) {
  let next = 1;
  const prefix = `${componentId}:staff-v`;
  for (const id of vertexIds) {
    if (!id.startsWith(prefix)) continue;
    const value = Number(id.slice(prefix.length));
    if (Number.isInteger(value)) next = Math.max(next, value + 1);
  }
  return `${prefix}${next}`;
}

export function resolvePlacementVertexIndex(target: PlacementComponent, ref: number | string) {
  const { vertexIds } = placementShapeIdentity(target);
  if (typeof ref === "number") {
    if (ref < 0 || ref >= vertexIds.length) throw new Error("Building vertex is out of range.");
    return ref;
  }
  const index = vertexIds.indexOf(ref);
  if (index < 0) throw new Error(`Building vertex ${ref} no longer exists.`);
  return index;
}

export function resolvePlacementWallIndex(target: PlacementComponent, ref: number | string) {
  const { vertexIds } = placementShapeIdentity(target);
  if (typeof ref === "number") {
    if (ref < 0 || ref >= vertexIds.length) throw new Error("Wall index is out of range.");
    return ref;
  }
  const index = vertexIds.findIndex((_, wallIndex) => placementWallId(vertexIds, wallIndex) === ref);
  if (index < 0) throw new Error(`Building wall ${ref} no longer exists.`);
  return index;
}
