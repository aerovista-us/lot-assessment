import type { LotAssessmentInput } from "@/lib/assessment";

export type FactState = "CONFIRMED" | "USER_SUPPLIED" | "ASSUMED" | "UNKNOWN";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type ConfidenceMap = Record<keyof LotAssessmentInput, FactState>;

const weights: Record<FactState, number> = {
  CONFIRMED: 1,
  USER_SUPPLIED: 0.75,
  ASSUMED: 0.4,
  UNKNOWN: 0
};

export const initialConfidence: ConfidenceMap = {
  lotWidthFt: "USER_SUPPLIED",
  lotDepthFt: "USER_SUPPLIED",
  frontSetbackFt: "ASSUMED",
  rearSetbackFt: "ASSUMED",
  leftSetbackFt: "ASSUMED",
  rightSetbackFt: "ASSUMED",
  maxLotCoveragePct: "ASSUMED",
  units: "USER_SUPPLIED",
  livingAreaPerUnitSqFt: "USER_SUPPLIED",
  stories: "USER_SUPPLIED",
  garageSpacesPerUnit: "USER_SUPPLIED",
  garageIntegrated: "USER_SUPPLIED",
  drivewayWidthFt: "USER_SUPPLIED",
  minimumAccessWidthFt: "ASSUMED"
};

export function assessInformationConfidence(states: ConfidenceMap) {
  const entries = Object.entries(states) as Array<[keyof LotAssessmentInput, FactState]>;
  const regulatoryKeys = new Set<keyof LotAssessmentInput>([
    "frontSetbackFt",
    "rearSetbackFt",
    "leftSetbackFt",
    "rightSetbackFt",
    "maxLotCoveragePct",
    "minimumAccessWidthFt"
  ]);

  let earned = 0;
  let possible = 0;
  for (const [key, state] of entries) {
    const importance = regulatoryKeys.has(key) ? 1.5 : 1;
    earned += weights[state] * importance;
    possible += importance;
  }

  const score = possible ? Math.round((earned / possible) * 100) : 0;
  const level: ConfidenceLevel = score >= 80 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";
  const verify = entries
    .filter(([, state]) => state === "ASSUMED" || state === "UNKNOWN")
    .map(([key]) => key);

  return { score, level, verify };
}

export function stateLabel(state: FactState) {
  return state.replace("_", " ");
}
