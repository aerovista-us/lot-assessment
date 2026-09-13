import type { AssessmentEvidence, EvidenceGate, EvidenceStatus, LifecycleStage } from "@/packages/evidence";

export type AuditThreshold = {
  failBelow?: number;
  watchBelow?: number;
  passTightBelow?: number;
};

export function classifyMinimum(value: number, threshold: AuditThreshold): EvidenceStatus {
  if (threshold.failBelow != null && value < threshold.failBelow) return "FAIL";
  if (threshold.watchBelow != null && value < threshold.watchBelow) return "WATCH";
  if (threshold.passTightBelow != null && value < threshold.passTightBelow) return "PASS_TIGHT";
  return "PASS";
}

export function gate(input: EvidenceGate): EvidenceGate {
  return input;
}

export function validateEvidence(evidence: AssessmentEvidence): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const gate of evidence.gates) {
    if (ids.has(gate.id)) errors.push(`Duplicate gate id: ${gate.id}`);
    ids.add(gate.id);
    if (!gate.label.trim()) errors.push(`Gate ${gate.id} has no label`);
    if (!gate.summary.trim()) errors.push(`Gate ${gate.id} has no summary`);
  }
  if (!evidence.assumptions.length) errors.push("Evidence must expose at least one assumption.");
  if (!evidence.professionalBoundaries.length) errors.push("Evidence must expose professional review boundaries.");
  if (!evidence.trace.sourceRevision) errors.push("Evidence trace is missing sourceRevision.");
  return errors;
}

export function canPromote(evidence: AssessmentEvidence): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const validation = validateEvidence(evidence);
  reasons.push(...validation);

  const failing = evidence.gates.filter((item) => item.status === "FAIL");
  if (failing.length) reasons.push(`Failing gates: ${failing.map((item) => item.label).join(", ")}`);
  if (evidence.geometryVerdict !== "PASS") reasons.push("Geometry verdict must pass before promotion.");
  if (evidence.lifecycle === "DISCOVERED") reasons.push("Discovery candidates must be screened before promotion.");

  return { ok: reasons.length === 0, reasons };
}

export function nextLifecycle(stage: LifecycleStage): LifecycleStage {
  const order: LifecycleStage[] = ["DISCOVERED", "SCREENED", "AUDITED", "PROMOTED", "PRESENTABLE", "FROZEN"];
  return order[Math.min(order.indexOf(stage) + 1, order.length - 1)] ?? stage;
}

export const LOTSCOPE_AUDIT_CONTRACT = [
  "Source-of-truth geometry",
  "Parcel / setback containment",
  "Building and program fit",
  "Full-body vehicle clearance",
  "Garage opening and final parked pose",
  "Multi-stall simultaneous reality",
  "Usable pavement envelope",
  "Room and stair connectivity",
  "Opening / exterior-face consistency",
  "Professional-review boundaries",
  "Exact revision provenance",
  "Public explanation derived from the same evidence"
] as const;
