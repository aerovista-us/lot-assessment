import type { CandidateEvaluation, CandidateRecord, GateEvaluation } from "@/packages/candidates";
import { INTERVENTION_SCREEN_VERSION, evaluateInterventionCandidate } from "@/packages/candidates/intervention-evaluation";
import type { AuthoritativeCirculationResult } from "@/packages/circulation/authoritative-search";
import { interventionGeometryHash } from "@/packages/canonical/intervention-v2";

export const INTERVENTION_AUTHORITATIVE_VERSION = "lotscope-intervention-authoritative-v1" as const;

function authoritativeGate(candidate: CandidateRecord, result: AuthoritativeCirculationResult): GateEvaluation {
  const expandedStates = result.stalls.reduce((total, row) => total + row.inbound.expandedStates + row.outbound.expandedStates, 0);
  const failedStalls = result.stalls.filter((row) => !row.fullCirculationPass).map((row) => row.stallId);
  return {
    id: "authoritative-outbound",
    label: "Authoritative independent circulation",
    status: result.pass ? "PASS" : "FAIL",
    summary: result.pass
      ? `${result.summary.stallCount}/${result.summary.stallCount} modeled stalls independently prove inbound and street egress under the hardened full-body planner.`
      : `${result.summary.inboundPass}/${result.summary.stallCount} inbound and ${result.summary.outboundPass}/${result.summary.stallCount} outbound paths were proven within this search run. Open stalls: ${failedStalls.join(", ") || "none identified"}. A capped search failure is not a mathematical impossibility result.`,
    blockerClass: "circulation",
    repairClasses: result.pass ? undefined : ["reshape-drive", "local-pavement-flare", "translate-garage", "rotate-garage", "edit-opening"],
    metrics: {
      authoritativeProof: result.pass,
      stallCount: result.summary.stallCount,
      inboundPass: result.summary.inboundPass,
      outboundPass: result.summary.outboundPass,
      fullCirculationPass: result.summary.fullCirculationPass,
      expandedStates,
      geometryHash: interventionGeometryHash(candidate)
    }
  };
}

export function evaluateInterventionWithAuthoritativeCirculation(args: {
  candidate: CandidateRecord;
  rulesVersion: string;
  circulation: AuthoritativeCirculationResult;
  createdAt?: string;
}): CandidateEvaluation {
  const createdAt = args.createdAt ?? new Date().toISOString();
  if (args.circulation.candidateId !== args.candidate.id) throw new Error("Circulation evidence candidate id does not match the working candidate.");
  const screen = evaluateInterventionCandidate(args.candidate, args.rulesVersion, createdAt, "authoritative-base");
  const circulationGate = authoritativeGate(args.candidate, args.circulation);
  const gates = screen.evaluation.gates.map((gate) => gate.id === "authoritative-outbound" ? circulationGate : gate);
  const hardLocalFailures = gates.filter((gate) => gate.status === "FAIL" && gate.id !== "authoritative-outbound").length;
  const fundamentalFail = gates.some((gate) => gate.status === "FAIL" && (gate.blockerClass === "parcel" || gate.blockerClass === "program"));
  const status: CandidateEvaluation["status"] = fundamentalFail ? "FAIL" : hardLocalFailures > 0 || !args.circulation.pass ? "PARTIAL_FAIL" : "PASS";
  const token = createdAt.replace(/[-:.TZ]/g, "").slice(0, 17);
  return {
    id: `eval-${args.candidate.id}-authoritative-${token}`,
    candidateId: args.candidate.id,
    createdAt,
    engineVersion: `${INTERVENTION_AUTHORITATIVE_VERSION} / ${args.circulation.schemaVersion}`,
    rulesVersion: args.rulesVersion,
    schemaVersion: INTERVENTION_AUTHORITATIVE_VERSION,
    status,
    promotionReady: false,
    score: screen.screeningScore,
    gates,
    summary: status === "PASS"
      ? "Local intervention hard gates and independent full-circulation geometry pass. Professional/AHJ and promotion-policy gates remain separate."
      : fundamentalFail
        ? "A fundamental local geometry/program gate fails; authoritative circulation evidence is recorded but cannot promote the candidate."
        : hardLocalFailures > 0
          ? `${hardLocalFailures} local hard blocker(s) remain; authoritative circulation evidence is recorded for this exact geometry.`
          : "Local screening is clear or watch-only, but independent full circulation remains open at the recorded search cap."
  };
}
