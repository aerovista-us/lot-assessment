import { NextResponse } from "next/server";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem } from "@/packages/pondy";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    maxEvaluations: 500,
    diversePerFamily: 3,
    repairNearPasses: true,
    repairMaxStates: 500,
    repairMaxActions: 2,
    minimumPreferredClearanceFt: 1
  });

  const results = solved.map((item) => ({
    id: item.candidate.id,
    family: item.candidate.family,
    pass: item.evaluation.pass,
    objective: item.objective,
    repaired: item.repaired,
    repairActions: item.repairActions,
    minimumClearanceFt: item.evaluation.minimumClearanceFt,
    issues: item.evaluation.issues.slice(0, 8),
    placements: item.candidate.placements,
    drives: item.candidate.drives,
    variables: item.variables,
    metadata: item.candidate.metadata ?? {}
  }));

  return NextResponse.json({
    project: "pondy-lot2",
    solver: "lotscope-placement-v0.2",
    elapsedMs: Date.now() - started,
    families: pondyFamilies.map((family) => family.id),
    count: results.length,
    passCount: results.filter((item) => item.pass).length,
    results
  });
}
