import { createHash } from "node:crypto";
import type { CandidateRecord } from "@/packages/candidates";
import {
  CANONICAL_INTERVENTION_GEOMETRY_SCHEMA,
  canonicalizeInterventionGeometry,
  type CanonicalInterventionGeometryV3
} from "@/packages/canonical/intervention-geometry";

export { CANONICAL_INTERVENTION_GEOMETRY_SCHEMA, canonicalizeInterventionGeometry } from "@/packages/canonical/intervention-geometry";
export type { CanonicalInterventionGeometryV3 } from "@/packages/canonical/intervention-geometry";

function normalizeCanonicalV3(canonical: CanonicalInterventionGeometryV3) {
  return {
    ...canonical,
    roofs: Array.isArray(canonical.roofs)
      ? canonical.roofs.map((roof) => ({
          id: roof.id,
          ownerId: roof.ownerId,
          status: roof.status,
          ownerGeometryKey: roof.ownerGeometryKey,
          junctionMode: (roof as typeof roof & { junctionMode?: "TILED" | "PLANE_ENVELOPE" }).junctionMode ?? "TILED",
          zones: roof.zones
        }))
      : canonical.roofs
  };
}

export function interventionGeometryHash(candidateOrCanonical: CandidateRecord | CanonicalInterventionGeometryV3) {
  const canonical = "schemaVersion" in candidateOrCanonical && candidateOrCanonical.schemaVersion === CANONICAL_INTERVENTION_GEOMETRY_SCHEMA
    ? normalizeCanonicalV3(candidateOrCanonical as CanonicalInterventionGeometryV3)
    : canonicalizeInterventionGeometry(candidateOrCanonical as CandidateRecord);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
