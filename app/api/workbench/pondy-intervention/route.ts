import { NextResponse } from "next/server";
import { CANDIDATE_SCHEMA_VERSION, type CandidateRecord } from "@/packages/candidates";
import { evaluateInterventionCandidate, exploreInterventionNeighborhood } from "@/packages/candidates/intervention-evaluation";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

export const dynamic = "force-dynamic";

function validCandidate(value: unknown): value is CandidateRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CandidateRecord>;
  return candidate.schemaVersion === CANDIDATE_SCHEMA_VERSION &&
    candidate.projectId === "pondy-flats" && candidate.lotId === "pondy-lot2" &&
    typeof candidate.id === "string" && Array.isArray(candidate.components);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { mode?: string; candidate?: unknown; componentId?: string } | null;
  if (!body || !validCandidate(body.candidate)) return NextResponse.json({ error: "Valid Pondy candidate payload required." }, { status: 400 });
  const rulesVersion = pondyCandidateRegistry.lots.find((lot) => lot.id === "pondy-lot2")?.rulesVersion;
  if (!rulesVersion) return NextResponse.json({ error: "Pondy rules version unavailable." }, { status: 500 });
  const createdAt = new Date().toISOString();
  if (body.mode === "explore") {
    if (!body.componentId) return NextResponse.json({ error: "componentId is required for explore mode." }, { status: 400 });
    const suggestions = exploreInterventionNeighborhood(body.candidate, body.componentId, rulesVersion, createdAt);
    return NextResponse.json({
      schemaVersion: "lotscope-intervention-explore-v1",
      mode: "explore",
      screeningOnly: true,
      authoritativeOutboundProven: false,
      suggestions
    }, { headers: { "cache-control": "no-store" } });
  }

  const screen = evaluateInterventionCandidate(body.candidate, rulesVersion, createdAt);
  return NextResponse.json({
    schemaVersion: "lotscope-intervention-evaluate-v1",
    mode: "evaluate",
    screeningOnly: true,
    authoritativeOutboundProven: false,
    ...screen
  }, { headers: { "cache-control": "no-store" } });
}
