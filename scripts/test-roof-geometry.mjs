import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { addRoofZone, editPlacementComponent, editPlacementVertex, editPlacementWallLength, editRoofZone, lockRoofComponent } from "../packages/candidates/intervention.ts";
import { canonicalizeInterventionGeometry } from "../packages/canonical/intervention-geometry.ts";
import { ownerGeometryKey, validateCandidateRoofs, validateRoofComponent, solveGableZone } from "../packages/roof-geometry/index.ts";

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

const baseHome = d4.components.find((item) => item.id === "home-a");
assert(baseHome?.kind === "home");
const concaveOwner = {
  ...baseHome,
  id: "concave-owner",
  label: "Concave U owner",
  x: 0, y: 0, widthFt: 10, depthFt: 10, rotationDeg: 0,
  polygon: [[0,0],[10,0],[10,10],[7,10],[7,3],[3,3],[3,10],[0,10]]
};
const spanningConcaveRoof = {
  id: "roof-concave-owner",
  kind: "roof",
  label: "Concave owner negative roof",
  ownerId: concaveOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(concaveOwner),
  zones: [{
    id: "concave-zone-1", label: "Invalid bridge rectangle", status: "LOCKED", type: "gable",
    footprint: [[0,2.8],[10,2.8],[10,10],[0,10]],
    plateZFt: 8, ridgeA: [0,6.4], ridgeB: [10,6.4],
    solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
    source: "concave containment negative test"
  }]
};
const concaveValidation = validateRoofComponent(spanningConcaveRoof, concaveOwner);
assert.equal(concaveValidation.status, "FAIL_CLOSED_INVALID");
assert(concaveValidation.errors.some((error) => /extend outside the owner footprint/i.test(error)), "roof zones may not bridge a concave owner cutout even when crossings land on owner vertices");

const overlapOwner = {
  ...baseHome,
  id: "overlap-owner",
  label: "Overlap balance owner",
  x: 0, y: 0, widthFt: 10, depthFt: 10, rotationDeg: 0,
  polygon: undefined
};
const overlapBalanceRoof = {
  id: "roof-overlap-owner",
  kind: "roof",
  label: "Overlap balance negative roof",
  ownerId: overlapOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(overlapOwner),
  zones: [
    {
      id: "overlap-zone-a", label: "A", status: "LOCKED", type: "gable",
      footprint: [[0,0],[6,0],[6,10],[0,10]],
      plateZFt: 8, ridgeA: [3,0], ridgeB: [3,10],
      solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
      source: "overlap balance negative test A"
    },
    {
      id: "overlap-zone-b", label: "B", status: "LOCKED", type: "gable",
      footprint: [[4,0],[8,0],[8,10],[4,10]],
      plateZFt: 8, ridgeA: [6,0], ridgeB: [6,10],
      solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
      source: "overlap balance negative test B"
    }
  ]
};
const overlapBalanceValidation = validateRoofComponent(overlapBalanceRoof, overlapOwner);
assert.equal(overlapBalanceValidation.status, "FAIL_CLOSED_INVALID");
assert(overlapBalanceValidation.errors.some((error) => /overlap in plan/i.test(error)), "overlap and equal-area gap may not cancel each other in roof-zone coverage");

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

const noop = editPlacementComponent(candidate, "home-a", {
  x: owner.x, y: owner.y, widthFt: owner.widthFt, depthFt: owner.depthFt, rotationDeg: owner.rotationDeg ?? 0
}, "2026-10-03T06:00:01.500Z");
assert.equal(noop, candidate, "no-op placement save should return the untouched candidate");
const noopRoof = noop.components.find((item) => item.id === "roof-home-a");
assert(noopRoof?.kind === "roof");
assert.equal(noopRoof.status, "LOCKED", "no-op placement saves must preserve a valid roof lock");
assert.equal(noopRoof.ownerGeometryKey, roof.ownerGeometryKey, "no-op placement saves must preserve the owner geometry binding");

const noopRoofDraft = editRoofZone(candidate, "roof-home-a", "home-a-roof-zone-1", {
  footprint: null,
  plateZFt: 20,
  ridgeA: [94.5, 18.125],
  ridgeB: [128, 18.125],
  solveBy: "PITCH",
  pitchRise: 6,
  pitchRun: 12,
  ridgeZFt: null,
  source: "roof SOT self-test"
}, "2026-10-03T06:00:01.750Z");
assert.equal(noopRoofDraft, candidate, "saving an unchanged roof draft must preserve the locked candidate");

const clearedProvenance = editRoofZone(candidate, "roof-home-a", "home-a-roof-zone-1", { source: "" }, "2026-10-03T06:00:01.800Z");
assert.notEqual(clearedProvenance, candidate, "explicitly clearing provenance must be treated as a real roof edit");
assert.throws(() => lockRoofComponent(clearedProvenance, "roof-home-a", "2026-10-03T06:00:01.850Z"), /provenance|required/i, "a cleared roof source must fail closed when re-locking");

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

const zeroWallDrag = editPlacementWallLength(tiled, "home-b", 0, 0, "2026-10-03T06:01:03.250Z");
assert.equal(zeroWallDrag, tiled, "zero-delta wall edits must preserve the locked candidate");
const sameCorner = tiledOwner.polygon?.[0];
assert(sameCorner);
const zeroCornerDrag = editPlacementVertex(tiled, "home-b", 0, sameCorner, "2026-10-03T06:01:03.300Z");
assert.equal(zeroCornerDrag, tiled, "no-op corner edits must preserve the locked candidate");

const clearedFootprint = editRoofZone(tiled, "roof-home-b", "home-b-roof-zone-1", { footprint: null }, "2026-10-03T06:01:03.500Z");
const clearedRoof = clearedFootprint.components.find((item) => item.id === "roof-home-b");
assert(clearedRoof?.kind === "roof");
assert.equal(clearedRoof.zones.find((zone) => zone.id === "home-b-roof-zone-1")?.footprint, undefined, "explicit roof-zone footprint must be clearable back to owner-derived geometry");

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
  concaveCutoutBridgeRejected: concaveValidation.status === "FAIL_CLOSED_INVALID",
  balancedOverlapGapRejected: overlapBalanceValidation.errors.some((error) => /overlap in plan/i.test(error)),
  clearableProvenanceFailsClosed: true,
  status: validation.status,
  pitch: validation.zones[0].pitch12,
  ridgeZFt: validation.zones[0].ridgeZFt,
  footprintDependencyInvalidation: true,
  noOpPlacementPreservesRoofLock: true,
  noOpRoofDraftPreservesRoofLock: true,
  zeroDeltaWallPreservesRoofLock: true,
  noOpCornerPreservesRoofLock: true,
  explicitZoneFootprintClearable: true,
  offCenterRidgeRejected: true,
  irregularSingleZoneRejected: true,
  multiZoneCoverageAndContinuity: tiledValidation.status === "ROOF_GEOMETRY_LOCKED",
  discontinuousZoneInterfaceRejected: true,
  provenanceRequired: true,
  canonicalRoofGeometry: true
}, null, 2));
