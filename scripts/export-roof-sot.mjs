import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { ownerGeometryKey, roofPlanSegments, validateCandidateRoofs } from "../packages/roof-geometry/index.ts";

const candidateId = process.argv[2] || "pondy-d4";
const candidate = pondyCandidateRegistry.candidates.find((item) => item.id === candidateId);
if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);

const summary = validateCandidateRoofs(candidate.components);
const placements = new Map(
  candidate.components
    .filter((item) => item.kind === "home" || item.kind === "garage")
    .map((item) => [item.id, item])
);
const roofs = candidate.components.filter((item) => item.kind === "roof");

const exportedRoofs = summary.results.map((validation) => {
  const roof = roofs.find((item) => item.id === validation.roofId);
  const owner = placements.get(validation.ownerId);
  return {
    id: validation.roofId,
    ownerId: validation.ownerId,
    status: roof?.status ?? "MISSING",
    validationStatus: validation.status,
    authoritative: validation.authoritative,
    ownerGeometryKey: owner ? ownerGeometryKey(owner) : null,
    junctionMode: roof?.junctionMode ?? "TILED",
    zones: validation.zones.map((zone) => ({
      id: zone.zoneId,
      status: zone.status,
      authoritative: zone.authoritative,
      footprint: zone.footprint,
      plateZFt: zone.plateZFt,
      ridgeA: zone.ridgeA,
      ridgeB: zone.ridgeB,
      ridgeZFt: zone.ridgeZFt,
      runFt: zone.runFt,
      pitchRatio: zone.pitchRatio,
      pitch12: zone.pitch12
    })),
    junctions: validation.junctions,
    planSegments: roofPlanSegments(validation),
    errors: validation.errors
  };
});

const payload = {
  schemaVersion: "lotscope-roof-sot-export-v1",
  roofGeometrySchema: summary.schemaVersion,
  candidateId: candidate.id,
  designId: candidate.designId,
  revisionLabel: candidate.revisionLabel,
  renderPolicy: summary.renderPolicy,
  safe: summary.safe,
  counts: {
    required: summary.requiredOwnerCount,
    locked: summary.locked,
    conceptOnly: summary.conceptOnly,
    missing: summary.missing,
    invalid: summary.invalid
  },
  roofs: exportedRoofs
};

process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
