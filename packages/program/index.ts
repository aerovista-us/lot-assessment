import { PlacementCandidate } from "@/packages/placement";

export type ProgramSpec = {
  units: string[];
  livingRangeSqFt: [number, number];
  maxUnitDifferenceSqFt: number;
  stories: number;
  minimumPlateWidthFt?: number;
  minimumPlateDepthFt?: number;
  maximumPlateAspectRatio?: number;
  garageAreaSqFt?: number;
};

export type UnitProgramResult = {
  unitId: string;
  pass: boolean;
  intendedLivingSqFt: number | null;
  plateWidthFt: number | null;
  plateDepthFt: number | null;
  plateAreaSqFt: number | null;
  grossTwoStoryCapacitySqFt: number | null;
  reasons: string[];
  penalties: string[];
};

export type ProgramEvaluation = {
  pass: boolean;
  unitResults: UnitProgramResult[];
  unitDifferenceSqFt: number | null;
  qualityScore: number;
  reasons: string[];
};

function numericMetadata(candidate: PlacementCandidate, key: string): number | null {
  const raw = candidate.metadata?.[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Fast program feasibility gate. This is intentionally a pre-plan filter, not a
 * claim that a finished floor plan exists. It rejects physically legal candidates
 * whose home plates or target areas are obviously incompatible with the project
 * program, before detailed room packing is attempted.
 */
export function evaluateProgram(candidate: PlacementCandidate, spec: ProgramSpec): ProgramEvaluation {
  const minW = spec.minimumPlateWidthFt ?? 22;
  const minD = spec.minimumPlateDepthFt ?? 22;
  const maxAspect = spec.maximumPlateAspectRatio ?? 2.2;
  const unitResults: UnitProgramResult[] = spec.units.map((unitId) => {
    const home = candidate.placements.find((p) => p.id === `HOME-${unitId}`);
    const intended = numericMetadata(candidate, `intendedLiving${unitId}`);
    const reasons: string[] = [];
    const penalties: string[] = [];

    if (!home) {
      return {
        unitId,
        pass: false,
        intendedLivingSqFt: intended,
        plateWidthFt: null,
        plateDepthFt: null,
        plateAreaSqFt: null,
        grossTwoStoryCapacitySqFt: null,
        reasons: [`HOME-${unitId} is missing`],
        penalties
      };
    }

    const plateArea = home.widthFt * home.depthFt;
    const grossCapacity = plateArea * spec.stories;
    const shortSide = Math.min(home.widthFt, home.depthFt);
    const longSide = Math.max(home.widthFt, home.depthFt);
    const aspect = longSide / Math.max(shortSide, 0.01);

    let pass = true;
    if (intended == null) {
      pass = false;
      reasons.push("intended living area is not declared");
    } else if (intended < spec.livingRangeSqFt[0] || intended > spec.livingRangeSqFt[1]) {
      pass = false;
      reasons.push(`living target ${intended} SF outside ${spec.livingRangeSqFt[0]}–${spec.livingRangeSqFt[1]} SF`);
    } else {
      reasons.push(`living target ${intended} SF is inside program range`);
    }

    if (home.widthFt < minW || home.depthFt < minD) {
      pass = false;
      reasons.push(`plate ${home.widthFt}×${home.depthFt} ft below minimum ${minW}×${minD} ft`);
    }
    if (aspect > maxAspect) {
      pass = false;
      reasons.push(`plate aspect ratio ${aspect.toFixed(2)} exceeds ${maxAspect.toFixed(2)}`);
    }
    if (intended != null && grossCapacity < intended) {
      pass = false;
      reasons.push(`gross two-story plate capacity ${grossCapacity} SF is below living target`);
    }

    if (shortSide < 26) penalties.push(`tight ${shortSide.toFixed(0)} ft short dimension constrains room packing`);
    if (aspect > 1.6) penalties.push(`elongated plate ${aspect.toFixed(2)} may produce corridor-heavy planning`);
    if (intended != null && grossCapacity > intended * 1.35) penalties.push("large gross-to-living surplus may indicate inefficient residual area");

    return {
      unitId,
      pass,
      intendedLivingSqFt: intended,
      plateWidthFt: home.widthFt,
      plateDepthFt: home.depthFt,
      plateAreaSqFt: plateArea,
      grossTwoStoryCapacitySqFt: grossCapacity,
      reasons,
      penalties
    };
  });

  const intendedAreas = unitResults
    .map((u) => u.intendedLivingSqFt)
    .filter((value): value is number => value != null);
  const difference = intendedAreas.length === spec.units.length
    ? Math.max(...intendedAreas) - Math.min(...intendedAreas)
    : null;

  const reasons: string[] = [];
  let pass = unitResults.every((unit) => unit.pass);
  if (difference == null) {
    pass = false;
    reasons.push("unit area difference cannot be evaluated");
  } else if (difference > spec.maxUnitDifferenceSqFt) {
    pass = false;
    reasons.push(`unit area difference ${difference} SF exceeds ${spec.maxUnitDifferenceSqFt} SF`);
  } else {
    reasons.push(`unit area difference ${difference} SF passes ≤${spec.maxUnitDifferenceSqFt} SF gate`);
  }

  const penaltyCount = unitResults.reduce((sum, unit) => sum + unit.penalties.length, 0);
  const qualityScore = Math.max(0, Math.min(100, 100 - penaltyCount * 8 - (pass ? 0 : 35)));

  return { pass, unitResults, unitDifferenceSqFt: difference, qualityScore, reasons };
}
