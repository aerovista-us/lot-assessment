/// <reference lib="webworker" />

import { evaluateAuthoritativeCirculation, type AuthoritativeCirculationResult, type StallAuthoritativeCirculation } from "@/packages/circulation/authoritative-search";
import type { CandidateRecord, StallComponent } from "@/packages/candidates";

type RequestMessage = { candidate: CandidateRecord; geometryRevision: string; maxExpandedStates?: number };

type ProgressMessage = {
  type: "progress";
  geometryRevision: string;
  stallId: string;
  stallLabel: string;
  index: number;
  total: number;
};
type StallMessage = Omit<ProgressMessage, "type"> & { type: "stall"; row: StallAuthoritativeCirculation };
type CompleteMessage = { type: "complete"; geometryRevision: string; result: AuthoritativeCirculationResult };
type ErrorMessage = { type: "error"; geometryRevision: string; error: string };

function combine(candidate: CandidateRecord, parts: AuthoritativeCirculationResult[], rows: StallAuthoritativeCirculation[]): AuthoritativeCirculationResult {
  const seed = parts[0];
  if (!seed) throw new Error("No authoritative circulation results were produced.");
  const summary = {
    stallCount: rows.length,
    inboundPass: rows.filter((row) => row.inbound.found).length,
    outboundPass: rows.filter((row) => row.outbound.found).length,
    fullCirculationPass: rows.filter((row) => row.fullCirculationPass).length
  };
  return {
    ...seed,
    candidateId: candidate.id,
    generatedAt: new Date().toISOString(),
    stalls: rows,
    summary,
    pass: rows.length > 0 && summary.fullCirculationPass === rows.length,
    policyReady: null,
    policyNote: "Hard geometry only. Practical comfort thresholds and professional/AHJ review remain separate policy gates.",
    professionalReviewStillRequired: true
  };
}

self.onmessage = (event: MessageEvent<RequestMessage>) => {
  const { candidate, geometryRevision, maxExpandedStates = 180000 } = event.data;
  try {
    const stalls = candidate.components.filter((item): item is StallComponent => item.kind === "stall");
    const parts: AuthoritativeCirculationResult[] = [];
    const rows: StallAuthoritativeCirculation[] = [];
    stalls.forEach((stall, index) => {
      const progress: ProgressMessage = {
        type: "progress",
        geometryRevision,
        stallId: stall.id,
        stallLabel: stall.label,
        index,
        total: stalls.length
      };
      self.postMessage(progress);
      const partial = evaluateAuthoritativeCirculation(candidate, { stallIds: [stall.id], maxExpandedStates });
      const row = partial.stalls[0];
      if (!row) throw new Error(`Authoritative circulation returned no row for ${stall.label}.`);
      parts.push(partial); rows.push(row);
      const completed: StallMessage = { ...progress, type: "stall", index: index + 1, row };
      self.postMessage(completed);
    });
    const result = combine(candidate, parts, rows);
    const complete: CompleteMessage = { type: "complete", geometryRevision, result };
    self.postMessage(complete);
  } catch (cause) {
    const failure: ErrorMessage = {
      type: "error",
      geometryRevision,
      error: cause instanceof Error ? cause.message : "Authoritative circulation worker failed."
    };
    self.postMessage(failure);
  }
};

export {};
