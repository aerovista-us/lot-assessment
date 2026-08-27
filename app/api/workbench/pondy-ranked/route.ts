import { NextResponse } from "next/server";
import { filletPath, FULL_SIZE_SUV, vehiclePolygon } from "@/packages/circulation";
import { distance, pointInPolygon, Point } from "@/packages/geometry";
import { solveFamilies } from "@/packages/optimizer";
import { PONDY_BUILDABLE, PONDY_SURVEY, pondyFamilies, pondyProblem } from "@/packages/pondy";
import { diversityFamilies } from "@/packages/pondy/diversity";
import { R51E_HISTORICAL_CONTROL } from "@/packages/pondy/control";
import { evaluateProgram } from "@/packages/program";
import type { PlacementCandidate } from "@/packages/placement";

export const dynamic = "force-dynamic";

const PROGRAM = {
  units: ["A", "B"],
  livingRangeSqFt: [1600, 1900] as [number, number],
  maxUnitDifferenceSqFt: 120,
  stories: 2,
  minimumPlateWidthFt: 22,
  minimumPlateDepthFt: 22,
  maximumPlateAspectRatio: 2.2,
  garageAreaSqFt: 484
};

const PREFERRED_LIVING_SQFT = 1800;
const PROMOTION_CAPACITY_MARGIN = 1.08;
const PROMOTION_TARGET_CAPACITY_SQFT = PREFERRED_LIVING_SQFT * PROMOTION_CAPACITY_MARGIN;
const PROMOTION_CLEARANCE_FT = 1;
const PENNSYLVANIA_SEGMENT_INDEX = 1;
const BENCHMARK_DRIVE_WIDTH_FT = 12;
const SAMPLE_STEP_FT = 2;

function interpolate(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pointSegmentDistance(point: Point, a: Point, b: Point) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const denom = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby) / denom));
  const qx = a[0] + abx * t;
  const qy = a[1] + aby * t;
  return Math.hypot(point[0] - qx, point[1] - qy);
}

function nonAccessBoundaryClearance(candidate: PlacementCandidate) {
  let minimum = Infinity;
  for (const drive of candidate.drives) {
    const { poses } = filletPath(drive.points, FULL_SIZE_SUV.minRearAxleRadiusFt);
    for (const pose of poses) {
      const body = vehiclePolygon(FULL_SIZE_SUV, pose.x, pose.y, pose.headingRad);
      if (!body.every((corner) => pointInPolygon(corner, PONDY_SURVEY, 0.2))) continue;
      for (const corner of body) {
        for (let i = 0; i < PONDY_SURVEY.length; i += 1) {
          if (i === PENNSYLVANIA_SEGMENT_INDEX) continue;
          minimum = Math.min(minimum, pointSegmentDistance(corner, PONDY_SURVEY[i], PONDY_SURVEY[(i + 1) % PONDY_SURVEY.length]));
        }
      }
    }
  }
  return Number.isFinite(minimum) ? minimum : null;
}

function pavementEfficiency(candidate: PlacementCandidate) {
  let totalCenterlineFt = 0;
  let buildableCenterlineFt = 0;
  for (const drive of candidate.drives) {
    for (let i = 0; i < drive.points.length - 1; i += 1) {
      const a = drive.points[i];
      const b = drive.points[i + 1];
      const segmentFt = distance(a, b);
      totalCenterlineFt += segmentFt;
      const steps = Math.max(1, Math.ceil(segmentFt / SAMPLE_STEP_FT));
      const sliceFt = segmentFt / steps;
      for (let step = 0; step < steps; step += 1) {
        const midpoint = interpolate(a, b, (step + 0.5) / steps);
        if (pointInPolygon(midpoint, PONDY_BUILDABLE)) buildableCenterlineFt += sliceFt;
      }
    }
  }
  return {
    benchmarkDriveWidthFt: BENCHMARK_DRIVE_WIDTH_FT,
    totalCenterlineFt,
    buildableCenterlineFt,
    estimatedTotalPavementSqFt: totalCenterlineFt * BENCHMARK_DRIVE_WIDTH_FT,
    estimatedBuildablePavementSqFt: buildableCenterlineFt * BENCHMARK_DRIVE_WIDTH_FT,
    buildableSharePct: totalCenterlineFt > 0 ? (buildableCenterlineFt / totalCenterlineFt) * 100 : 0
  };
}

function preferredLivingPenalty(program: ReturnType<typeof evaluateProgram>) {
  const intended = program.unitResults.map((unit) => unit.intendedLivingSqFt).filter((value): value is number => value != null);
  if (!intended.length) return 20;
  return Math.min(intended.reduce((sum, value) => sum + Math.abs(value - PREFERRED_LIVING_SQFT), 0) / 25, 20);
}

function targetCapacityPenalty(program: ReturnType<typeof evaluateProgram>) {
  const deficit = program.unitResults.reduce((sum, unit) => sum + Math.max(0, PROMOTION_TARGET_CAPACITY_SQFT - (unit.netLivingCapacitySqFt ?? 0)), 0);
  return Math.min(deficit / 25, 24);
}

function targetCapacityReady(program: ReturnType<typeof evaluateProgram>) {
  return program.unitResults.every((unit) => (unit.netLivingCapacitySqFt ?? 0) >= PROMOTION_TARGET_CAPACITY_SQFT);
}

