import { createHash } from "node:crypto";
import type { CandidateRecord, OpeningComponent, PathComponent, PlacementComponent, PolygonComponent } from "@/packages/candidates";
import { placementShapeIdentity, placementWallId } from "@/packages/candidates/shape-topology";

export const CANONICAL_INTERVENTION_GEOMETRY_SCHEMA = "lotscope-intervention-geometry-v2" as const;

function rounded(value: number) {
  if (!Number.isFinite(value)) throw new Error("canonical intervention geometry must be finite");
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function canonicalPlacement(item: PlacementComponent) {
  const shape = placementShapeIdentity(item);
  return {
    id: item.id,
    kind: item.kind,
    x: rounded(item.x), y: rounded(item.y), widthFt: rounded(item.widthFt), depthFt: rounded(item.depthFt),
    rotationDeg: rounded(item.rotationDeg ?? 0),
    vertices: shape.polygon.map(([x,y], index) => ({ id: shape.vertexIds[index], x: rounded(x), y: rounded(y) })),
    walls: shape.vertexIds.map((startVertexId, index) => ({
      id: placementWallId(shape.vertexIds, index),
      startVertexId,
      endVertexId: shape.vertexIds[(index + 1) % shape.vertexIds.length]
    }))
  };
}

function canonicalPavement(item: PolygonComponent & { kind: "pavement" }) {
  return { id: item.id, points: item.polygon.map(([x,y]) => [rounded(x),rounded(y)] as [number,number]) };
}
function canonicalPath(item: PathComponent) {
  return { id:item.id, kind:item.kind, garageId:item.garageId ?? null, widthFt:item.widthFt == null ? null : rounded(item.widthFt), points:item.points.map(([x,y])=>[rounded(x),rounded(y)] as [number,number]) };
}
function canonicalOpening(item: OpeningComponent) {
  return { id:item.id, ownerId:item.ownerId, wall:item.wall, openingWidthFt:rounded(item.openingWidthFt), offsetFt:rounded(item.offsetFt) };
}

export function canonicalizeInterventionGeometry(candidate: CandidateRecord) {
  const placements = candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage").map(canonicalPlacement).sort((a,b)=>a.id.localeCompare(b.id));
  const pavement = candidate.components.filter((item): item is PolygonComponent & {kind:"pavement"} => item.kind === "pavement").map(canonicalPavement).sort((a,b)=>a.id.localeCompare(b.id));
  const paths = candidate.components.filter((item): item is PathComponent => item.kind === "driveway" || item.kind === "route").map(canonicalPath).sort((a,b)=>a.id.localeCompare(b.id));
  const openings = candidate.components.filter((item): item is OpeningComponent => item.kind === "opening").map(canonicalOpening).sort((a,b)=>a.id.localeCompare(b.id));
  return {
    schemaVersion: CANONICAL_INTERVENTION_GEOMETRY_SCHEMA,
    candidateId: candidate.id,
    revisionLabel: candidate.revisionLabel,
    placements,
    pavement,
    paths,
    openings
  };
}

export type CanonicalInterventionGeometryV2 = ReturnType<typeof canonicalizeInterventionGeometry>;

export function interventionGeometryHash(candidateOrCanonical: CandidateRecord | CanonicalInterventionGeometryV2) {
  const canonical = "schemaVersion" in candidateOrCanonical && candidateOrCanonical.schemaVersion === CANONICAL_INTERVENTION_GEOMETRY_SCHEMA
    ? candidateOrCanonical as CanonicalInterventionGeometryV2
    : canonicalizeInterventionGeometry(candidateOrCanonical as CandidateRecord);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
