import { createHash } from "node:crypto";
import type { CandidateRecord } from "@/packages/candidates";
import {
  CANONICAL_INTERVENTION_GEOMETRY_SCHEMA,
  canonicalizeInterventionGeometry,
  type CanonicalInterventionGeometryV3
} from "@/packages/canonical/intervention-geometry";

export { CANONICAL_INTERVENTION_GEOMETRY_SCHEMA, canonicalizeInterventionGeometry } from "@/packages/canonical/intervention-geometry";
export type { CanonicalInterventionGeometryV3 } from "@/packages/canonical/intervention-geometry";

export function interventionGeometryHash(candidateOrCanonical: CandidateRecord | CanonicalInterventionGeometryV3) {
  const canonical = "schemaVersion" in candidateOrCanonical && candidateOrCanonical.schemaVersion === CANONICAL_INTERVENTION_GEOMETRY_SCHEMA
    ? candidateOrCanonical as CanonicalInterventionGeometryV3
    : canonicalizeInterventionGeometry(candidateOrCanonical as CandidateRecord);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
