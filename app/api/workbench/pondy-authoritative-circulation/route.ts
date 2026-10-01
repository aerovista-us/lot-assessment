import { NextResponse } from "next/server";
import { CANDIDATE_SCHEMA_VERSION, type CandidateRecord } from "@/packages/candidates";
import { evaluateAuthoritativeCirculation } from "@/packages/circulation/authoritative-search";
import { evaluateInterventionWithAuthoritativeCirculation } from "@/packages/candidates/authoritative-evaluation";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function validCandidate(value: unknown): value is CandidateRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CandidateRecord>;
  return candidate.schemaVersion === CANDIDATE_SCHEMA_VERSION && candidate.projectId === "pondy-flats" && candidate.lotId === "pondy-lot2" && typeof candidate.id === "string" && Array.isArray(candidate.components);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { candidate?: unknown; maxExpandedStates?: number } | null;
  if (!body || !validCandidate(body.candidate)) return NextResponse.json({ error: "Valid Pondy candidate payload required." }, { status: 400 });
  const rulesVersion = pondyCandidateRegistry.lots.find((lot) => lot.id === "pondy-lot2")?.rulesVersion;
  if (!rulesVersion) return NextResponse.json({ error: "Pondy rules version unavailable." }, { status: 500 });
  const requested = Number(body.maxExpandedStates ?? 80000);
  const maxExpandedStates = Math.max(5000, Math.min(180000, Number.isFinite(requested) ? Math.round(requested) : 80000));
  const createdAt = new Date().toISOString();
  try {
    const circulation = evaluateAuthoritativeCirculation(body.candidate, { maxExpandedStates });
    const evaluation = evaluateInterventionWithAuthoritativeCirculation({ candidate: body.candidate, rulesVersion, circulation, createdAt });
    return NextResponse.json({
      schemaVersion: "lotscope-intervention-authoritative-response-v1",
      mode: "authoritative",
      maxExpandedStates,
      circulation,
      evaluation,
      hardGeometryPass: circulation.pass,
      promotionReady: false,
      professionalReviewStillRequired: true
    }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Authoritative circulation evaluation failed." }, { status: 500 });
  }
}
