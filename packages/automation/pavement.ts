import type { PlacementCandidate, PlacementProblem } from "@/packages/placement";
import { auditCandidateMobility } from "@/packages/placement/mobility-audit";

export type PavementSensitivityScenario = {
  driveWidthFt: number;
  turningPavementWidthFt: number;
  pass: boolean;
  promotionReady: boolean;
  status: string;
  gearChanges: number;
  failures: string[];
  warnings: string[];
  drives: Array<{
    driveId: string;
    status: string;
    hardPass: boolean;
    promotionReady: boolean;
    failures: string[];
    warnings: string[];
    minimumObstacleClearanceFt: number | null;
    minimumBoundaryClearanceFt: number | null;
    doorClearanceFt: number | null;
    minimumTurningRadiusFt: number | null;
    pavementViolationSamples: number | null;
  }>;
};

export type PavementSensitivityResult = {
  schemaVersion: "lotscope-pavement-sensitivity-v1";
  candidateId: string;
  family: string;
  model: "WIDENED_CENTERLINE_CORRIDOR_SENSITIVITY";
  note: string;
  baselineDriveWidthFt: number;
  minimumHardPassWidthFt: number | null;
  minimumPromotionWidthFt: number | null;
  pavementOnlyRescuePossible: boolean;
  scenarios: PavementSensitivityScenario[];
};

export function normalizePavementWidths(value: unknown) {
  const requested = Array.isArray(value) ? value : [12, 14, 16, 18, 20];
  return [...new Set(requested
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 10 && item <= 24)
    .map((item) => Math.round(item * 2) / 2))]
    .sort((a, b) => a - b)
    .slice(0, 8);
}

export function evaluatePavementSensitivity(
  problem: PlacementProblem,
  candidate: PlacementCandidate,
  requestedWidths?: unknown
): PavementSensitivityResult {
  const widthsFt = normalizePavementWidths(requestedWidths);
  if (!widthsFt.length) throw new Error("No valid pavement widths were supplied.");

  const scenarios = widthsFt.map((driveWidthFt) => {
    const audit = auditCandidateMobility(problem, candidate, { driveWidthFt });
    return {
      driveWidthFt,
      turningPavementWidthFt: audit.turningPavementWidthFt,
      pass: audit.pass,
      promotionReady: audit.promotionReady,
      status: audit.status,
      gearChanges: audit.drives.reduce((sum, drive) => sum + (drive.result?.gearChanges ?? 0), 0),
      failures: audit.failures,
      warnings: audit.warnings,
      drives: audit.drives.map((drive) => ({
        driveId: drive.driveId,
        status: drive.status,
        hardPass: drive.hardPass,
        promotionReady: drive.promotionReady,
        failures: drive.failures,
        warnings: drive.warnings,
        minimumObstacleClearanceFt: drive.result?.minimumObstacleClearanceFt ?? null,
        minimumBoundaryClearanceFt: drive.result?.minimumBoundaryClearanceFt ?? null,
        doorClearanceFt: drive.result?.doorClearanceFt ?? null,
        minimumTurningRadiusFt: drive.result?.minimumTurningRadiusFt ?? null,
        pavementViolationSamples: drive.result?.pavementViolationSamples ?? null
      }))
    };
  });

  const baseline = scenarios.find((scenario) => scenario.driveWidthFt === 12) ?? scenarios[0];
  const minimumHardPass = scenarios.find((scenario) => scenario.pass)?.driveWidthFt ?? null;
  const minimumPromotion = scenarios.find((scenario) => scenario.promotionReady)?.driveWidthFt ?? null;

  return {
    schemaVersion: "lotscope-pavement-sensitivity-v1",
    candidateId: candidate.id,
    family: candidate.family,
    model: "WIDENED_CENTERLINE_CORRIDOR_SENSITIVITY",
    note: "Planning sensitivity only: a passing wider corridor proves pavement can solve the modeled envelope conflict. Final apron shape, drainage, impervious-area treatment and civil takeoff remain design-development work.",
    baselineDriveWidthFt: baseline.driveWidthFt,
    minimumHardPassWidthFt: minimumHardPass,
    minimumPromotionWidthFt: minimumPromotion,
    pavementOnlyRescuePossible: !baseline.pass && minimumHardPass != null,
    scenarios
  };
}
