import type { CandidateRecord, OpeningComponent, PathComponent, PlacementComponent, PolygonComponent, RoofComponent } from "@/packages/candidates";
import { placementShapeIdentity, placementWallId } from "@/packages/candidates/shape-topology";

export const CANONICAL_INTERVENTION_GEOMETRY_SCHEMA = "lotscope-intervention-geometry-v3" as const;

function rounded(value: number) {
  if (!Number.isFinite(value)) throw new Error("canonical intervention geometry must be finite");
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function roundedRoof(value: number) {
  if (!Number.isFinite(value)) throw new Error("canonical roof geometry must be finite");
  return Math.round((value + Number.EPSILON) * 10000000000) / 10000000000;
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
      id: placementWallId(shape.vertexIds, index), startVertexId, endVertexId: shape.vertexIds[(index + 1) % shape.vertexIds.length]
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
function canonicalOptionalFinite(value: unknown) {
  if (value == null) return { state: "ABSENT" as const, value: null };
  if (typeof value === "number" && Number.isFinite(value)) {
    return { state: "FINITE" as const, value: roundedRoof(value) };
  }
  return { state: "MALFORMED" as const, value: null };
}
function canonicalPoint(value: unknown) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) return null;
  return [roundedRoof(Number(value[0])), roundedRoof(Number(value[1]))] as [number, number];
}
function canonicalRoofZone(value: unknown, index: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { id: `__malformed-zone-${index}`, malformed: true, rawType: value === null ? "null" : Array.isArray(value) ? "array" : typeof value };
  }
  const zone = value as Record<string, unknown>;
  const rawFootprint = zone.footprint;
  const footprintState = rawFootprint === undefined
    ? "OWNER_DERIVED"
    : Array.isArray(rawFootprint)
      ? "EXPLICIT"
      : "MALFORMED";
  const footprint = Array.isArray(rawFootprint) ? rawFootprint.map(canonicalPoint) : null;
  const footprintMalformed = rawFootprint !== undefined && (!Array.isArray(rawFootprint) || (footprint ?? []).some((point) => point === null));
  const ridgeA = canonicalPoint(zone.ridgeA);
  const ridgeB = canonicalPoint(zone.ridgeB);
  const ridgeAMalformed = zone.ridgeA != null && ridgeA === null;
  const ridgeBMalformed = zone.ridgeB != null && ridgeB === null;
  const ridgeZCheck = canonicalOptionalFinite(zone.ridgeZCheckFt);
  const pitchCheckRise = canonicalOptionalFinite(zone.pitchCheckRise);
  const pitchCheckRun = canonicalOptionalFinite(zone.pitchCheckRun);
  const optionalCheckMalformed = [ridgeZCheck, pitchCheckRise, pitchCheckRun].some((check) => check.state === "MALFORMED");
  return {
    id: typeof zone.id === "string" ? zone.id : `__malformed-zone-${index}`,
    label: typeof zone.label === "string" ? zone.label : null,
    status: typeof zone.status === "string" ? zone.status : null,
    type: typeof zone.type === "string" ? zone.type : null,
    malformed: typeof zone.id !== "string" || footprintMalformed || ridgeAMalformed || ridgeBMalformed || optionalCheckMalformed,
    footprintState,
    footprint,
    plateZFt: typeof zone.plateZFt === "number" && Number.isFinite(zone.plateZFt) ? roundedRoof(zone.plateZFt) : null,
    ridgeA,
    ridgeB,
    solveBy: typeof zone.solveBy === "string" ? zone.solveBy : null,
    pitchRise: typeof zone.pitchRise === "number" && Number.isFinite(zone.pitchRise) ? roundedRoof(zone.pitchRise) : null,
    pitchRun: typeof zone.pitchRun === "number" && Number.isFinite(zone.pitchRun) ? roundedRoof(zone.pitchRun) : null,
    ridgeZFt: typeof zone.ridgeZFt === "number" && Number.isFinite(zone.ridgeZFt) ? roundedRoof(zone.ridgeZFt) : null,
    ridgeZCheckFtState: ridgeZCheck.state,
    ridgeZCheckFt: ridgeZCheck.value,
    pitchCheckRiseState: pitchCheckRise.state,
    pitchCheckRise: pitchCheckRise.value,
    pitchCheckRunState: pitchCheckRun.state,
    pitchCheckRun: pitchCheckRun.value,
    source: typeof zone.source === "string" ? zone.source : null
  };
}
function canonicalRoof(item: RoofComponent) {
  const rawZones = (item as unknown as { zones?: unknown }).zones;
  const zones = Array.isArray(rawZones)
    ? rawZones.map(canonicalRoofZone).sort((a,b)=>a.id.localeCompare(b.id))
    : [{ id: "__malformed-zones__", malformed: true, rawType: rawZones === null ? "null" : typeof rawZones }];
  return {
    id: item.id, ownerId: item.ownerId, status: item.status,
    ownerGeometryKey: item.ownerGeometryKey ?? null,
    zones
  };
}

export function canonicalizeInterventionGeometry(candidate: CandidateRecord) {
  const placements = candidate.components.filter((item): item is PlacementComponent => item.kind === "home" || item.kind === "garage").map(canonicalPlacement).sort((a,b)=>a.id.localeCompare(b.id));
  const pavement = candidate.components.filter((item): item is PolygonComponent & {kind:"pavement"} => item.kind === "pavement").map(canonicalPavement).sort((a,b)=>a.id.localeCompare(b.id));
  const paths = candidate.components.filter((item): item is PathComponent => item.kind === "driveway" || item.kind === "route").map(canonicalPath).sort((a,b)=>a.id.localeCompare(b.id));
  const openings = candidate.components.filter((item): item is OpeningComponent => item.kind === "opening").map(canonicalOpening).sort((a,b)=>a.id.localeCompare(b.id));
  const roofs = candidate.components.filter((item): item is RoofComponent => item.kind === "roof").map(canonicalRoof).sort((a,b)=>a.id.localeCompare(b.id));
  return { schemaVersion: CANONICAL_INTERVENTION_GEOMETRY_SCHEMA, candidateId: candidate.id, revisionLabel: candidate.revisionLabel, placements, pavement, paths, openings, roofs };
}
export type CanonicalInterventionGeometryV3 = ReturnType<typeof canonicalizeInterventionGeometry>;
export type { CanonicalInterventionGeometryV2 } from "@/packages/canonical/intervention-v2";
export function interventionGeometryRevision(candidate: CandidateRecord) {
  return JSON.stringify(canonicalizeInterventionGeometry(candidate));
}
