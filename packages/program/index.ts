import { AxisAlignedPlacement, PlacementCandidate } from "@/packages/placement";

export type ProgramSpec = {
  units: string[];
  livingRangeSqFt: [number, number];
  maxUnitDifferenceSqFt: number;
  stories: number;
  minimumPlateWidthFt?: number;
  minimumPlateDepthFt?: number;
  maximumPlateAspectRatio?: number;
  /** Legacy nominal garage area; retained for callers but not treated as a 22x22 law. */
  garageAreaSqFt?: number;
  minimumGarageAreaSqFt?: number;
  minimumGarageShortSideFt?: number;
};

export type UnitProgramResult = {
  unitId: string;
  pass: boolean;
  intendedLivingSqFt: number | null;
  plateWidthFt: number | null;
  plateDepthFt: number | null;
  plateAreaSqFt: number | null;
  grossTwoStoryCapacitySqFt: number | null;
  garageAreaSqFt: number | null;
  garageShortSideFt: number | null;
  integratedGarageOverlapSqFt: number | null;
  netLivingCapacitySqFt: number | null;
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

function overlapArea(a: AxisAlignedPlacement, b: AxisAlignedPlacement): number {
  const width = Math.max(0, Math.min(a.x + a.widthFt, b.x + b.widthFt) - Math.max(a.x, b.x));
  const depth = Math.max(0, Math.min(a.y + a.depthFt, b.y + b.depthFt) - Math.max(a.y, b.y));
  return width * depth;
}

/**
 * Fast program feasibility gate. This is a pre-plan filter, not proof of a finished
 * floor plan. It checks credible residential plate capacity and a deliberately modest
 * garage sanity gate without turning 22x22 into a false universal requirement.
 */
export function evaluateProgram(candidate: PlacementCandidate, spec: ProgramSpec): ProgramEvaluation {
  const minW = spec.minimumPlateWidthFt ?? 22;
  const minD = spec.minimumPlateDepthFt ?? 22;
  const maxAspect = spec.maximumPlateAspectRatio ?? 2.2;
  const minGarageArea = spec.minimumGarageAreaSqFt ?? 400;
  const minGarageShortSide = spec.minimumGarageShortSideFt ?? 19;

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
        garageAreaSqFt: null,
        garageShortSideFt: null,
        integratedGarageOverlapSqFt: null,
        netLivingCapacitySqFt: null,
        reasons: [`HOME-${unitId} is missing`],
        penalties
      };
    }

    const garage = candidate.placements.find((p) =>
      p.kind === "garage" && p.integrationGroupId && p.integrationGroupId === home.integrationGroupId
    );
    const plateArea = home.widthFt * home.depthFt;
    const grossCapacity = plateArea * spec.stories;
    const garageArea = garage ? garage.widthFt * garage.depthFt : null;
    const garageShortSide = garage ? Math.min(garage.widthFt, garage.depthFt) : null;
    const garageOverlap = garage ? overlapArea(home, garage) : 0;
    const netLivingCapacity = grossCapacity - garageOverlap;
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

    if (!garage) {
      pass = false;
      reasons.push("two-car garage geometry is missing");
    } else {
      if ((garageArea ?? 0) < minGarageArea) {
        pass = false;
        reasons.push(`garage area ${garageArea?.toFixed(0)} SF below ${minGarageArea} SF two-car sanity gate`);
      } else {
        reasons.push(`garage area ${garageArea?.toFixed(0)} SF passes ≥${minGarageArea} SF sanity gate`);
      }
      if ((garageShortSide ?? 0) < minGarageShortSide) {
        pass = false;
        reasons.push(`garage short side ${garageShortSide?.toFixed(0)} ft below ${minGarageShortSide} ft sanity gate`);
      }
    }

    if (garageOverlap > 0) reasons.push(`integrated garage consumes ${garageOverlap.toFixed(0)} SF of ground-floor plate capacity`);
    if (intended != null && netLivingCapacity < intended) {
      pass = false;
      reasons.push(`net conditioned capacity ${netLivingCapacity.toFixed(0)} SF is below ${intended} SF living target`);
    } else if (intended != null) {
      reasons.push(`net conditioned capacity ${netLivingCapacity.toFixed(0)} SF covers living target`);
    }

    if (shortSide < 26) penalties.push(`tight ${shortSide.toFixed(0)} ft short dimension constrains room packing`);
    if (aspect > 1.6) penalties.push(`elongated plate ${aspect.toFixed(2)} may produce corridor-heavy planning`);
    if (intended != null && netLivingCapacity > intended * 1.35) penalties.push("large net-capacity surplus may indicate inefficient residual area");
    if (intended != null && netLivingCapacity >= intended && netLivingCapacity < intended * 1.08) penalties.push("living-capacity margin under 8% leaves little room for stairs, walls and mechanical inefficiency");

    return {
      unitId,
      pass,
      intendedLivingSqFt: intended,
      plateWidthFt: home.widthFt,
      plateDepthFt: home.depthFt,
      plateAreaSqFt: plateArea,
      grossTwoStoryCapacitySqFt: grossCapacity,
      garageAreaSqFt: garageArea,
      garageShortSideFt: garageShortSide,
      integratedGarageOverlapSqFt: garageOverlap,
      netLivingCapacitySqFt: netLivingCapacity,
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
