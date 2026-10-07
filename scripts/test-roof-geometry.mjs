import assert from "node:assert/strict";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { cloneCandidateComponents } from "../packages/candidates/index.ts";
import { addRoofZone, editPlacementComponent, editPlacementVertex, editPlacementWallLength, editRoofZone, lockRoofComponent } from "../packages/candidates/intervention.ts";
import { canonicalizeInterventionGeometry } from "../packages/canonical/intervention-geometry.ts";
import { ownerGeometryKey, validateCandidateRoofs, validateRoofComponent, solveGableZone } from "../packages/roof-geometry/index.ts";

const d4 = pondyCandidateRegistry.candidates.find((candidate) => candidate.id === "pondy-d4");
assert(d4);
const d4RoofSummary = validateCandidateRoofs(d4.components);
assert.equal(d4RoofSummary.missing, 0);
assert.equal(d4RoofSummary.locked, 3);
assert.equal(d4RoofSummary.conceptOnly, 1);
assert.equal(d4RoofSummary.renderPolicy, "CONCEPT_ONLY_REQUIRED");
assert(d4RoofSummary.results.some((item) => item.ownerId === "home-b" && item.status === "CONCEPT_ONLY"), "Home B must remain concept-only until its internal roof junction has a supported solver");
const noRoofSummary = validateCandidateRoofs(d4.components.filter((item) => item.kind !== "roof"));
assert.equal(noRoofSummary.missing, 4);
assert.equal(noRoofSummary.renderPolicy, "CONCEPT_ONLY_REQUIRED");

const d4b = pondyCandidateRegistry.candidates.find((candidate) => candidate.id === "pondy-d4b-rot35b");
assert(d4b);
const d4bRoofSummary = validateCandidateRoofs(d4b.components);
assert.equal(d4bRoofSummary.renderPolicy, "CONCEPT_ONLY_REQUIRED");
assert(d4bRoofSummary.results.some((item) => item.ownerId === "garage-b" && item.status === "NO_MODEL"), "rotated Garage B must not inherit the baseline garage roof lock");
assert(d4bRoofSummary.results.some((item) => item.ownerId === "garage-a" && item.status === "NO_MODEL"), "replacement Garage A must not inherit a roof lock from the baseline component set");

const d4Draft = {
  ...d4,
  components: cloneCandidateComponents(d4.components).map((item) => {
    if (item.kind !== "roof") return item;
    const zones = item.id === "roof-home-b" ? item.zones.slice(0, 1) : item.zones;
    return { ...item, status: "UNLOCKED", ownerGeometryKey: undefined, zones: zones.map((zone) => ({ ...zone, status: "UNLOCKED" })) };
  })
};

const duplicateRoof = JSON.parse(JSON.stringify(d4.components.find((item) => item.id === "roof-home-a")));
duplicateRoof.id = "roof-home-a-duplicate";
const duplicateSummary = validateCandidateRoofs([...d4.components, duplicateRoof]);
assert.equal(duplicateSummary.renderPolicy, "FAIL_CLOSED_INVALID");
assert(duplicateSummary.results.some((item) => item.errors.some((error) => /multiple roof components/i.test(error))));

const orphanRoof = { ...duplicateRoof, id: "roof-orphan", ownerId: "missing-building" };
const orphanSummary = validateCandidateRoofs([...d4.components, orphanRoof]);
assert.equal(orphanSummary.renderPolicy, "FAIL_CLOSED_INVALID");
assert(orphanSummary.results.some((item) => item.errors.some((error) => /owner placement is missing/i.test(error))));

const malformedMissingZones = { ...duplicateRoof, id: "roof-malformed-missing-zones" };
delete malformedMissingZones.zones;
const malformedMissingValidation = validateRoofComponent(malformedMissingZones, d4.components.find((item) => item.id === "home-a"));
assert.equal(malformedMissingValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedMissingValidation.errors.some((error) => /zones must be an array/i.test(error)));

const malformedNullZone = { ...duplicateRoof, id: "roof-malformed-null-zone", zones: [null] };
const malformedNullValidation = validateRoofComponent(malformedNullZone, d4.components.find((item) => item.id === "home-a"));
assert.equal(malformedNullValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedNullValidation.errors.some((error) => /malformed zone record/i.test(error)));

