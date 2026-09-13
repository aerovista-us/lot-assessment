import { NextRequest, NextResponse } from "next/server";
import { insetPolygonBySegment } from "@/packages/geometry";
import { PONDY_SURVEY, pondyProblem } from "@/packages/pondy";
import { auditCandidateMobility } from "@/packages/placement/mobility-audit";
import type { PlacementCandidate, PlacementProblem } from "@/packages/placement";

export const dynamic = "force-dynamic";

const ACCESSORY_SEGMENT_SETBACK = [5, 20, 5, 5, 5, 5];
const PONDY_ACCESSORY_BUILDABLE = insetPolygonBySegment(
  PONDY_SURVEY,
  (segmentIndex) => ACCESSORY_SEGMENT_SETBACK[segmentIndex] ?? 0
);
const accessoryProblem: PlacementProblem = {
  ...pondyProblem,
  buildableEnvelope: PONDY_ACCESSORY_BUILDABLE
};

function validCandidate(value: unknown): value is PlacementCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlacementCandidate>;
  return typeof candidate.id === "string" &&
    typeof candidate.family === "string" &&
    Array.isArray(candidate.placements) &&
    Array.isArray(candidate.drives);
}

function normalizeWidths(value: unknown) {
  const requested = Array.isArray(value) ? value : [12, 14, 16, 18, 20];
  return [...new Set(requested
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 10 && item <= 24)
    .map((item) => Math.round(item * 2) / 2))]
    .sort((a, b) => a - b)
    .slice(0, 8);
}

export async function POST(request: NextRequest) {
  let body: { candidate?: unknown; widthsFt?: unknown };
  try {
    body = await request.json() as { candidate?: unknown; widthsFt?: unknown };
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!validCandidate(body.candidate)) {
    return NextResponse.json({ error: "A valid PlacementCandidate is required." }, { status: 400 });
  }

  const candidate = body.candidate;
  const widthsFt = normalizeWidths(body.widthsFt);
  if (!widthsFt.length) {
    return NextResponse.json({ error: "No valid pavement widths were supplied." }, { status: 400 });
  }

  const problem = candidate.family === "rear-garage-stack" ? accessoryProblem : pondyProblem;
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
  const pavementOnlyRescuePossible = !baseline.pass && minimumHardPass != null;

  return NextResponse.json({
    schemaVersion: "lotscope-pavement-sensitivity-v1",
    candidateId: candidate.id,
    family: candidate.family,
    model: "WIDENED_CENTERLINE_CORRIDOR_SENSITIVITY",
    note: "This is a planning sensitivity test. A passing wider corridor proves pavement can solve the modeled envelope conflict; final apron shape and civil takeoff remain design-development work.",
    accessoryEnvelopeApplied: candidate.family === "rear-garage-stack",
    baselineDriveWidthFt: baseline.driveWidthFt,
    minimumHardPassWidthFt: minimumHardPass,
    minimumPromotionWidthFt: minimumPromotion,
    pavementOnlyRescuePossible,
    scenarios
  }, { headers: { "cache-control": "no-store" } });
}
