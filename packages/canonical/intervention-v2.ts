import { createHash } from "node:crypto";
import type { CandidateRecord } from "@/packages/candidates";
import {
  CANONICAL_INTERVENTION_GEOMETRY_SCHEMA,
  canonicalizeInterventionGeometry,
  type CanonicalInterventionGeometryV2
} from "@/packages/canonical/intervention-geometry";

export { CANONICAL_INTERVENTION_GEOMETRY_SCHEMA, canonicalizeInterventionGeometry } from "@/packages/canonical/intervention-geometry";
export type { CanonicalInterventionGeometryV2 } from "@/packages/canonical/intervention-geometry";

export function interventionGeometryHash(candidateOrCanonical: CandidateRecord | CanonicalInterventionGeometryV2) {
  const canonical = "schemaVersion" in candidateOrCanonical && candidateOrCanonical.schemaVersion === CANONICAL_INTERVENTION_GEOMETRY_SCHEMA
    ? candidateOrCanonical as CanonicalInterventionGeometryV2
    : canonicalizeInterventionGeometry(candidateOrCanonical as CandidateRecord);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
