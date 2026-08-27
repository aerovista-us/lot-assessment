import { NextResponse } from "next/server";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem } from "@/packages/pondy";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    // Deterministic sampler now spreads these states across each family's full grid.
    // Keep the first discovery pass deliberately coarse; refine only survivors.
    maxEvaluations: 180,
    diversePerFamily: 4,
    repairNearPasses: true,
    repairMaxStates: 180,
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
    scenario: "baseline-no-alley",
    solver: "lotscope-placement-v0.3",
    searchMode: "coarse-full-grid-sample",
    elapsedMs: Date.now() - started,
    families: pondyFamilies.map((family) => family.id),
    count: results.length,
    passCount: results.filter((item) => item.pass).length,
    results
  });
}
