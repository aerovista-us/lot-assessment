import assert from "node:assert/strict";
import {
  CANONICAL_CANDIDATE_SCHEMA,
  freezeCandidate,
  verifyFrozenCandidate
} from "../packages/canonical/index.ts";

const context = {
  projectId: "pondy-lot2",
  projectRevision: "freeze-selftest-v1",
  scenarioId: "baseline-no-alley",
  solverVersion: "selftest-solver",
  scoringVersion: "selftest-score"
};

const candidateA = {
  id: "FINALIST-TEST",
  family: "test-family",
  placements: [
    { id: "HOME-B", kind: "home", x: 40, y: 5, widthFt: 30, depthFt: 25, movable: false, integrationGroupId: "unit-B" },
    { id: "HOME-A", kind: "home", x: 80.00000001, y: 5, widthFt: 35, depthFt: 25, movable: false, integrationGroupId: "unit-A" }
  ],
  drives: [
    { id: "DRIVE-B", garageId: "GARAGE-B", points: [[148, 36], [70, 36], [50, 24]], movableControlPoints: [2, 1] },
    { id: "DRIVE-A", garageId: "GARAGE-A", points: [[148, 18], [125, 18]] }
  ],
  metadata: { topology: "test", intendedLivingB: 1800, intendedLivingA: 1800 }
};

const candidateB = {
  ...candidateA,
  placements: [...candidateA.placements].reverse(),
  drives: [...candidateA.drives].reverse(),
  metadata: { intendedLivingA: 1800, topology: "test", intendedLivingB: 1800 }
};

const frozenA = freezeCandidate({ ...context, candidate: candidateA });
const frozenB = freezeCandidate({ ...context, candidate: candidateB });

assert.equal(frozenA.canonical.schemaVersion, CANONICAL_CANDIDATE_SCHEMA);
assert.equal(frozenA.freezeHash, frozenB.freezeHash, "stable ordering must produce identical freeze hashes");
assert.match(frozenA.freezeHash, /^[a-f0-9]{64}$/);
assert.equal(verifyFrozenCandidate(frozenA), true);

const reloaded = JSON.parse(JSON.stringify(frozenA));
assert.equal(verifyFrozenCandidate(reloaded), true, "serialized/reloaded freeze must verify");

reloaded.canonical.candidate.placements[0].x += 0.5;
assert.equal(verifyFrozenCandidate(reloaded), false, "geometry mutation must invalidate the freeze hash");

console.log(JSON.stringify({
  schemaVersion: frozenA.canonical.schemaVersion,
  freezeHash: frozenA.freezeHash,
  deterministicOrdering: true,
  reloadVerification: true,
  mutationDetection: true
}, null, 2));
