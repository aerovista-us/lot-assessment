import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { editPlacementComponent, editPathPoint, editPavementVertex, editOpeningComponent, editPlacementVertex, editPlacementWallLength, mirrorPlacementComponent, insertPlacementVertex, removePlacementVertex, applyCandidateEvaluation } from "../packages/candidates/intervention.ts";
import { evaluateInterventionCandidate, exploreInterventionNeighborhood } from "../packages/candidates/intervention-evaluation.ts";
import { placementShapeIdentity, placementWallId } from "../packages/candidates/shape-topology.ts";
import { canonicalizeInterventionGeometry, interventionGeometryHash } from "../packages/canonical/intervention-v3.ts";

const rules = pondyCandidateRegistry.lots[0].rulesVersion;
const d4 = pondyCandidateRegistry.candidates.find((candidate) => candidate.id === "pondy-d4");
const d4b = pondyCandidateRegistry.candidates.find((candidate) => candidate.id === "pondy-d4b-rot35b");
assert(d4 && d4b);

for (const candidate of [d4, d4b]) {
  const screen = evaluateInterventionCandidate(candidate, rules, "2026-09-18T12:00:00.000Z");
  assert.equal(screen.evaluation.promotionReady, false);
  assert.equal(screen.evaluation.gates.find((gate) => gate.id === "authoritative-outbound")?.status, "FAIL");
  assert.equal(screen.evaluation.gates.find((gate) => gate.id === "program")?.status, "WATCH");
  assert.equal(screen.evaluation.gates.find((gate) => gate.id === "intervention-structure")?.status, "PASS");
  const routeGate = screen.evaluation.gates.find((gate) => gate.id === "intervention-route-screen");
  assert(routeGate?.metrics && "offPavementPoseCount" in routeGate.metrics, "route screening must report pavement coverage");
  assert.notEqual(screen.evaluation.status, "PASS");
}
const overlappingHomes = editPlacementComponent(d4, "home-a", { x: 60 }, "2026-09-18T12:00:30.000Z");
const overlapScreen = evaluateInterventionCandidate(overlappingHomes, rules, "2026-09-18T12:00:31.000Z");
assert.equal(overlapScreen.evaluation.gates.find((gate) => gate.id === "intervention-structure")?.status, "FAIL", "edited homes must not overlap internally");

const originalStall = d4.components.find((component) => component.id === "b-south");
assert(originalStall && originalStall.kind === "stall");
const edited = editPlacementComponent(d4, "garage-b", { x: 7, rotationDeg: 10 }, "2026-09-18T12:01:00.000Z");
const editedStall = edited.components.find((component) => component.id === "b-south");
assert(editedStall && editedStall.kind === "stall");
assert.notEqual(editedStall.axleX, originalStall.axleX);
assert.notEqual(editedStall.headingDeg, originalStall.headingDeg);
assert.equal(edited.evidenceState, "STALE");
assert.equal(edited.currentEvaluationId, null);

const implicitMovable = { ...d4, components: d4.components.map((component) => component.id === "garage-b" && component.kind === "garage" ? { ...component, movable: undefined } : component) };
const implicitlyMoved = editPlacementComponent(implicitMovable, "garage-b", { x: 8 }, "2026-09-18T12:01:10.000Z");
assert.equal(implicitlyMoved.components.find((component) => component.id === "garage-b")?.x, 8, "intervention placements are movable unless explicitly locked");
const routeMoved = editPathPoint(d4, "shared-drive-route", 1, [56, 39], "2026-09-18T12:01:20.000Z");
assert.deepEqual(routeMoved.components.find((component) => component.id === "shared-drive-route")?.points[1], [56, 39]);
const pavementMoved = editPavementVertex(d4, "west-maneuver-apron", 0, [26, 5], "2026-09-18T12:01:30.000Z");
assert.deepEqual(pavementMoved.components.find((component) => component.id === "west-maneuver-apron")?.polygon[0], [26, 5]);
const openingMoved = editOpeningComponent(d4, "garage-b-opening", { offsetFt: 0.5 }, "2026-09-18T12:01:40.000Z");
assert.equal(openingMoved.components.find((component) => component.id === "garage-b-opening")?.offsetFt, 0.5);

