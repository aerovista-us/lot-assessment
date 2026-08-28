import { NextResponse } from "next/server";
import { solveFamilies } from "@/packages/optimizer";
import { pondyFamilies, pondyProblem } from "@/packages/pondy";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const solved = solveFamilies(pondyProblem, pondyFamilies, {
    // Diagnostic-only physical screen. The ranked endpoint is authoritative and owns
    // bounded repair; do not spend a second repair budget here on the same CI run.
    maxEvaluations: 180,
    diversePerFamily: 4,
    repairNearPasses: false,
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
    solver: "lotscope-placement-v0.4-diagnostic",
    searchMode: "coarse-full-grid-sample-no-repair",
    elapsedMs: Date.now() - started,
    families: pondyFamilies.map((family) => family.id),
    count: results.length,
    passCount: results.filter((item) => item.pass).length,
    results
  });
}
