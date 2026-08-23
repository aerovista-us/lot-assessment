import {
  CandidateEvaluation,
  PlacementCandidate,
  PlacementProblem,
  RepairAction,
  boundedRepair,
  evaluatePlacement
} from "@/packages/placement";

export type NumericVariable = {
  id: string;
  min: number;
  max: number;
  step: number;
};

export type VariableState = Record<string, number>;

export type SolvedCandidate = {
  candidate: PlacementCandidate;
  evaluation: CandidateEvaluation;
  variables: VariableState;
  repairActions: RepairAction[];
  repaired: boolean;
  objective: number;
};

export type FamilySearch = {
  id: string;
  variables: NumericVariable[];
  build: (variables: VariableState, serial: number) => PlacementCandidate;
};

export type SolveOptions = {
  maxEvaluations?: number;
  keep?: number;
  repairNearPasses?: boolean;
  repairMaxStates?: number;
  repairMaxActions?: number;
  minimumPreferredClearanceFt?: number;
};

function actionMagnitude(actions: RepairAction[]): number {
  return actions.reduce((sum, action) => sum + Math.hypot(action.dx, action.dy), 0);
}

/**
 * Lower is better. Hard-pass candidates sort ahead of non-pass candidates. Within
 * each class, prefer fewer geometric failures, more vehicle boundary clearance,
 * and smaller repair motion. Architectural/program scoring belongs in a separate
 * layer and can be composed after this physical solve.
 */
export function physicalObjective(
  evaluation: CandidateEvaluation,
  repairActions: RepairAction[],
  minimumPreferredClearanceFt = 1
): number {
  const failedGates = Number(!evaluation.containmentPass) + Number(!evaluation.overlapPass) +
    Number(!evaluation.separationPass) + Number(!evaluation.circulationPass);
  const collisions = evaluation.sweeps.reduce(
    (sum, sweep) => sum + sweep.result.collisions.length + sweep.result.offParcelCount,
    0
  );
  const shortTangents = evaluation.sweeps.reduce(
    (sum, sweep) => sum + sweep.result.pathIssues.filter((issue) => issue.kind === "short-tangent").length,
    0
  );
  const clearance = evaluation.minimumClearanceFt ?? 0;
  const clearancePenalty = Math.max(0, minimumPreferredClearanceFt - clearance) * 10;
  const passBase = evaluation.pass ? 0 : 100000;
  return passBase + failedGates * 10000 + collisions * 250 + shortTangents * 500 +
    clearancePenalty + actionMagnitude(repairActions);
}

function enumerateVariables(
  variables: NumericVariable[],
  max: number,
  visit: (state: VariableState, serial: number) => void
): number {
  let serial = 0;
  const recurse = (index: number, state: VariableState) => {
    if (serial >= max) return;
    if (index >= variables.length) {
      serial += 1;
      visit({ ...state }, serial);
      return;
    }
    const variable = variables[index];
    if (variable.step <= 0) throw new Error(`Variable ${variable.id} requires a positive step.`);
    for (let value = variable.min; value <= variable.max + 1e-9; value += variable.step) {
      state[variable.id] = Math.round(value * 1000) / 1000;
      recurse(index + 1, state);
      if (serial >= max) break;
    }
  };
  recurse(0, {});
  return serial;
}

export function solveFamily(
  problem: PlacementProblem,
  family: FamilySearch,
  options?: SolveOptions
): SolvedCandidate[] {
  const maxEvaluations = options?.maxEvaluations ?? 10000;
  const keep = options?.keep ?? 20;
  const results: SolvedCandidate[] = [];

  enumerateVariables(family.variables, maxEvaluations, (variables, serial) => {
    const source = family.build(variables, serial);
    let candidate = source;
    let evaluation = evaluatePlacement(problem, source);
    let repairActions: RepairAction[] = [];
    let repaired = false;

    if (!evaluation.pass && options?.repairNearPasses) {
      const repair = boundedRepair(problem, source, {
        maxActions: options.repairMaxActions ?? 2,
        maxStates: options.repairMaxStates ?? 800
      });
      if (repair.status !== "FAIL") {
        candidate = repair.candidate;
        evaluation = repair.evaluation;
        repairActions = repair.actions;
        repaired = repair.actions.length > 0;
      }
    }

    results.push({
      candidate,
      evaluation,
      variables,
      repairActions,
      repaired,
      objective: physicalObjective(
        evaluation,
        repairActions,
        options?.minimumPreferredClearanceFt ?? 1
      )
    });
  });

  return results
    .sort((a, b) => a.objective - b.objective || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, keep);
}

export function solveFamilies(
  problem: PlacementProblem,
  families: FamilySearch[],
  options?: SolveOptions & { diversePerFamily?: number }
): SolvedCandidate[] {
  const perFamily = options?.diversePerFamily ?? 4;
  const combined = families.flatMap((family) =>
    solveFamily(problem, family, { ...options, keep: perFamily })
  );
  return combined.sort((a, b) => a.objective - b.objective);
}

/** Refine a coarse winning state around its current values without changing topology. */
export function refineFamilyAround(
  problem: PlacementProblem,
  family: FamilySearch,
  center: VariableState,
  coarseStepFt = 1,
  fineStepsFt: number[] = [0.5, 0.25],
  options?: SolveOptions
): SolvedCandidate[] {
  let bestState = { ...center };
  let best: SolvedCandidate[] = [];

  for (const fineStep of fineStepsFt) {
    const refined: FamilySearch = {
      ...family,
      variables: family.variables.map((variable) => {
        const current = bestState[variable.id];
        const radius = Math.max(coarseStepFt, variable.step);
        return {
          ...variable,
          min: Math.max(variable.min, current - radius),
          max: Math.min(variable.max, current + radius),
          step: fineStep
        };
      })
    };
    best = solveFamily(problem, refined, { ...options, keep: Math.max(options?.keep ?? 10, 10) });
    if (!best.length) break;
    bestState = best[0].variables;
  }

  return best;
}
