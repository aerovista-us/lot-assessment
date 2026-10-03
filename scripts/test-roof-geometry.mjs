import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { addRoofZone, editPlacementComponent, editRoofZone, lockRoofComponent } from "../packages/candidates/intervention.ts";
import { canonicalizeInterventionGeometry } from "../packages/canonical/intervention-geometry.ts";
import { validateCandidateRoofs, validateRoofComponent, solveGableZone } from "../packages/roof-geometry/index.ts";

const d4 = pondyCandidateRegistry.candidates.find((candidate) => candidate.id === "pondy-d4");
assert(d4);
const d4RoofSummary = validateCandidateRoofs(d4.components);
assert.equal(d4RoofSummary.missing, 0);
assert.equal(d4RoofSummary.conceptOnly, 4);
assert.equal(d4RoofSummary.renderPolicy, "CONCEPT_ONLY_REQUIRED");
const noRoofSummary = validateCandidateRoofs(d4.components.filter((item) => item.kind !== "roof"));
assert.equal(noRoofSummary.missing, 4);
assert.equal(noRoofSummary.renderPolicy, "CONCEPT_ONLY_REQUIRED");

const duplicateRoof = JSON.parse(JSON.stringify(d4.components.find((item) => item.id === "roof-home-a")));
duplicateRoof.id = "roof-home-a-duplicate";
const duplicateSummary = validateCandidateRoofs([...d4.components, duplicateRoof]);
assert.equal(duplicateSummary.renderPolicy, "FAIL_CLOSED_INVALID");
assert(duplicateSummary.results.some((item) => item.errors.some((error) => /multiple roof components/i.test(error))));

const orphanRoof = { ...duplicateRoof, id: "roof-orphan", ownerId: "missing-building" };
const orphanSummary = validateCandidateRoofs([...d4.components, orphanRoof]);
assert.equal(orphanSummary.renderPolicy, "FAIL_CLOSED_INVALID");
assert(orphanSummary.results.some((item) => item.errors.some((error) => /owner placement is missing/i.test(error))));

let candidate = editRoofZone(d4, "roof-home-a", "home-a-roof-zone-1", {
  plateZFt: 20,
  ridgeA: [94.5, 18.125],
  ridgeB: [128, 18.125],
  solveBy: "PITCH",
  pitchRise: 6,
  pitchRun: 12,
  source: "roof SOT self-test"
}, "2026-10-03T06:00:00.000Z");

candidate = lockRoofComponent(candidate, "roof-home-a", "2026-10-03T06:00:01.000Z");
const roof = candidate.components.find((item) => item.id === "roof-home-a");
const owner = candidate.components.find((item) => item.id === "home-a");
assert(roof?.kind === "roof" && owner?.kind === "home");

const validation = validateRoofComponent(roof, owner);
assert.equal(validation.status, "ROOF_GEOMETRY_LOCKED");
assert.equal(validation.authoritative, true);
assert.equal(validation.zones[0].pitch12, "6:12");
assert(Math.abs((validation.zones[0].ridgeZFt ?? 0) - 26.5625) < 0.001);

const canonical = canonicalizeInterventionGeometry(candidate);
assert.equal(canonical.schemaVersion, "lotscope-intervention-geometry-v3");
assert.equal(canonical.roofs.find((item) => item.id === "roof-home-a")?.status, "LOCKED");

const moved = editPlacementComponent(candidate, "home-a", { x: 95.5 }, "2026-10-03T06:00:02.000Z");
const staleRoof = moved.components.find((item) => item.id === "roof-home-a");
assert(staleRoof?.kind === "roof");
assert.equal(staleRoof.status, "UNLOCKED");
assert.match(staleRoof.staleReason ?? "", /placement changed/i);

