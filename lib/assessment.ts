export type AssessmentStatus = "POSSIBLE" | "CONSTRAINED" | "LIKELY NOT FEASIBLE" | "NEEDS VERIFICATION";

export type LotAssessmentInput = {
  lotWidthFt: number;
  lotDepthFt: number;
  frontSetbackFt: number;
  rearSetbackFt: number;
  leftSetbackFt: number;
  rightSetbackFt: number;
  maxLotCoveragePct: number;
  units: number;
  livingAreaPerUnitSqFt: number;
  stories: number;
  garageSpacesPerUnit: number;
  garageIntegrated: boolean;
  drivewayWidthFt: number;
  minimumAccessWidthFt: number;
};

export type LotAssessmentResult = {
  status: AssessmentStatus;
  score: number;
  lotAreaSqFt: number;
  buildableWidthFt: number;
  buildableDepthFt: number;
  setbackEnvelopeSqFt: number;
  maxCoverageAreaSqFt: number;
  estimatedProjectFootprintSqFt: number;
  footprintCapacitySqFt: number;
  utilizationPct: number;
  reasons: string[];
  concerns: string[];
  nextChecks: string[];
};

function finitePositive(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function assessLot(input: LotAssessmentInput): LotAssessmentResult {
  const values = Object.entries(input).filter(([key]) => key !== "garageIntegrated");
  if (values.some(([, value]) => typeof value !== "number" || !finitePositive(value))) {
    return emptyVerification("One or more numeric inputs are missing or invalid.");
  }

  if (!input.lotWidthFt || !input.lotDepthFt || !input.units || !input.stories || !input.livingAreaPerUnitSqFt) {
    return emptyVerification("Lot dimensions and project size are required before a useful assessment can be made.");
  }

  const lotAreaSqFt = input.lotWidthFt * input.lotDepthFt;
  const buildableWidthFt = Math.max(0, input.lotWidthFt - input.leftSetbackFt - input.rightSetbackFt);
  const buildableDepthFt = Math.max(0, input.lotDepthFt - input.frontSetbackFt - input.rearSetbackFt);
  const setbackEnvelopeSqFt = buildableWidthFt * buildableDepthFt;
  const coverageFraction = Math.min(Math.max(input.maxLotCoveragePct / 100, 0), 1);
  const maxCoverageAreaSqFt = lotAreaSqFt * coverageFraction;

  const livingFootprintPerUnit = input.livingAreaPerUnitSqFt / Math.max(input.stories, 1);
  const garageFootprintPerUnit = input.garageSpacesPerUnit * 200;
  const footprintPerUnit = input.garageIntegrated
    ? Math.max(livingFootprintPerUnit, garageFootprintPerUnit)
    : livingFootprintPerUnit + garageFootprintPerUnit;
  const estimatedProjectFootprintSqFt = footprintPerUnit * input.units;

  const footprintCapacitySqFt = Math.max(0, Math.min(setbackEnvelopeSqFt, maxCoverageAreaSqFt || setbackEnvelopeSqFt));
  const utilizationPct = footprintCapacitySqFt > 0 ? (estimatedProjectFootprintSqFt / footprintCapacitySqFt) * 100 : 999;

  let score = 100;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const nextChecks: string[] = [
    "Confirm zoning district and allowed use/unit count with the governing jurisdiction.",
    "Confirm easements, utilities, fire access, drainage and any recorded plat restrictions.",
    "Verify parking and driveway geometry against the actual site plan, not just width totals."
  ];

  if (buildableWidthFt <= 0 || buildableDepthFt <= 0) {
    score -= 80;
    concerns.push("The entered setbacks leave no rectangular buildable envelope.");
  } else {
    reasons.push(`Setbacks leave an approximate ${round(buildableWidthFt)} ft × ${round(buildableDepthFt)} ft rectangular envelope.`);
  }

  if (estimatedProjectFootprintSqFt > footprintCapacitySqFt * 1.1) {
    score -= 55;
    concerns.push("Estimated building footprint exceeds the smaller of the setback envelope and lot-coverage capacity.");
  } else if (utilizationPct > 90) {
    score -= 30;
    concerns.push("The project consumes more than 90% of estimated footprint capacity, leaving little room for shape, circulation or site-specific constraints.");
  } else if (utilizationPct > 75) {
    score -= 15;
    concerns.push("The project uses a large share of the estimated footprint capacity and may be sensitive to layout details.");
  } else {
    reasons.push(`Estimated footprint uses about ${round(utilizationPct)}% of the calculated footprint capacity.`);
  }

  if (buildableWidthFt < 24) {
    score -= 25;
    concerns.push("Buildable width is under 24 ft, which can severely limit two-car garage and multi-unit layouts.");
  } else if (buildableWidthFt < 32) {
    score -= 12;
    concerns.push("Buildable width is tight; garage placement, stairs and side circulation may drive the design.");
  } else {
    reasons.push("Buildable width is not immediately disqualifying for a conventional residential layout.");
  }

  if (input.drivewayWidthFt < input.minimumAccessWidthFt) {
    score -= 30;
    concerns.push(`Entered driveway/access width (${round(input.drivewayWidthFt)} ft) is below the assumed minimum (${round(input.minimumAccessWidthFt)} ft).`);
  } else {
    reasons.push("Entered driveway width meets the assumed minimum access width.");
  }

  const totalGarageSpaces = input.garageSpacesPerUnit * input.units;
  if (totalGarageSpaces >= 4 && buildableWidthFt < 40) {
    score -= 12;
    concerns.push("Four or more enclosed parking spaces on a narrow envelope may create turning, door-width or tandem-layout pressure.");
    nextChecks.push("Test garage-door positions, backing movements and turning paths on a scaled site plan.");
  }

  if (input.units > 1) {
    nextChecks.push("Confirm whether unit count is allowed by-right, requires a duplex/multi-family designation, or depends on lot area/frontage per unit.");
  }

  nextChecks.push("Treat this as an early feasibility screen only; final dimensions must be checked against current adopted code and a survey/site plan.");

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  let status: AssessmentStatus = "POSSIBLE";
  if (buildableWidthFt <= 0 || buildableDepthFt <= 0 || estimatedProjectFootprintSqFt > footprintCapacitySqFt * 1.1) {
    status = "LIKELY NOT FEASIBLE";
  } else if (clampedScore < 72 || concerns.length >= 2) {
    status = "CONSTRAINED";
  }

  return {
    status,
    score: clampedScore,
    lotAreaSqFt,
    buildableWidthFt,
    buildableDepthFt,
    setbackEnvelopeSqFt,
    maxCoverageAreaSqFt,
    estimatedProjectFootprintSqFt,
    footprintCapacitySqFt,
    utilizationPct,
    reasons,
    concerns,
    nextChecks
  };
}

function emptyVerification(reason: string): LotAssessmentResult {
  return {
    status: "NEEDS VERIFICATION",
    score: 0,
    lotAreaSqFt: 0,
    buildableWidthFt: 0,
    buildableDepthFt: 0,
    setbackEnvelopeSqFt: 0,
    maxCoverageAreaSqFt: 0,
    estimatedProjectFootprintSqFt: 0,
    footprintCapacitySqFt: 0,
    utilizationPct: 0,
    reasons: [],
    concerns: [reason],
    nextChecks: ["Complete the missing lot/project facts before relying on the assessment."]
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