const clonedMalformed = cloneCandidateComponents([malformedMissingZones, malformedNullZone]);
assert.equal(clonedMalformed.length, 2, "malformed roof records must clone without crashing workspace branch/checkpoint operations");
assert.equal(validateRoofComponent(clonedMalformed[0], d4.components.find((item) => item.id === "home-a")).status, "FAIL_CLOSED_INVALID");
assert.equal(validateRoofComponent(clonedMalformed[1], d4.components.find((item) => item.id === "home-a")).status, "FAIL_CLOSED_INVALID");
const malformedCanonicalCandidate = { ...d4, components: [...d4.components.filter((item) => item.id !== "roof-home-a"), malformedMissingZones] };
const malformedCanonical = canonicalizeInterventionGeometry(malformedCanonicalCandidate);
const malformedCanonicalRoof = malformedCanonical.roofs.find((item) => item.id === "roof-malformed-missing-zones");
assert(malformedCanonicalRoof, "malformed roofs must remain representable in canonical intervention geometry");
assert(malformedCanonicalRoof.zones.some((zone) => zone.malformed), "canonical intervention geometry must mark malformed roof zones instead of throwing");

const malformedOwnerEditCandidate = {
  ...d4,
  components: [...d4.components.filter((item) => item.id !== "roof-home-a"), malformedMissingZones]
};
const malformedOwnerEdited = editPlacementComponent(malformedOwnerEditCandidate, "home-a", { x: 95 }, "2026-10-03T05:59:59.000Z");
const malformedOwnerEditedRoof = malformedOwnerEdited.components.find((item) => item.id === "roof-malformed-missing-zones");
assert(malformedOwnerEditedRoof?.kind === "roof");
assert.equal(malformedOwnerEditedRoof.status, "UNLOCKED", "owner edits must invalidate malformed roofs without throwing");
assert.equal(validateRoofComponent(malformedOwnerEditedRoof, malformedOwnerEdited.components.find((item) => item.id === "home-a")).status, "FAIL_CLOSED_INVALID");

const ownerDerivedCanonical = canonicalizeInterventionGeometry(d4);
const explicitNullComponents = cloneCandidateComponents(d4.components);
const explicitNullRoof = explicitNullComponents.find((item) => item.id === "roof-home-a");
assert(explicitNullRoof?.kind === "roof");
explicitNullRoof.zones[0].footprint = null;
const explicitNullCanonical = canonicalizeInterventionGeometry({ ...d4, components: explicitNullComponents });
const ownerDerivedZone = ownerDerivedCanonical.roofs.find((item) => item.id === "roof-home-a")?.zones[0];
const explicitNullZone = explicitNullCanonical.roofs.find((item) => item.id === "roof-home-a")?.zones[0];
assert.equal(ownerDerivedZone?.footprintState, "OWNER_DERIVED");
assert.equal(explicitNullZone?.footprintState, "MALFORMED");
assert.equal(explicitNullZone?.malformed, true);
assert.notEqual(JSON.stringify(ownerDerivedCanonical), JSON.stringify(explicitNullCanonical), "absent owner-derived footprint and explicit null footprint must produce different canonical revisions");

const twoCoordinateComponents = cloneCandidateComponents(d4.components);
const twoCoordinateRoof = twoCoordinateComponents.find((item) => item.id === "roof-home-a");
assert(twoCoordinateRoof?.kind === "roof");
twoCoordinateRoof.zones[0].ridgeA = [94.5, 18.125];
const twoCoordinateCanonical = canonicalizeInterventionGeometry({ ...d4, components: twoCoordinateComponents });

