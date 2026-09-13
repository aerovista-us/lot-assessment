export type EvidenceAudience = "PUBLIC" | "WORKBENCH";
export type EvidenceStatus = "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL" | "PROFESSIONAL_REVIEW";
export type LifecycleStage = "DISCOVERED" | "SCREENED" | "AUDITED" | "PROMOTED" | "PRESENTABLE" | "FROZEN";

export type EvidenceMetric = {
  id: string;
  label: string;
  value: string | number | boolean | null;
  unit?: string;
  note?: string;
};

export type EvidenceGate = {
  id: string;
  label: string;
  status: EvidenceStatus;
  summary: string;
  details?: string[];
  metrics?: EvidenceMetric[];
  publicSummary?: string;
  technical?: boolean;
};

export type EvidenceFinding = {
  id: string;
  title: string;
  status: EvidenceStatus;
  summary: string;
  recommendation?: string;
  audience?: EvidenceAudience[];
};

export type ProfessionalBoundary = {
  id: string;
  label: string;
  status: "OPEN" | "CONFIRMED";
  note: string;
};

export type EvidenceTrace = {
  sourceProject: string;
  sourceRevision: string;
  engineRevision: string;
  generatedAt: string;
  workflowRunId?: string | number;
  artifactId?: string | number;
  artifactSha256?: string;
};

export type AssessmentEvidence = {
  schemaVersion: "lotscope-assessment-evidence-v1";
  id: string;
  title: string;
  subtitle: string;
  lifecycle: LifecycleStage;
  geometryVerdict: "PASS" | "FAIL";
  releaseVerdict: "READY" | "CONDITIONAL" | "BLOCKED";
  feasibilityLabel: string;
  informationConfidenceLabel: string;
  executiveSummary: string;
  assumptions: string[];
  gates: EvidenceGate[];
  findings: EvidenceFinding[];
  professionalBoundaries: ProfessionalBoundary[];
  trace: EvidenceTrace;
};

export type AssessmentSummary = {
  overall: "PASS" | "PASS_WITH_WATCH" | "CONDITIONAL" | "FAIL";
  passCount: number;
  watchCount: number;
  professionalReviewCount: number;
  failCount: number;
};

export function summarizeEvidence(evidence: AssessmentEvidence): AssessmentSummary {
  const passCount = evidence.gates.filter((gate) => gate.status === "PASS" || gate.status === "PASS_TIGHT").length;
  const watchCount = evidence.gates.filter((gate) => gate.status === "WATCH" || gate.status === "PASS_TIGHT").length;
  const professionalReviewCount = evidence.gates.filter((gate) => gate.status === "PROFESSIONAL_REVIEW").length;
  const failCount = evidence.gates.filter((gate) => gate.status === "FAIL").length;

  let overall: AssessmentSummary["overall"] = "PASS";
  if (failCount > 0 || evidence.geometryVerdict === "FAIL") overall = "FAIL";
  else if (evidence.releaseVerdict === "CONDITIONAL" || professionalReviewCount > 0) overall = "CONDITIONAL";
  else if (watchCount > 0) overall = "PASS_WITH_WATCH";

  return { overall, passCount, watchCount, professionalReviewCount, failCount };
}

export function evidenceForAudience(evidence: AssessmentEvidence, audience: EvidenceAudience): AssessmentEvidence {
  return {
    ...evidence,
    gates: evidence.gates
      .filter((gate) => audience === "WORKBENCH" || !gate.technical)
      .map((gate) => audience === "PUBLIC" && gate.publicSummary ? { ...gate, summary: gate.publicSummary, details: undefined, metrics: gate.metrics?.filter((metric) => !metric.id.startsWith("internal-")) } : gate),
    findings: evidence.findings.filter((finding) => !finding.audience || finding.audience.includes(audience)),
    trace: audience === "PUBLIC"
      ? { ...evidence.trace, artifactSha256: undefined }
      : evidence.trace
  };
}
