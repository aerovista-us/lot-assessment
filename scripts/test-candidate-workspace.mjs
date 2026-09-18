import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import {
  addWorkspaceCheckpoint,
  branchWorkspaceCandidate,
  compareCandidateComponents,
  createWorkspaceCheckpoint,
  createWorkspaceExportPackage,
  emptyCandidateWorkspace,
  importWorkspacePackage,
  restoreWorkspaceCheckpoint,
  upsertWorkspaceCandidate
} from "../packages/candidates/workspace.ts";

const t0 = "2026-09-18T10:00:00.000Z";
let state = emptyCandidateWorkspace(t0);
const parent = pondyCandidateRegistry.candidates.find((item) => item.id === "pondy-d4");
assert(parent, "Design 4 fixture is required");
const branched = branchWorkspaceCandidate({
  base: pondyCandidateRegistry,
  state,
  parentId: parent.id,
  relation: "VARIANT",
  createdAt: "2026-09-18T10:01:00.000Z"
});
state = branched.state;
assert.equal(branched.candidate.status, "DRAFT");
assert.equal(branched.candidate.evidenceState, "STALE");
assert.equal(branched.candidate.currentEvaluationId, null);
assert.equal(parent.currentEvaluationId, "eval-pondy-d4-20260913");
assert.notStrictEqual(branched.candidate.components, parent.components);

const checkpoint = createWorkspaceCheckpoint(branched.candidate, "before edit", "2026-09-18T10:02:00.000Z");
state = addWorkspaceCheckpoint(state, checkpoint, "2026-09-18T10:02:00.000Z");
const garage = branched.candidate.components.find((item) => item.id === "garage-b");
assert(garage && garage.kind === "garage");
const edited = {
  ...branched.candidate,
  components: branched.candidate.components.map((item) =>
    item.id === "garage-b" && item.kind === "garage" ? { ...item, x: item.x + 2 } : item
  ),
  updatedAt: "2026-09-18T10:03:00.000Z"
};
state = upsertWorkspaceCandidate(state, edited, edited.updatedAt);
const restored = restoreWorkspaceCheckpoint({
  base: pondyCandidateRegistry,
  state,
  candidateId: edited.id,
  checkpointId: checkpoint.id,
  restoredAt: "2026-09-18T10:04:00.000Z"
});
state = restored.state;
const restoredGarage = restored.candidate.components.find((item) => item.id === "garage-b");
assert(restoredGarage && restoredGarage.kind === "garage");
assert.equal(restoredGarage.x, garage.x);
assert.equal(restored.candidate.evidenceState, "STALE");
assert.equal(restored.candidate.currentEvaluationId, null);
const pkg = createWorkspaceExportPackage(
  pondyCandidateRegistry,
  state,
  restored.candidate.id,
  "2026-09-18T10:05:00.000Z"
);
assert(pkg, "workspace export should succeed");
assert.equal(pkg.checkpoints.length, 1);
const imported = importWorkspacePackage({
  base: pondyCandidateRegistry,
  state,
  pkg,
  mode: "COPY",
  createdAt: "2026-09-18T10:06:00.000Z"
});
assert.equal(imported.candidate.status, "DRAFT");
assert.equal(imported.candidate.evidenceState, "REVALIDATION_REQUIRED");
assert.equal(imported.candidate.currentEvaluationId, null);
assert(imported.candidate.evaluationHistory.length >= restored.candidate.evaluationHistory.length);

const sameSecondA = createWorkspaceCheckpoint(branched.candidate, "same-second A", "2026-09-18T10:07:00.001Z");
const sameSecondB = createWorkspaceCheckpoint(branched.candidate, "same-second B", "2026-09-18T10:07:00.002Z");
assert.notEqual(sameSecondA.id, sameSecondB.id, "checkpoint IDs must retain sub-second uniqueness");

const diff = compareCandidateComponents(parent, edited);
assert(diff.changed.includes("garage-b"));
console.log(JSON.stringify({
  schemaVersion: state.schemaVersion,
  variantId: branched.candidate.id,
  checkpointRestore: true,
  importRequiresRevalidation: true,
  changedComponents: diff.changed
}, null, 2));