const extraCoordinateComponents = cloneCandidateComponents(d4.components);
const extraCoordinateRoof = extraCoordinateComponents.find((item) => item.id === "roof-home-a");
assert(extraCoordinateRoof?.kind === "roof");
extraCoordinateRoof.zones[0].ridgeA = [94.5, 18.125, 999];
const extraCoordinateCanonical = canonicalizeInterventionGeometry({ ...d4, components: extraCoordinateComponents });
const extraCoordinateZone = extraCoordinateCanonical.roofs.find((item) => item.id === "roof-home-a")?.zones[0];
assert.equal(extraCoordinateZone?.ridgeA, null, "canonical points with extra coordinates must be marked malformed rather than truncated");
assert.equal(extraCoordinateZone?.malformed, true, "extra-coordinate ridge points must mark canonical roof state malformed");
assert.notEqual(JSON.stringify(twoCoordinateCanonical), JSON.stringify(extraCoordinateCanonical), "extra-coordinate points must change the canonical revision from a valid two-coordinate point");

const microShiftBaseComponents = cloneCandidateComponents(d4.components);
const microShiftBaseRoof = microShiftBaseComponents.find((item) => item.id === "roof-home-a");
const microShiftOwner = microShiftBaseComponents.find((item) => item.id === "home-a");
assert(microShiftBaseRoof?.kind === "roof");
assert(microShiftOwner?.kind === "home");
const ownerFootprint = microShiftOwner.polygon ?? [
  [microShiftOwner.x, microShiftOwner.y],
  [microShiftOwner.x + microShiftOwner.widthFt, microShiftOwner.y],
  [microShiftOwner.x + microShiftOwner.widthFt, microShiftOwner.y + microShiftOwner.depthFt],
  [microShiftOwner.x, microShiftOwner.y + microShiftOwner.depthFt]
];
microShiftBaseRoof.zones[0].footprint = ownerFootprint.map(([x, y]) => [x, y]);
const microShiftBaseCanonical = canonicalizeInterventionGeometry({ ...d4, components: microShiftBaseComponents });

const microShiftChangedComponents = cloneCandidateComponents(microShiftBaseComponents);
const microShiftChangedRoof = microShiftChangedComponents.find((item) => item.id === "roof-home-a");
assert(microShiftChangedRoof?.kind === "roof");
microShiftChangedRoof.zones[0].footprint[0][0] += 0.00001;
const microShiftChangedCanonical = canonicalizeInterventionGeometry({ ...d4, components: microShiftChangedComponents });
assert.notEqual(
  JSON.stringify(microShiftBaseCanonical),
  JSON.stringify(microShiftChangedCanonical),
  "solver-significant 0.00001 ft roof coordinate changes must change the canonical intervention revision"
);

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

const tinyOverlapOwner = {
  ...baseHome,
  id: "tiny-overlap-owner",
  label: "Tiny overlap owner",
  x: 0, y: 0, widthFt: 100, depthFt: 10, rotationDeg: 0,
  polygon: undefined
};
const tinyOverlapRoof = {
  id: "roof-tiny-overlap-owner",
  kind: "roof",
  label: "Tiny overlap negative roof",
  ownerId: tinyOverlapOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(tinyOverlapOwner),
  zones: [
    {
      id: "tiny-overlap-a", label: "A", status: "LOCKED", type: "gable",
      footprint: [[0,0],[50.005,0],[50.005,10],[0,10]],
      plateZFt: 8, ridgeA: [25.0025,0], ridgeB: [25.0025,10],
      solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
      source: "tiny overlap negative test A"
    },
    {
      id: "tiny-overlap-b", label: "B", status: "LOCKED", type: "gable",
      footprint: [[49.995,0],[99.99,0],[99.99,10],[49.995,10]],
      plateZFt: 8, ridgeA: [74.9925,0], ridgeB: [74.9925,10],
      solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
      source: "tiny overlap negative test B"
    }
  ]
};
const tinyOverlapValidation = validateRoofComponent(tinyOverlapRoof, tinyOverlapOwner);
assert.equal(tinyOverlapValidation.status, "FAIL_CLOSED_INVALID");
assert(tinyOverlapValidation.errors.some((error) => /overlap in plan/i.test(error)), "any positive interior overlap must fail even when it is smaller than plan-display tolerance");

