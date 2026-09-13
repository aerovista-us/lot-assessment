import { NextRequest, NextResponse } from "next/server";
import {
  SITE_AUTOMATION_PASSES,
  SITE_AUTOMATION_POLICY,
  SITE_STRATEGY_TOOLBOX,
  evaluateCandidateAutomation
} from "@/packages/automation";
import type { PlacementCandidate, RepairAction } from "@/packages/placement";
import type { CandidateMobilityAudit } from "@/packages/placement/mobility-audit";
import type { ProgramEvaluation } from "@/packages/program";

export const dynamic = "force-dynamic";

type RankedCandidate = PlacementCandidate & {
  conceptGroup?: string;
  physicalPass: boolean;
  programPass: boolean;
  combinedPass: boolean;
  promotionReady?: boolean;
  combinedScore: number;
  promotionBoundaryClearanceFt?: number | null;
  physicalIssues: string[];
  repairActions: RepairAction[];
  mobilityAudit: CandidateMobilityAudit;
  program: ProgramEvaluation;
};

type RankedResponse = {
  evaluatedCount: number;
  physicalPassCount: number;
  combinedPassCount: number;
  promotionReadyCount?: number;
  distinctPromotionReadyCount?: number;
  promotionClearanceFt?: number;
  shortlist: RankedCandidate[];
  results: RankedCandidate[];
};

export async function GET(request: NextRequest) {
  const rankedUrl = new URL("/api/workbench/pondy-ranked", request.url);
  const response = await fetch(rankedUrl, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: `Ranked Workbench returned ${response.status}` }, { status: 502 });
  }

  const ranked = await response.json() as RankedResponse;
  const promotionClearanceFt = ranked.promotionClearanceFt ?? 1;
  const candidates = ranked.results.map((candidate) => ({
    id: candidate.id,
    family: candidate.family,
    conceptGroup: candidate.conceptGroup ?? candidate.family,
    physicalPass: candidate.physicalPass,
    programPass: candidate.programPass,
    combinedPass: candidate.combinedPass,
    promotionReady: Boolean(candidate.promotionReady),
    combinedScore: candidate.combinedScore,
    promotionBoundaryClearanceFt: candidate.promotionBoundaryClearanceFt ?? null,
    issues: candidate.physicalIssues,
    automation: evaluateCandidateAutomation({
      candidate,
      repairActions: candidate.repairActions,
      mobilityAudit: candidate.mobilityAudit,
      program: candidate.program,
      promotionBoundaryClearanceFt: candidate.promotionBoundaryClearanceFt ?? null,
      promotionClearanceFt
    })
  }));

  const appliedCounts = Object.fromEntries(SITE_STRATEGY_TOOLBOX.map((tool) => [
    tool.id,
    candidates.filter((candidate) => candidate.automation.appliedTools.includes(tool.id)).length
  ]));
  const nextCounts = Object.fromEntries(SITE_STRATEGY_TOOLBOX.map((tool) => [
    tool.id,
    candidates.filter((candidate) => candidate.automation.recommendedNext.some((next) => next.id === tool.id)).length
  ]));

  return NextResponse.json({
    schemaVersion: SITE_AUTOMATION_POLICY.schemaVersion,
    policy: SITE_AUTOMATION_POLICY,
    toolbox: SITE_STRATEGY_TOOLBOX,
    passes: SITE_AUTOMATION_PASSES,
    summary: {
      evaluatedCount: ranked.evaluatedCount,
      physicalPassCount: ranked.physicalPassCount,
      combinedPassCount: ranked.combinedPassCount,
      promotionReadyCount: ranked.promotionReadyCount ?? 0,
      distinctPromotionReadyCount: ranked.distinctPromotionReadyCount ?? ranked.shortlist.length,
      appliedCounts,
      nextCounts
    },
    shortlistIds: ranked.shortlist.map((candidate) => candidate.id),
    candidates
  }, { headers: { "cache-control": "no-store" } });
}
