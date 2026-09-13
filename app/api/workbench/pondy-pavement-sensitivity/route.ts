import { NextRequest, NextResponse } from "next/server";
import { evaluatePavementSensitivity } from "@/packages/automation/pavement";
import { insetPolygonBySegment } from "@/packages/geometry";
import { PONDY_SURVEY, pondyProblem } from "@/packages/pondy";
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
  const problem = candidate.family === "rear-garage-stack" ? accessoryProblem : pondyProblem;

  try {
    const result = evaluatePavementSensitivity(problem, candidate, body.widthsFt);
    return NextResponse.json({
      ...result,
      accessoryEnvelopeApplied: candidate.family === "rear-garage-stack"
    }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return NextResponse.json({
      error: cause instanceof Error ? cause.message : "Pavement sensitivity failed."
    }, { status: 400 });
  }
}