const subToleranceOutsideRoof = {
  id: "roof-sub-tolerance-outside",
  kind: "roof",
  label: "Sub-tolerance outside negative roof",
  ownerId: tinyOverlapOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(tinyOverlapOwner),
  zones: [{
    id: "sub-tolerance-outside-zone", label: "Shifted rectangle", status: "LOCKED", type: "gable",
    footprint: [[0.01,0],[100.01,0],[100.01,10],[0.01,10]],
    plateZFt: 8, ridgeA: [50.01,0], ridgeB: [50.01,10],
    solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
    source: "strict containment negative test"
  }]
};
const subToleranceOutsideValidation = validateRoofComponent(subToleranceOutsideRoof, tinyOverlapOwner);
assert.equal(subToleranceOutsideValidation.status, "FAIL_CLOSED_INVALID");
assert(subToleranceOutsideValidation.errors.some((error) => /extend outside the owner footprint/i.test(error)), "authoritative owner containment must not use display/plan tolerance");

const tinyCoverageGapRoof = {
  id: "roof-tiny-coverage-gap",
  kind: "roof",
  label: "Tiny coverage gap negative roof",
  ownerId: overlapOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(overlapOwner),
  zones: [{
    id: "tiny-coverage-gap-zone", label: "Inset rectangle", status: "LOCKED", type: "gable",
    footprint: [[0.005,0],[10,0],[10,10],[0.005,10]],
    plateZFt: 8, ridgeA: [5.0025,0], ridgeB: [5.0025,10],
    solveBy: "PITCH", pitchRise: 6, pitchRun: 12, ridgeZFt: null,
    source: "tiny coverage gap negative test"
  }]
};
const tinyCoverageGapValidation = validateRoofComponent(tinyCoverageGapRoof, overlapOwner);
assert.equal(tinyCoverageGapValidation.status, "FAIL_CLOSED_INVALID");
assert(tinyCoverageGapValidation.errors.some((error) => /coverage differs/i.test(error)), "any positive uncovered owner area must fail authoritative roof coverage");

const zeroPitchCheckRoof = {
  id: "roof-zero-pitch-check",
  kind: "roof",
  label: "Zero pitch check negative roof",
  ownerId: overlapOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(overlapOwner),
  zones: [{
    id: "zero-pitch-check-zone", label: "RIDGE_Z checked gable", status: "LOCKED", type: "gable",
    plateZFt: 8, ridgeA: [5,0], ridgeB: [5,10],
    solveBy: "RIDGE_Z", pitchRise: null, pitchRun: null, ridgeZFt: 13,
    pitchCheckRise: 0, pitchCheckRun: 12,
    source: "zero pitch check negative test"
  }]
};
const zeroPitchCheckValidation = validateRoofComponent(zeroPitchCheckRoof, overlapOwner);
assert.equal(zeroPitchCheckValidation.status, "FAIL_CLOSED_INVALID");
assert(zeroPitchCheckValidation.errors.some((error) => /pitch check mismatch/i.test(error)), "an explicit 0:12 verification check must be compared rather than skipped");

const partialPitchCheckRoof = {
  ...zeroPitchCheckRoof,
  id: "roof-partial-pitch-check",
  zones: [{ ...zeroPitchCheckRoof.zones[0], id: "partial-pitch-check-zone", pitchCheckRise: 6, pitchCheckRun: null }]
};
const partialPitchCheckValidation = validateRoofComponent(partialPitchCheckRoof, overlapOwner);
assert.equal(partialPitchCheckValidation.status, "FAIL_CLOSED_INVALID");
assert(partialPitchCheckValidation.errors.some((error) => /requires both/i.test(error)), "a partially supplied pitch verification check must fail closed");