const badZone = {
  ...roof.zones[0],
  status: "LOCKED",
  ridgeA: [94.5, 16],
  ridgeB: [128, 16]
};
const invalid = solveGableZone(owner, badZone);
assert.equal(invalid.authoritative, false);
assert(invalid.errors.some((error) => /off center/i.test(error)));

const ownerB = d4.components.find((item) => item.id === "home-b");
assert(ownerB?.kind === "home");
const oneZoneIrregular = solveGableZone(ownerB, {
  id: "bad-home-b-single-zone", label: "Bad whole-shell gable", status: "LOCKED", type: "gable",
  plateZFt: 20, ridgeA: [54, 18.125], ridgeB: [94.5, 18.125],
  solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null, source: "negative test"
});
assert.equal(oneZoneIrregular.authoritative, false);
assert(oneZoneIrregular.errors.some((error) => /rectangular roof zone/i.test(error)));

let tiled = editRoofZone(d4, "roof-home-b", "home-b-roof-zone-1", {
  footprint: [[54,5],[94.5,5],[94.5,22],[54,22]],
  plateZFt: 20, ridgeA: [54,13.5], ridgeB: [94.5,13.5],
  solveBy: "PITCH", pitchRise: 6, pitchRun: 12, source: "Home B tile self-test"
}, "2026-10-03T06:01:00.000Z");
tiled = addRoofZone(tiled, "roof-home-b", "South finger gable", "2026-10-03T06:01:01.000Z");
tiled = editRoofZone(tiled, "roof-home-b", "home-b-roof-zone-2", {
  footprint: [[72.5,22],[94.5,22],[94.5,31.25],[72.5,31.25]],
  plateZFt: 20, ridgeA: [72.5,26.625], ridgeB: [94.5,26.625],
  solveBy: "PITCH", pitchRise: 6, pitchRun: 12, source: "Home B tile self-test"
}, "2026-10-03T06:01:02.000Z");
tiled = lockRoofComponent(tiled, "roof-home-b", "2026-10-03T06:01:03.000Z");
const tiledRoof = tiled.components.find((item) => item.id === "roof-home-b");
const tiledOwner = tiled.components.find((item) => item.id === "home-b");
assert(tiledRoof?.kind === "roof" && tiledOwner?.kind === "home");
const tiledValidation = validateRoofComponent(tiledRoof, tiledOwner);
assert.equal(tiledValidation.status, "ROOF_GEOMETRY_LOCKED");
assert.equal(tiledValidation.zones.length, 2);

const discontinuous = editRoofZone(tiled, "roof-home-b", "home-b-roof-zone-2", {
  plateZFt: 21
}, "2026-10-03T06:01:04.000Z");
assert.throws(() => lockRoofComponent(discontinuous, "roof-home-b", "2026-10-03T06:01:05.000Z"), /discontinuous/i);

const noSource = solveGableZone(owner, { ...roof.zones[0], source: "", status: "LOCKED" });
assert.equal(noSource.authoritative, false);
assert(noSource.errors.some((error) => /source/i.test(error)));

console.log(JSON.stringify({
  schema: validation.schemaVersion,
  d4RenderPolicy: d4RoofSummary.renderPolicy,
  missingRoofModelsFailToConceptOnly: noRoofSummary.missing === 4,
  duplicateRoofOwnersFailClosed: duplicateSummary.renderPolicy === "FAIL_CLOSED_INVALID",
  orphanRoofsFailClosed: orphanSummary.renderPolicy === "FAIL_CLOSED_INVALID",
  status: validation.status,
  pitch: validation.zones[0].pitch12,
  ridgeZFt: validation.zones[0].ridgeZFt,
  footprintDependencyInvalidation: true,
  offCenterRidgeRejected: true,
  irregularSingleZoneRejected: true,
  multiZoneCoverageAndContinuity: tiledValidation.status === "ROOF_GEOMETRY_LOCKED",
  discontinuousZoneInterfaceRejected: true,
  provenanceRequired: true,
  canonicalRoofGeometry: true
}, null, 2));