/** Collapse the already-proven Side Spine/Staggered/E2/G1 variants into one concept slot. */
function conceptGroup(family: string, metadata: Record<string, string | number | boolean>) {
  if (["side-spine", "staggered-spine", "e2-r", "g1-r"].includes(family)) return "edge-spine-front-rear";
  return String(metadata.designIntent ?? metadata.topology ?? family);
}

const allFamilies = [...pondyFamilies, ...diversityFamilies];
const searchFamilies = allFamilies.map((family) => ({
  ...family,
  variables: family.variables.map((variable) => {
    if (variable.id === "rearW") return { ...variable, max: Math.max(variable.max, 37) };
    if (variable.id === "frontX") return { ...variable, min: Math.min(variable.min, 77) };
    return variable;
  })
}));

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, searchFamilies, {
    maxEvaluations: 900,
    diversePerFamily: 10,
    repairNearPasses: true,
    repairMaxStates: 360,
    repairMaxActions: 3,
    minimumPreferredClearanceFt: PROMOTION_CLEARANCE_FT
  });

  const evaluated = solved.map((item) => {
    const program = evaluateProgram(item.candidate, PROGRAM);
    const pavement = pavementEfficiency(item.candidate);
    const physicalPass = item.evaluation.pass;
    const combinedPass = physicalPass && program.pass;
    const promotionBoundaryClearanceFt = nonAccessBoundaryClearance(item.candidate);
    const clearanceReady = (promotionBoundaryClearanceFt ?? 0) >= PROMOTION_CLEARANCE_FT;
    const capacityReady = targetCapacityReady(program);
    const promotionReady = combinedPass && clearanceReady && capacityReady;
    const physicalPenalty = Math.min(item.objective / 1000, 100);
    const buildablePavementPenalty = Math.min(pavement.estimatedBuildablePavementSqFt / 45, 35);
    const totalPavementPenalty = Math.min(pavement.estimatedTotalPavementSqFt / 220, 12);
    const livingTargetPenalty = preferredLivingPenalty(program);
    const capacityPenalty = targetCapacityPenalty(program);
    const combinedScore = (physicalPass ? 100 : 0) + program.qualityScore - physicalPenalty - buildablePavementPenalty - totalPavementPenalty - livingTargetPenalty - capacityPenalty;
    const metadata = item.candidate.metadata ?? {};

    return {
      id: item.candidate.id,
      family: item.candidate.family,
      conceptGroup: conceptGroup(item.candidate.family, metadata),
      combinedPass,
      promotionReady,
      promotionChecks: {
        clearanceReady,
        capacityReady,
        minimumClearanceFt: PROMOTION_CLEARANCE_FT,
        targetLivingSqFt: PREFERRED_LIVING_SQFT,
        targetCapacityMargin: PROMOTION_CAPACITY_MARGIN,
        requiredNetLivingCapacitySqFt: PROMOTION_TARGET_CAPACITY_SQFT
      },
      physicalPass,
      programPass: program.pass,
      combinedScore,
      physicalObjective: item.objective,
      scoring: { physicalPenalty, buildablePavementPenalty, totalPavementPenalty, livingTargetPenalty, capacityPenalty },
      pavement,
      repaired: item.repaired,
      repairActions: item.repairActions,
      minimumClearanceFt: item.evaluation.minimumClearanceFt,
      promotionBoundaryClearanceFt,
      physicalIssues: item.evaluation.issues.slice(0, 8),
      program,
      placements: item.candidate.placements,
      drives: item.candidate.drives,
      variables: item.variables,
      metadata
    };
  }).sort((a, b) => Number(b.promotionReady) - Number(a.promotionReady) || Number(b.combinedPass) - Number(a.combinedPass) || b.combinedScore - a.combinedScore);

  const shortlist = [] as typeof evaluated;
  const seenConcepts = new Set<string>();
  for (const result of evaluated) {
    if (!result.promotionReady || seenConcepts.has(result.conceptGroup)) continue;
    shortlist.push(result);
    seenConcepts.add(result.conceptGroup);
    if (shortlist.length >= 5) break;
  }

  return NextResponse.json({
    project: "pondy-lot2",
    scenario: "baseline-no-alley",
    solver: "lotscope-diversity-v0.8",
    searchMode: "material-topology-diversity-search",
    scoringVersion: "pondy-site-efficiency-v5",
    preferredLivingSqFt: PREFERRED_LIVING_SQFT,
    promotionClearanceFt: PROMOTION_CLEARANCE_FT,
    promotionTargetCapacitySqFt: PROMOTION_TARGET_CAPACITY_SQFT,
    elapsedMs: Date.now() - started,
    families: searchFamilies.map((family) => family.id),
    searchAdjustments: [
      "collapse Side Spine/Staggered/E2/G1 near-duplicates into one concept",
      "add four materially different garage/drive topology families",
      "require promotion-ready status before a concept can occupy a shortlist slot"
    ],
    benchmarkControl: R51E_HISTORICAL_CONTROL,
    evaluatedCount: evaluated.length,
    physicalPassCount: evaluated.filter((item) => item.physicalPass).length,
    programPassCount: evaluated.filter((item) => item.programPass).length,
    combinedPassCount: evaluated.filter((item) => item.combinedPass).length,
    promotionReadyCount: evaluated.filter((item) => item.promotionReady).length,
    distinctPromotionReadyCount: shortlist.length,
    shortlist,
    results: evaluated
  });
}
