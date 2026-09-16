import { PONDY_BUILDABLE, PONDY_SURVEY } from "@/packages/pondy";
import { runPondyRankedSearch } from "@/packages/pondy-search";
import {
  triageRankedSearch,
  type CandidateTriageResult,
  type RankedSearchPayload
} from "@/packages/candidates/triage";

export const PONDY_TRIAGE_RULES_VERSION = "pondy-baseline-planning-2026-09";

export function triagePondySearch(payload: RankedSearchPayload, generatedAt?: string): CandidateTriageResult {
  return triageRankedSearch(payload, {
    projectId: "pondy-flats",
    lotId: "pondy-lot2",
    parcel: PONDY_SURVEY,
    principalEnvelope: PONDY_BUILDABLE,
    rulesVersion: PONDY_TRIAGE_RULES_VERSION,
    generatedAt
  });
}

export function runPondyTriage(generatedAt?: string) {
  return triagePondySearch(runPondyRankedSearch("triage"), generatedAt);
}