const interfaceOwner = {
  ...baseHome,
  id: "interface-break-owner",
  label: "Interface breakpoint owner",
  x: 0, y: 0, widthFt: 10, depthFt: 10, rotationDeg: 0,
  polygon: [[0,0],[5,0],[5,4],[10,4],[10,8],[5,8],[5,10],[0,10]]
};
const interfaceBreakRoof = {
  id: "roof-interface-break-owner",
  kind: "roof",
  label: "Interface breakpoint negative roof",
  ownerId: interfaceOwner.id,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(interfaceOwner),
  zones: [
    {
      id: "interface-zone-a", label: "Tall zone", status: "LOCKED", type: "gable",
      footprint: [[0,0],[5,0],[5,10],[0,10]],
      plateZFt: 0, ridgeA: [0,5], ridgeB: [5,5],
      solveBy: "PITCH", pitchRise: 0.216, pitchRun: 12, ridgeZFt: null,
      source: "interface breakpoint negative test A"
    },
    {
      id: "interface-zone-b", label: "Short zone", status: "LOCKED", type: "gable",
      footprint: [[5,4],[10,4],[10,8],[5,8]],
      plateZFt: 0.054, ridgeA: [5,6], ridgeB: [10,6],
      solveBy: "PITCH", pitchRise: 0.108, pitchRun: 12, ridgeZFt: null,
      source: "interface breakpoint negative test B"
    }
  ]
};
const interfaceBreakValidation = validateRoofComponent(interfaceBreakRoof, interfaceOwner);
assert.equal(interfaceBreakValidation.status, "FAIL_CLOSED_INVALID");
assert(interfaceBreakValidation.errors.some((error) => /vertically discontinuous/i.test(error)), "shared interfaces must sample every ridge/slope breakpoint, not only endpoints and midpoint");

