import { NextResponse } from "next/server";
import { distance, pointInPolygon, Point } from "@/packages/geometry";
import { solveFamilies } from "@/packages/optimizer";
import { PONDY_BUILDABLE, pondyFamilies, pondyProblem } from "@/packages/pondy";
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

const BENCHMARK_DRIVE_WIDTH_FT = 12;
const SAMPLE_STEP_FT = 2;

function interpolate(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Early ranking metric, not a civil paving takeoff. It samples each drive centerline
 * in world-space feet and estimates how much of its 12 ft benchmark corridor runs
 * through otherwise-buildable residential envelope. The value is intentionally
 * reported as an estimate so a ranking preference never masquerades as survey truth.
 */
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

  const estimatedTotalPavementSqFt = totalCenterlineFt * BENCHMARK_DRIVE_WIDTH_FT;
  const estimatedBuildablePavementSqFt = buildableCenterlineFt * BENCHMARK_DRIVE_WIDTH_FT;
  const buildableSharePct = totalCenterlineFt > 0 ? (buildableCenterlineFt / totalCenterlineFt) * 100 : 0;

  return {
    benchmarkDriveWidthFt: BENCHMARK_DRIVE_WIDTH_FT,
    totalCenterlineFt,
    buildableCenterlineFt,
    estimatedTotalPavementSqFt,
    estimatedBuildablePavementSqFt,
    buildableSharePct
  };
}

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    maxEvaluations: 1200,
    diversePerFamily: 6,
    repairNearPasses: true,
    repairMaxStates: 900,
    repairMaxActions: 3,
    minimumPreferredClearanceFt: 1
  });

  const evaluated = solved.map((item) => {
    const program = evaluateProgram(item.candidate, PROGRAM);
    const pavement = pavementEfficiency(item.candidate);
    const physicalPass = item.evaluation.pass;
    const combinedPass = physicalPass && program.pass;

    // Hard gates dominate. Site-efficiency penalties only rank survivors and never
    // manufacture a PASS. Buildable-envelope pavement carries the strongest weight.
    const physicalPenalty = Math.min(item.objective / 1000, 100);
    const buildablePavementPenalty = Math.min(pavement.estimatedBuildablePavementSqFt / 45, 35);
    const totalPavementPenalty = Math.min(pavement.estimatedTotalPavementSqFt / 220, 12);
    const combinedScore =
      (physicalPass ? 100 : 0) +
      program.qualityScore -
      physicalPenalty -
      buildablePavementPenalty -
      totalPavementPenalty;

    return {
      id: item.candidate.id,
      family: item.candidate.family,
      combinedPass,
      physicalPass,
      programPass: program.pass,
      combinedScore,
      physicalObjective: item.objective,
      scoring: {
        physicalPenalty,
        buildablePavementPenalty,
        totalPavementPenalty
      },
      pavement,
      repaired: item.repaired,
      repairActions: item.repairActions,
      minimumClearanceFt: item.evaluation.minimumClearanceFt,
      physicalIssues: item.evaluation.issues.slice(0, 8),
      program,
      placements: item.candidate.placements,
      drives: item.candidate.drives,
      variables: item.variables,
      metadata: item.candidate.metadata ?? {}
    };
  }).sort((a, b) => Number(b.combinedPass) - Number(a.combinedPass) || b.combinedScore - a.combinedScore);

  const shortlist = [] as typeof evaluated;
  const seenFamilies = new Set<string>();
  for (const result of evaluated) {
    if (!result.combinedPass || seenFamilies.has(result.family)) continue;
    shortlist.push(result);
    seenFamilies.add(result.family);
    if (shortlist.length >= 5) break;
  }

  return NextResponse.json({
    project: "pondy-lot2",
    scenario: "baseline-no-alley",
    solver: "lotscope-rapid-v0.4",
    scoringVersion: "pondy-site-efficiency-v1",
    elapsedMs: Date.now() - started,
    families: pondyFamilies.map((family) => family.id),
    benchmarkControl: R51E_HISTORICAL_CONTROL,
    evaluatedCount: evaluated.length,
    physicalPassCount: evaluated.filter((item) => item.physicalPass).length,
    programPassCount: evaluated.filter((item) => item.programPass).length,
    combinedPassCount: evaluated.filter((item) => item.combinedPass).length,
    shortlist,
    results: evaluated
  });
}
