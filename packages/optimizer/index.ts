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

function failedGateCount(evaluation: CandidateEvaluation) {
  return Number(!evaluation.containmentPass) + Number(!evaluation.overlapPass) +
    Number(!evaluation.separationPass) + Number(!evaluation.circulationPass);
}

/**
 * Bounded repair is for a near-pass, not a brute-force second solver attached to
 * every bad state. Restrict repair to candidates failing one physical gate and with
 * a small collision/boundary defect.
 */
function shouldAttemptRepair(evaluation: CandidateEvaluation): boolean {
  if (evaluation.pass || failedGateCount(evaluation) !== 1) return false;
  const sweepDefects = evaluation.sweeps.reduce(
    (sum, sweep) => sum + sweep.result.collisions.length + sweep.result.offParcelCount +
      sweep.result.pathIssues.filter((issue) => issue.kind === "short-tangent").length,
    0
  );
  return sweepDefects <= 4 && evaluation.issues.length <= 6;
}

/** Lower is better; hard PASS dominates all ranking preferences. */
export function physicalObjective(
  evaluation: CandidateEvaluation,
  repairActions: RepairAction[],
  minimumPreferredClearanceFt = 1
): number {
  const failedGates = failedGateCount(evaluation);
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

function variableCount(variable: NumericVariable): number {
  if (variable.step <= 0) throw new Error(`Variable ${variable.id} requires a positive step.`);
  return Math.max(1, Math.floor((variable.max - variable.min) / variable.step + 1e-9) + 1);
}

function valueAt(variable: NumericVariable, index: number): number {
  return Math.round((variable.min + variable.step * index) * 1000) / 1000;
}

/** Decode a mixed-radix grid index; the last variable changes fastest. */
function stateAtIndex(variables: NumericVariable[], counts: number[], index: number): VariableState {
  const state: VariableState = {};
  let remainder = index;
  for (let i = variables.length - 1; i >= 0; i -= 1) {
    const digit = remainder % counts[i];
    remainder = Math.floor(remainder / counts[i]);
    state[variables[i].id] = valueAt(variables[i], digit);
  }
  return state;
}

/**
 * Deterministic bounded grid sampling.
 *
 * The old implementation stopped after the first N lexicographic combinations,
 * which could leave early variables pinned at their minimum and make a "500 state"
 * search cover only one corner of a topology family. When the complete grid is larger
 * than the evaluation budget, sample evenly across the entire mixed-radix grid instead.
 */
function enumerateVariables(
  variables: NumericVariable[],
  max: number,
  visit: (state: VariableState, serial: number) => void
): number {
  if (max <= 0) return 0;
  const counts = variables.map(variableCount);
  const total = counts.reduce((product, count) => product * count, 1);
  const target = Math.min(max, total);

  if (target === total) {
    for (let index = 0; index < total; index += 1) {
      visit(stateAtIndex(variables, counts, index), index + 1);
    }
    return total;
  }

  let previousIndex = -1;
  let serial = 0;
  for (let sample = 0; sample < target; sample += 1) {
    // Center each sample in an equal-width stratum over the complete grid.
    let index = Math.min(total - 1, Math.floor(((sample + 0.5) * total) / target));
    if (index <= previousIndex) index = Math.min(total - 1, previousIndex + 1);
    previousIndex = index;
    serial += 1;
    visit(stateAtIndex(variables, counts, index), serial);
  }
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

    if (!evaluation.pass && options?.repairNearPasses && shouldAttemptRepair(evaluation)) {
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