let candidate = editRoofZone(d4Draft, "roof-home-a", "home-a-roof-zone-1", {
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

const malformedFootprintRoof = {
  ...roof,
  zones: [{ ...roof.zones[0], footprint: [[94.5,5],[128,5]] }]
};
const malformedFootprintValidation = validateRoofComponent(malformedFootprintRoof, owner);
assert.equal(malformedFootprintValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedFootprintValidation.errors.some((error) => /expected 4 vertices/i.test(error)), "an explicitly present malformed roof footprint must not inherit the owner footprint");

const stringFootprintRoof = {
  ...roof,
  zones: [{ ...roof.zones[0], footprint: [["94.5", "5"], ["128", "5"], ["128", "31.25"], ["94.5", "31.25"]] }]
};
const stringFootprintValidation = validateRoofComponent(stringFootprintRoof, owner);
assert.equal(stringFootprintValidation.status, "FAIL_CLOSED_INVALID");
assert(stringFootprintValidation.errors.some((error) => /finite numeric \[x, y\] points/i.test(error)), "string footprint coordinates must not be numerically coerced");

const malformedOwner = { ...owner, rotationDeg: "n/a" };
const malformedOwnerValidation = validateRoofComponent(roof, malformedOwner);
assert.equal(malformedOwnerValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedOwnerValidation.errors.some((error) => /owner geometry is malformed/i.test(error)), "malformed owner geometry must fail closed instead of throwing");

const stringRidgeRoof = {
  ...roof,
  zones: [{ ...roof.zones[0], ridgeA: ["94.5", "18.125"], ridgeB: ["128", "18.125"] }]
};
const stringRidgeValidation = validateRoofComponent(stringRidgeRoof, owner);
assert.equal(stringRidgeValidation.status, "FAIL_CLOSED_INVALID");
assert(stringRidgeValidation.errors.some((error) => /finite numeric world coordinates/i.test(error)), "string ridge coordinates must never be coerced into authoritative geometry");

const malformedRidgeCheckRoof = {
  ...roof,
  zones: [{ ...roof.zones[0], ridgeZCheckFt: "n/a" }]
};
const malformedRidgeCheckValidation = validateRoofComponent(malformedRidgeCheckRoof, owner);
assert.equal(malformedRidgeCheckValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedRidgeCheckValidation.errors.some((error) => /ridgeZCheckFt must be a finite number/i.test(error)), "malformed optional ridge-Z verification evidence must fail closed");

const malformedPitchChecksOnPitchRoof = {
  ...roof,
  zones: [{ ...roof.zones[0], pitchCheckRise: "bad", pitchCheckRun: { bad: true } }]
};
const malformedPitchChecksOnPitchValidation = validateRoofComponent(malformedPitchChecksOnPitchRoof, owner);
assert.equal(malformedPitchChecksOnPitchValidation.status, "FAIL_CLOSED_INVALID");
assert(malformedPitchChecksOnPitchValidation.errors.some((error) => /pitchCheckRise must be a finite number/i.test(error)), "malformed pitch-check rise must fail closed even when PITCH is the authoritative solve mode");
assert(malformedPitchChecksOnPitchValidation.errors.some((error) => /pitchCheckRun must be a finite number/i.test(error)), "malformed pitch-check run must fail closed even when PITCH is the authoritative solve mode");

const canonical = canonicalizeInterventionGeometry(candidate);
assert.equal(canonical.schemaVersion, "lotscope-intervention-geometry-v3");
assert.equal(canonical.roofs.find((item) => item.id === "roof-home-a")?.status, "LOCKED");

const malformedRidgeCheckCandidate = {
  ...candidate,
  components: candidate.components.map((item) => item.id === "roof-home-a" ? malformedRidgeCheckRoof : item)
};
const malformedRidgeCheckCanonical = canonicalizeInterventionGeometry(malformedRidgeCheckCandidate);
const malformedRidgeCheckCanonicalZone = malformedRidgeCheckCanonical.roofs.find((item) => item.id === "roof-home-a")?.zones[0];
assert.equal(malformedRidgeCheckCanonicalZone?.ridgeZCheckFtState, "MALFORMED");
assert.equal(malformedRidgeCheckCanonicalZone?.malformed, true);
assert.notEqual(JSON.stringify(canonical), JSON.stringify(malformedRidgeCheckCanonical), "malformed ridge-Z check presence must change the canonical revision");

const malformedPitchCheckComponents = cloneCandidateComponents(candidate.components);
const malformedPitchCheckRoof = malformedPitchCheckComponents.find((item) => item.id === "roof-home-a");
assert(malformedPitchCheckRoof?.kind === "roof");
malformedPitchCheckRoof.zones[0].pitchCheckRise = "bad";
malformedPitchCheckRoof.zones[0].pitchCheckRun = { bad: true };
const malformedPitchCheckCanonical = canonicalizeInterventionGeometry({ ...candidate, components: malformedPitchCheckComponents });
const malformedPitchCheckCanonicalZone = malformedPitchCheckCanonical.roofs.find((item) => item.id === "roof-home-a")?.zones[0];
assert.equal(malformedPitchCheckCanonicalZone?.pitchCheckRiseState, "MALFORMED");
assert.equal(malformedPitchCheckCanonicalZone?.pitchCheckRunState, "MALFORMED");
assert.equal(malformedPitchCheckCanonicalZone?.malformed, true);
assert.notEqual(JSON.stringify(canonical), JSON.stringify(malformedPitchCheckCanonical), "malformed pitch-check presence must change the canonical revision");

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

const noopRoofDraftFromUi = editRoofZone(candidate, "roof-home-a", "home-a-roof-zone-1", {
  footprint: null,
  plateZFt: 20,
  ridgeA: [94.5, 18.125],
  ridgeB: [128, 18.125],
  solveBy: "PITCH",
  pitchRise: 6,
  pitchRun: 12,
  ridgeZFt: null,
  ridgeZCheckFt: null,
  pitchCheckRise: null,
  pitchCheckRun: null,
  source: "roof SOT self-test"
}, "2026-10-03T06:00:01.775Z");
assert.equal(noopRoofDraftFromUi, candidate, "blank optional verification controls must not turn an unchanged roof save into an edit");

const clearedProvenance = editRoofZone(candidate, "roof-home-a", "home-a-roof-zone-1", { source: "" }, "2026-10-03T06:00:01.800Z");
assert.notEqual(clearedProvenance, candidate, "explicitly clearing provenance must be treated as a real roof edit");
assert.throws(() => lockRoofComponent(clearedProvenance, "roof-home-a", "2026-10-03T06:00:01.850Z"), /provenance|required/i, "a cleared roof source must fail closed when re-locking");

let checkedCandidate = editRoofZone(candidate, "roof-home-a", "home-a-roof-zone-1", { ridgeZCheckFt: 26.5625 }, "2026-10-03T06:00:01.860Z");
checkedCandidate = lockRoofComponent(checkedCandidate, "roof-home-a", "2026-10-03T06:00:01.870Z");
let checkedRoof = checkedCandidate.components.find((item) => item.id === "roof-home-a");
assert(checkedRoof?.kind === "roof");
assert(Math.abs((checkedRoof.zones[0].ridgeZCheckFt ?? 0) - 26.563) < 0.0001, "verification inputs follow the editor precision contract");
const clearedCheckCandidate = editRoofZone(checkedCandidate, "roof-home-a", "home-a-roof-zone-1", { ridgeZCheckFt: null }, "2026-10-03T06:00:01.880Z");
checkedRoof = clearedCheckCandidate.components.find((item) => item.id === "roof-home-a");
assert(checkedRoof?.kind === "roof");
assert.equal(checkedRoof.zones[0].ridgeZCheckFt, null, "optional ridge-Z verification must be clearable");
const relockedAfterCheckClear = lockRoofComponent(clearedCheckCandidate, "roof-home-a", "2026-10-03T06:00:01.890Z");
assert.equal(relockedAfterCheckClear.components.find((item) => item.id === "roof-home-a")?.status, "LOCKED");

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

let tiled = editRoofZone(d4Draft, "roof-home-b", "home-b-roof-zone-1", {
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
const tiledRoofDraft = tiled.components.find((item) => item.id === "roof-home-b");
const tiledOwner = tiled.components.find((item) => item.id === "home-b");
assert(tiledRoofDraft?.kind === "roof" && tiledOwner?.kind === "home");
const tiledRoof = {
  ...tiledRoofDraft,
  status: "LOCKED",
  ownerGeometryKey: ownerGeometryKey(tiledOwner),
  staleReason: undefined,
  zones: tiledRoofDraft.zones.map((zone) => ({ ...zone, status: "LOCKED" }))
};
const tiledValidation = validateRoofComponent(tiledRoof, tiledOwner);
assert.equal(tiledValidation.status, "FAIL_CLOSED_INVALID");
assert(tiledValidation.errors.some((error) => /unsupported internal low seam\/valley/i.test(error)));
assert.throws(() => lockRoofComponent(tiled, "roof-home-b", "2026-10-03T06:01:03.000Z"), /unsupported internal low seam\/valley/i);

let toleranceBypass = editRoofZone(tiled, "roof-home-b", "home-b-roof-zone-1", {
  ridgeA: [54,13.514], ridgeB: [94.5,13.514], pitchRise: 24, pitchRun: 12
}, "2026-10-03T06:01:03.010Z");
toleranceBypass = editRoofZone(toleranceBypass, "roof-home-b", "home-b-roof-zone-2", {
  ridgeA: [72.5,26.611], ridgeB: [94.5,26.611], pitchRise: 24, pitchRun: 12
}, "2026-10-03T06:01:03.020Z");
assert.throws(() => lockRoofComponent(toleranceBypass, "roof-home-b", "2026-10-03T06:01:03.030Z"), /unsupported internal eave-to-eave low seam\/valley/i, "low-seam rejection must not be bypassable through centering/Z tolerances");

const duplicateZoneIdRoof = {
  ...tiledRoof,
  zones: tiledRoof.zones.map((zone) => ({ ...zone, id: "home-b-roof-zone-1" }))
};
const duplicateZoneIdValidation = validateRoofComponent(duplicateZoneIdRoof, tiledOwner);
assert.equal(duplicateZoneIdValidation.status, "FAIL_CLOSED_INVALID");
assert(duplicateZoneIdValidation.errors.some((error) => /duplicate ids/i.test(error)), "duplicate roof-zone IDs must fail closed before authoritative validation");

const missingZoneIdRoof = {
  ...tiledRoof,
  zones: tiledRoof.zones.map((zone, index) => index === 0 ? { ...zone, id: "" } : zone)
};
const missingZoneIdValidation = validateRoofComponent(missingZoneIdRoof, tiledOwner);
assert.equal(missingZoneIdValidation.status, "FAIL_CLOSED_INVALID");
assert(missingZoneIdValidation.errors.some((error) => /non-empty string ids/i.test(error)), "missing roof-zone IDs must fail closed before authoritative validation");

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
  d4AuthoritativeRoofsLocked: d4RoofSummary.locked === 4,
  d4HomeBJunctionFailClosed: d4RoofSummary.results.some((item) => item.ownerId === "home-b" && item.status === "CONCEPT_ONLY"),
  d4bGarageLocksNotInherited: d4bRoofSummary.results.filter((item) => item.ownerId === "garage-a" || item.ownerId === "garage-b").every((item) => item.status === "NO_MODEL"),
  missingRoofModelsFailToConceptOnly: noRoofSummary.missing === 4,
  duplicateRoofOwnersFailClosed: duplicateSummary.renderPolicy === "FAIL_CLOSED_INVALID",
  orphanRoofsFailClosed: orphanSummary.renderPolicy === "FAIL_CLOSED_INVALID",
  malformedRoofArraysFailClosedWithoutCrash: malformedMissingValidation.status === "FAIL_CLOSED_INVALID" && malformedNullValidation.status === "FAIL_CLOSED_INVALID",
  malformedRoofCanonicalizationSafe: Boolean(malformedCanonicalRoof?.zones.some((zone) => zone.malformed)),
  malformedRoofOwnerInvalidationSafe: malformedOwnerEditedRoof?.status === "UNLOCKED",
  nullFootprintCanonicalizedDistinctly: explicitNullZone?.footprintState === "MALFORMED",
  extraCoordinateCanonicalPointRejected: extraCoordinateZone?.ridgeA === null,
  duplicateZoneIdsRejected: duplicateZoneIdValidation.status === "FAIL_CLOSED_INVALID",
  missingZoneIdsRejected: missingZoneIdValidation.status === "FAIL_CLOSED_INVALID",
  interfaceSlopeBreakpointsChecked: interfaceBreakValidation.errors.some((error) => /vertically discontinuous/i.test(error)),
  optionalVerificationChecksClearable: true,
  concaveCutoutBridgeRejected: concaveValidation.status === "FAIL_CLOSED_INVALID",
  balancedOverlapGapRejected: overlapBalanceValidation.errors.some((error) => /overlap in plan/i.test(error)),
  tinyPositiveOverlapRejected: tinyOverlapValidation.errors.some((error) => /overlap in plan/i.test(error)),
  subToleranceExteriorZoneRejected: subToleranceOutsideValidation.status === "FAIL_CLOSED_INVALID",
  tinyCoverageGapRejected: tinyCoverageGapValidation.errors.some((error) => /coverage differs/i.test(error)),
  zeroPitchCheckCompared: zeroPitchCheckValidation.errors.some((error) => /pitch check mismatch/i.test(error)),
  partialPitchCheckRejected: partialPitchCheckValidation.errors.some((error) => /requires both/i.test(error)),
  malformedExplicitFootprintRejected: malformedFootprintValidation.status === "FAIL_CLOSED_INVALID",
  nonnumericFootprintCoordinatesRejected: stringFootprintValidation.status === "FAIL_CLOSED_INVALID",
  malformedOwnerGeometryFailsClosed: malformedOwnerValidation.status === "FAIL_CLOSED_INVALID",
  nonnumericRidgeCoordinatesRejected: stringRidgeValidation.status === "FAIL_CLOSED_INVALID",
  malformedRidgeZCheckRejected: malformedRidgeCheckValidation.status === "FAIL_CLOSED_INVALID",
  malformedPitchChecksRejectedInPitchMode: malformedPitchChecksOnPitchValidation.status === "FAIL_CLOSED_INVALID",
  malformedOptionalChecksChangeCanonicalRevision: malformedRidgeCheckCanonicalZone?.ridgeZCheckFtState === "MALFORMED"
    && malformedPitchCheckCanonicalZone?.pitchCheckRiseState === "MALFORMED"
    && malformedPitchCheckCanonicalZone?.pitchCheckRunState === "MALFORMED",
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
  unsupportedInternalLowSeamRejected: tiledValidation.status === "FAIL_CLOSED_INVALID",
  lowSeamToleranceBypassRejected: true,
  discontinuousZoneInterfaceRejected: true,
  provenanceRequired: true,
  canonicalRoofGeometry: true
}, null, 2));
