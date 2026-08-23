import { NextResponse } from "next/server";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem } from "@/packages/pondy";
import { evaluateProgram } from "@/packages/program";

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
    const physicalPass = item.evaluation.pass;
    const combinedPass = physicalPass && program.pass;
    const combinedScore = (physicalPass ? 100 : 0) + program.qualityScore - Math.min(item.objective / 1000, 100);
    return {
      id: item.candidate.id,
      family: item.candidate.family,
      combinedPass,
      physicalPass,
      programPass: program.pass,
      combinedScore,
      physicalObjective: item.objective,
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
    solver: "lotscope-rapid-v0.3",
    elapsedMs: Date.now() - started,
    families: pondyFamilies.map((family) => family.id),
    evaluatedCount: evaluated.length,
    physicalPassCount: evaluated.filter((item) => item.physicalPass).length,
    programPassCount: evaluated.filter((item) => item.programPass).length,
    combinedPassCount: evaluated.filter((item) => item.combinedPass).length,
    shortlist,
    results: evaluated
  });
}
