import { writeFile } from "node:fs/promises";
import { pondyCandidateRegistry } from "../projects/pondy-lot2/candidate-registry.ts";
import { validateCandidateRoofs } from "../packages/roof-geometry/index.ts";

const candidate = pondyCandidateRegistry.candidates.find((item) => item.id === "pondy-d4");
if (!candidate) throw new Error("pondy-d4 candidate missing");
const summary = validateCandidateRoofs(candidate.components);
if (summary.renderPolicy !== "AUTHORITATIVE_ALLOWED" || summary.locked !== summary.requiredOwnerCount || summary.invalid) {
  throw new Error(`Design 4 roofs are not fully authoritative: ${JSON.stringify(summary)}`);
}
const roofs = summary.results.map((result) => {
  const component = candidate.components.find((item) => item.kind === "roof" && item.id === result.roofId);
  if (!component || component.kind !== "roof") throw new Error(`roof component missing: ${result.roofId}`);
  return {
    id: component.id,
    ownerId: component.ownerId,
    status: result.status,
    authoritative: result.authoritative,
    ownerGeometryKey: component.ownerGeometryKey ?? null,
    zones: result.zones.map((zone) => {
      const authored = component.zones.find((item) => item.id === zone.zoneId);
      return {
        id: zone.zoneId,
        label: authored?.label ?? zone.zoneId,
        footprint: zone.footprint,
        plateZFt: zone.plateZFt,
        ridgeA: zone.ridgeA,
        ridgeB: zone.ridgeB,
        ridgeZFt: zone.ridgeZFt,
        runFt: zone.runFt,
        pitch12: zone.pitch12,
        solveBy: authored?.solveBy ?? null,
        pitchRise: authored?.pitchRise ?? null,
        pitchRun: authored?.pitchRun ?? null,
        source: authored?.source ?? null
      };
    })
  };
});

const artifact = {
  schemaVersion: "lotscope-pondy-d4-roof-lock-v1",
  candidateId: candidate.id,
  designId: candidate.designId,
  sourceRegistry: "projects/pondy-lot2/candidate-registry.ts",
  roofGeometrySchema: summary.schemaVersion,
  lockedAt: candidate.updatedAt,
  renderPolicy: summary.renderPolicy,
  locked: summary.locked,
  required: summary.requiredOwnerCount,
  invalid: summary.invalid,
  roofs
};

await writeFile(new URL("../projects/pondy-design4/roof-lock.json", import.meta.url), JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ path: "projects/pondy-design4/roof-lock.json", locked: artifact.locked, renderPolicy: artifact.renderPolicy }, null, 2));
