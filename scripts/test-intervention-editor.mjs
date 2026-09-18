import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { editPlacementComponent, applyCandidateEvaluation } from "../packages/candidates/intervention.ts";
import { evaluateInterventionCandidate, exploreInterventionNeighborhood } from "../packages/candidates/intervention-evaluation.ts";

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
  exploreSuggestions: suggestions.length,
  authoritativeOutboundAlwaysOpen: true
}, null, 2));
