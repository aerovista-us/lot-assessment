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
  homeComponentCount: number;
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

function homeComponents(candidate: PlacementCandidate, unitId: string) {
  const primaryId = `HOME-${unitId}`;
  const primary = candidate.placements.find((p) => p.id === primaryId && p.kind === "home");
  if (!primary) return { primary: undefined, homes: [] as AxisAlignedPlacement[] };
  const homes = candidate.placements.filter((p) =>
    p.kind === "home" &&
    p.integrationGroupId === primary.integrationGroupId &&
    (p.id === primaryId || p.id.startsWith(`${primaryId}-`))
  );
  return { primary, homes };
}

/**
 * Fast program feasibility gate. This is a pre-plan filter, not proof of a finished
 * floor plan. Run 08 supports declared compound/L-shaped home massing as multiple
 * home rectangles in the same unit integration group. Capacity is the union-by-design
 * sum of non-overlapping components; minimum plate sanity is still anchored to the
 * primary HOME-X rectangle so a small intentional wing is not mistaken for a bad room.
 */
export function evaluateProgram(candidate: PlacementCandidate, spec: ProgramSpec): ProgramEvaluation {
  const minW = spec.minimumPlateWidthFt ?? 22;
  const minD = spec.minimumPlateDepthFt ?? 22;
  const maxAspect = spec.maximumPlateAspectRatio ?? 2.2;
  const minGarageArea = spec.minimumGarageAreaSqFt ?? 400;
  const minGarageShortSide = spec.minimumGarageShortSideFt ?? 19;

  const unitResults: UnitProgramResult[] = spec.units.map((unitId) => {
    const { primary, homes } = homeComponents(candidate, unitId);
    const intended = numericMetadata(candidate, `intendedLiving${unitId}`);
    const reasons: string[] = [];
    const penalties: string[] = [];

    if (!primary || !homes.length) {
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
        homeComponentCount: 0,
        reasons: [`HOME-${unitId} is missing`],
        penalties
      };
    }

    const garage = candidate.placements.find((p) =>
      p.kind === "garage" && p.integrationGroupId && p.integrationGroupId === primary.integrationGroupId
    );

    const minX = Math.min(...homes.map((home) => home.x));
    const minY = Math.min(...homes.map((home) => home.y));
    const maxX = Math.max(...homes.map((home) => home.x + home.widthFt));
    const maxY = Math.max(...homes.map((home) => home.y + home.depthFt));
    const boundingWidth = maxX - minX;
    const boundingDepth = maxY - minY;
    const plateArea = homes.reduce((sum, home) => sum + home.widthFt * home.depthFt, 0);
    const grossCapacity = plateArea * spec.stories;
    const garageArea = garage ? garage.widthFt * garage.depthFt : null;
    const garageShortSide = garage ? Math.min(garage.widthFt, garage.depthFt) : null;
    const garageOverlap = garage ? homes.reduce((sum, home) => sum + overlapArea(home, garage), 0) : 0;
    const netLivingCapacity = grossCapacity - garageOverlap;
    const primaryShortSide = Math.min(primary.widthFt, primary.depthFt);
    const primaryLongSide = Math.max(primary.widthFt, primary.depthFt);
    const primaryAspect = primaryLongSide / Math.max(primaryShortSide, 0.01);

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

    if (primary.widthFt < minW || primary.depthFt < minD) {
      pass = false;
      reasons.push(`primary plate ${primary.widthFt}×${primary.depthFt} ft below minimum ${minW}×${minD} ft`);
    }
    if (primaryAspect > maxAspect) {
      pass = false;
      reasons.push(`primary plate aspect ratio ${primaryAspect.toFixed(2)} exceeds ${maxAspect.toFixed(2)}`);
    }
    if (homes.length > 1) reasons.push(`compound home uses ${homes.length} declared components with ${plateArea.toFixed(0)} SF floor plate`);

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

    if (primaryShortSide < 26) penalties.push(`tight ${primaryShortSide.toFixed(0)} ft primary short dimension constrains room packing`);
    if (primaryAspect > 1.6) penalties.push(`elongated primary plate ${primaryAspect.toFixed(2)} may produce corridor-heavy planning`);
    if (intended != null && netLivingCapacity > intended * 1.35) penalties.push("large net-capacity surplus may indicate inefficient residual area");
    if (intended != null && netLivingCapacity >= intended && netLivingCapacity < intended * 1.08) penalties.push("living-capacity margin under 8% leaves little room for stairs, walls and mechanical inefficiency");

    return {
      unitId,
      pass,
      intendedLivingSqFt: intended,
      plateWidthFt: boundingWidth,
      plateDepthFt: boundingDepth,
      plateAreaSqFt: plateArea,
      grossTwoStoryCapacitySqFt: grossCapacity,
      garageAreaSqFt: garageArea,
      garageShortSideFt: garageShortSide,
      integratedGarageOverlapSqFt: garageOverlap,
      netLivingCapacitySqFt: netLivingCapacity,
      homeComponentCount: homes.length,
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
