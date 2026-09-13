import { NextResponse } from "next/server";
import { GET as getRanked } from "@/app/api/workbench/pondy-ranked/route";
import { evidenceForAudience } from "@/packages/evidence";
import { workbenchCandidateEvidence, type WorkbenchCandidateEvidenceInput } from "@/lib/workbench-evidence-adapter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rankedResponse = await getRanked();
  if (!rankedResponse.ok) return rankedResponse;

  const ranked = await rankedResponse.json() as {
    project: string;
    scenario: string;
    solver: string;
    scoringVersion: string;
    evaluatedCount?: number;
    preferredLivingSqFt?: number;
    promotionTargetCapacitySqFt?: number;
    promotionClearanceFt?: number;
    shortlist?: WorkbenchCandidateEvidenceInput[];
    results: WorkbenchCandidateEvidenceInput[];
  };

  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("id");
  const audience = searchParams.get("audience") === "public" ? "PUBLIC" : "WORKBENCH";
  const candidates = [...(ranked.shortlist ?? []), ...ranked.results];
  const candidate = requestedId
    ? candidates.find((item) => item.id === requestedId)
    : (ranked.shortlist?.[0] ?? ranked.results[0]);

  if (!candidate) {
    return NextResponse.json({ error: requestedId ? `Candidate ${requestedId} was not found.` : "No Workbench candidate was produced." }, { status: 404 });
  }

  const evidence = workbenchCandidateEvidence(candidate, {
    project: ranked.project,
    scenario: ranked.scenario,
    solver: ranked.solver,
    scoringVersion: ranked.scoringVersion,
    evaluatedCount: ranked.evaluatedCount,
    preferredLivingSqFt: ranked.preferredLivingSqFt,
    promotionTargetCapacitySqFt: ranked.promotionTargetCapacitySqFt,
    promotionClearanceFt: ranked.promotionClearanceFt,
    sourceRevision: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || candidate.freeze?.freezeHash || candidate.id
  });

  return NextResponse.json({
    candidateId: candidate.id,
    family: candidate.family,
    evaluatedCount: ranked.evaluatedCount,
    evidence: evidenceForAudience(evidence, audience)
  }, { headers: { "Cache-Control": "no-store" } });
}