const homeB = d4.components.find((component) => component.id === "home-b");
assert(homeB && homeB.kind === "home" && homeB.polygon);
const rotatedHome = editPlacementComponent(d4, "home-b", { rotationDeg: 8 }, "2026-09-18T12:01:50.000Z");
const rotatedHomeB = rotatedHome.components.find((component) => component.id === "home-b");
assert(rotatedHomeB && rotatedHomeB.kind === "home" && rotatedHomeB.polygon);
assert.equal(rotatedHomeB.rotationDeg, 0, "polygon home rotation must be baked into footprint vertices");
assert.notDeepEqual(rotatedHomeB.polygon, homeB.polygon, "home rotation must change authoritative polygon geometry");
const mirroredHome = mirrorPlacementComponent(d4, "home-b", "horizontal", "2026-09-18T12:01:51.000Z");
assert.notDeepEqual(mirroredHome.components.find((component) => component.id === "home-b")?.polygon, homeB.polygon, "irregular home mirror must change footprint");
const wallEdited = editPlacementWallLength(d4, "home-b", 0, 2, "2026-09-18T12:01:52.000Z");
const wallHome = wallEdited.components.find((component) => component.id === "home-b");
assert(wallHome && wallHome.kind === "home" && wallHome.polygon);
assert(Math.abs(Math.hypot(wallHome.polygon[1][0]-wallHome.polygon[0][0], wallHome.polygon[1][1]-wallHome.polygon[0][1]) - 42.5) < .01);
const deflectedHome = insertPlacementVertex(d4, "home-b", 0, undefined, "2026-09-18T12:01:52.500Z");
const deflected = deflectedHome.components.find((component) => component.id === "home-b");
assert(deflected && deflected.kind === "home" && deflected.polygon);
assert.equal(deflected.polygon.length, homeB.polygon.length + 1, "adding a deflection point must add one authoritative polygon vertex");
assert.equal(deflected.polygonVertexIds?.length, deflected.polygon.length, "edited footprints must persist stable vertex ids");
const insertedVertexId = deflected.polygonVertexIds?.[1];
assert.equal(insertedVertexId, "home-b:staff-v1", "first staff deflection point gets a stable stored id");
const stableWallId = placementWallId(placementShapeIdentity(deflected).vertexIds, 1);
const stableWallEdit = editPlacementWallLength(deflectedHome, "home-b", stableWallId, 1, "2026-09-18T12:01:52.600Z");
assert.equal(stableWallEdit.components.find((component) => component.id === "home-b")?.polygonVertexIds?.[1], insertedVertexId, "wall edits addressed by stable id must preserve vertex identity");
const stableVertexEdit = editPlacementVertex(deflectedHome, "home-b", insertedVertexId, [70, 6], "2026-09-18T12:01:52.650Z");
assert.deepEqual(stableVertexEdit.components.find((component) => component.id === "home-b")?.polygon?.[1], [70, 6], "vertex edits must resolve durable ids after insertion");
const canonicalV3 = canonicalizeInterventionGeometry(deflectedHome);
const canonicalHash = interventionGeometryHash(deflectedHome);
assert.equal(interventionGeometryHash(JSON.parse(JSON.stringify(canonicalV3))), canonicalHash, "canonical intervention geometry must survive serialization/reload");
assert.notEqual(interventionGeometryHash(stableVertexEdit), canonicalHash, "geometry mutation must change the canonical intervention fingerprint");
const restoredHome = removePlacementVertex(deflectedHome, "home-b", 1, "2026-09-18T12:01:52.750Z");
assert.equal(restoredHome.components.find((component) => component.id === "home-b")?.polygon?.length, homeB.polygon.length, "removing the inserted deflection point must restore vertex count");

const projectedDeflection = insertPlacementVertex(d4, "home-b", 0, [70, 17], "2026-09-18T12:01:52.800Z");
const projectedHome = projectedDeflection.components.find((component) => component.id === "home-b");
assert(projectedHome && projectedHome.kind === "home" && projectedHome.polygon);
assert.equal(projectedHome.polygon[1][1], 5, "requested deflection points must first project onto the selected wall");
assert.equal(projectedHome.polygon[1][0], 70, "wall projection should preserve the along-wall click coordinate when it lies within the segment");

const vertexEdited = editPlacementVertex(d4, "home-b", 5, [53, 22], "2026-09-18T12:01:53.000Z");
assert.deepEqual(vertexEdited.components.find((component) => component.id === "home-b")?.polygon?.[5], [53, 22]);
assert.throws(() => editPlacementVertex(d4, "home-b", 5, [54, 5], "2026-09-18T12:01:53.100Z"), /edges must remain|self-intersect|overlap/, "corner drag must reject collapsed or overlapping footprint geometry");
const apron = d4.components.find((component) => component.id === "west-maneuver-apron");
assert(apron && apron.kind === "pavement");
assert.throws(() => editPavementVertex(d4, "west-maneuver-apron", 0, apron.polygon[1], "2026-09-18T12:01:53.200Z"), /edges must remain|self-intersect|overlap/, "pavement corner drag must use the same integrity contract");

const screen = evaluateInterventionCandidate(edited, rules, "2026-09-18T12:02:00.001Z");
const sameSecondScreen = evaluateInterventionCandidate(edited, rules, "2026-09-18T12:02:00.002Z");
assert.notEqual(screen.evaluation.id, sameSecondScreen.evaluation.id, "intervention evaluation IDs must retain sub-second uniqueness");
const evaluated = applyCandidateEvaluation(edited, screen.evaluation, "2026-09-18T12:02:00.001Z");
assert.equal(evaluated.evidenceState, "CURRENT");
assert.notEqual(evaluated.status, "PASS");
assert.equal(evaluated.currentEvaluationId, screen.evaluation.id);
const suggestions = exploreInterventionNeighborhood(d4, "garage-b", rules, "2026-09-18T12:03:00.000Z");
assert(suggestions.length > 0 && suggestions.length <= 5);
assert(suggestions.every((item) => item.candidate.currentEvaluationId));
assert(suggestions.every((item) => item.candidate.status !== "PASS" && item.candidate.status !== "PROMOTION_READY"));
assert(suggestions.every((item) => item.candidate.evaluationHistory.at(-1)?.gates.some((gate) => gate.id === "authoritative-outbound" && gate.status === "FAIL")));

console.log(JSON.stringify({
  d4Screen: evaluateInterventionCandidate(d4, rules, "2026-09-18T12:04:00.000Z").screeningScore,
  d4bScreen: evaluateInterventionCandidate(d4b, rules, "2026-09-18T12:04:00.000Z").screeningScore,
  stallMovesWithGarage: true,
  directEditPrimitives: true,
  homeShapeTransforms: true,
  deflectionPointEditing: true,
  projectedDeflectionInsertion: true,
  sharedPolygonIntegrity: true,
  stableFootprintIdentity: true,
  canonicalInterventionGeometryV3: true,
  exploreSuggestions: suggestions.length,
  authoritativeOutboundAlwaysOpen: true
}, null, 2));
