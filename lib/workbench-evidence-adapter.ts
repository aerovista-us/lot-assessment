import type { AssessmentEvidence, EvidenceGate, EvidenceStatus, LifecycleState } from "@/packages/evidence";
import type { CandidateMobilityAudit } from "@/packages/placement/mobility-audit";

export type WorkbenchProgramUnit = {
  unitId: string;
  pass: boolean;
  intendedLivingSqFt: number | null;
  netLivingCapacitySqFt?: number | null;
  penalties?: string[];
  reasons?: string[];
};

export type WorkbenchProgram = {
  pass: boolean;
  qualityScore: number;
  reasons?: string[];
  unitResults: WorkbenchProgramUnit[];
};

export type WorkbenchRoomPacking = {
  schemaVersion?: string;
  pass: boolean;
  score: number;
  reasons?: string[];
};

export type WorkbenchCandidateEvidenceInput = {
  id: string;
  family: string;
  conceptGroup?: string;
  lifecycle?: LifecycleState;
  physicalPass: boolean;
  programPass: boolean;
  combinedPass: boolean;
  promotionReady?: boolean;
  combinedScore: number;
  repaired?: boolean;
  minimumClearanceFt: number | null;
  promotionBoundaryClearanceFt?: number | null;
  physicalIssues?: string[];
  mobilityAudit?: CandidateMobilityAudit;
  promotionChecks?: {
    clearanceReady: boolean;
    capacityReady: boolean;
    mobilityReady?: boolean;
    minimumClearanceFt: number;
    requiredNetLivingCapacitySqFt: number;
  };
  pavement?: {
    estimatedTotalPavementSqFt: number;
    estimatedBuildablePavementSqFt: number;
    buildableSharePct: number;
  };
  program: WorkbenchProgram;
  roomPacking?: WorkbenchRoomPacking;
  freeze?: { freezeHash: string };
  metadata?: Record<string, string | number | boolean>;
};

export type WorkbenchRunContext = {
  project: string;
  scenario: string;
  solver: string;
  scoringVersion: string;
  evaluatedCount?: number;
  preferredLivingSqFt?: number;
  promotionTargetCapacitySqFt?: number;
  promotionClearanceFt?: number;
  sourceRevision?: string;
};

function state(pass: boolean, watch = false): EvidenceStatus {
  if (!pass) return "FAIL";
  return watch ? "WATCH" : "PASS";
}

function physicalGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  const clearance = candidate.minimumClearanceFt;
  const tight = candidate.physicalPass && clearance != null && clearance < 1.25;
  return {
    id: "physical-geometry",
    label: "Physical geometry",
    status: candidate.physicalPass ? (tight ? "PASS_TIGHT" : "PASS") : "FAIL",
    summary: candidate.physicalPass
      ? `The candidate clears the current placement and hard mobility gates${clearance == null ? "." : ` with ${clearance.toFixed(2)} ft minimum legacy solver clearance.`}`
      : `The candidate still has physical issues: ${(candidate.physicalIssues ?? ["unresolved geometry"]).slice(0, 2).join("; ")}.`,
    publicSummary: candidate.physicalPass
      ? "The current concept clears the internal physical geometry screen."
      : "The current concept still has unresolved physical geometry conflicts.",
    details: candidate.physicalIssues,
    metrics: [
      { id: "minimum-clearance", label: "Legacy solver clearance", value: clearance == null ? null : Number(clearance.toFixed(3)), unit: "ft" },
      { id: "repair-applied", label: "Bounded repair applied", value: Boolean(candidate.repaired) }
    ]
  };
}

function mobilityGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  const mobility = candidate.mobilityAudit;
  if (!mobility) {
    return {
      id: "mobility",
      label: "Hardened vehicle mobility",
      status: "WATCH",
      summary: "The hardened full-body mobility audit was not emitted for this candidate.",
      publicSummary: "Vehicle maneuverability still needs the deeper Workbench audit."
    };
  }

  const metrics = mobility.drives.flatMap((drive) => {
    const result = drive.result;
    return [
      { id: `${drive.driveId}-garage`, label: `${drive.driveId} garage`, value: drive.targetGarage ? `${drive.targetGarage.widthFt}×${drive.targetGarage.depthFt}` : null, unit: drive.targetGarage ? "ft" : undefined },
      { id: `${drive.driveId}-door`, label: `${drive.driveId} door margin`, value: result?.doorClearanceFt == null ? null : Number(result.doorClearanceFt.toFixed(3)), unit: "ft" },
      { id: `${drive.driveId}-radius`, label: `${drive.driveId} min turn radius`, value: result?.minimumTurningRadiusFt == null ? null : Number(result.minimumTurningRadiusFt.toFixed(2)), unit: "ft" },
      { id: `${drive.driveId}-obstacle`, label: `${drive.driveId} obstacle clearance`, value: result?.minimumObstacleClearanceFt == null ? null : Number(result.minimumObstacleClearanceFt.toFixed(3)), unit: "ft" },
      { id: `${drive.driveId}-pavement`, label: `${drive.driveId} pavement violations`, value: result?.pavementViolationSamples ?? null },
      { id: `${drive.driveId}-reverse`, label: `${drive.driveId} reverse replay`, value: result?.reverseReplayPass ?? false }
    ];
  });

  return {
    id: "mobility",
    label: "Hardened vehicle mobility",
    status: mobility.status,
    summary: mobility.promotionReady
      ? `All ${mobility.drives.length} modeled garage approaches clear the independent full-body promotion audit.`
      : mobility.pass
        ? `Vehicle geometry is hard-pass valid, but practical promotion remains open: ${mobility.warnings[0] ?? "one or more comfort thresholds remain tight"}.`
        : `The independent full-body audit blocks promotion: ${mobility.failures[0] ?? "mobility proof failed"}.`,
    publicSummary: mobility.promotionReady
      ? "The modeled vehicle can enter, park, and replay the outbound path within the current maneuver envelope."
      : mobility.pass
        ? "The modeled vehicle path works geometrically but still has a practical-use concern."
        : "The current vehicle-access geometry is not yet proven for full entry, enclosed parking, and outbound replay.",
    details: [...mobility.failures, ...mobility.warnings].slice(0, 8),
    metrics
  };
}

function programGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  return {
    id: "program",
    label: "Residential program",
    status: state(candidate.programPass),
    summary: candidate.programPass
      ? `Program evaluator passes the current unit targets with a quality score of ${candidate.program.qualityScore.toFixed(1)}.`
      : `Program evaluator has not cleared the current unit targets: ${(candidate.program.reasons ?? ["program tuning required"])[0]}.`,
    publicSummary: candidate.programPass
      ? "The modeled building capacity supports the current residential program screen."
      : "The modeled building capacity still needs program refinement.",
    metrics: candidate.program.unitResults.flatMap((unit) => [
      { id: `${unit.unitId}-intended`, label: `Unit ${unit.unitId} intended living`, value: unit.intendedLivingSqFt, unit: "sq ft" },
      { id: `${unit.unitId}-capacity`, label: `Unit ${unit.unitId} net capacity`, value: unit.netLivingCapacitySqFt ?? null, unit: "sq ft" }
    ])
  };
}

function promotionGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  const checks = candidate.promotionChecks;
  if (!checks) {
    return { id: "promotion", label: "Promotion readiness", status: "WATCH", summary: "Promotion checks were not emitted for this candidate." };
  }
  const pass = Boolean(candidate.promotionReady);
  const blockers = [
    !checks.clearanceReady ? "boundary clearance" : null,
    !checks.capacityReady ? "residential capacity" : null,
    checks.mobilityReady === false ? "hardened vehicle mobility" : null
  ].filter(Boolean);
  return {
    id: "promotion",
    label: "Promotion readiness",
    status: pass ? "PASS" : "WATCH",
    summary: pass
      ? "Candidate clears the current Workbench promotion thresholds."
      : `Candidate remains below one or more promotion thresholds${blockers.length ? ` (${blockers.join(", ")})` : ""}.`,
    publicSummary: pass
      ? "The concept has cleared the current internal promotion thresholds."
      : "The concept is still being refined before it should be treated as a promoted option.",
    metrics: [
      { id: "promotion-clearance", label: "Boundary clearance", value: candidate.promotionBoundaryClearanceFt == null ? null : Number(candidate.promotionBoundaryClearanceFt.toFixed(3)), unit: "ft" },
      { id: "clearance-target", label: "Promotion clearance target", value: checks.minimumClearanceFt, unit: "ft" },
      { id: "capacity-target", label: "Net living capacity target", value: checks.requiredNetLivingCapacitySqFt, unit: "sq ft" },
      { id: "mobility-ready", label: "Hardened mobility ready", value: checks.mobilityReady ?? null }
    ]
  };
}

function architectureGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  if (!candidate.roomPacking) {
    return {
      id: "architecture",
      label: "Architectural feasibility",
      status: candidate.promotionReady ? "WATCH" : "PROFESSIONAL_REVIEW",
      summary: candidate.promotionReady
        ? "Candidate is eligible for architectural packing but no room-packing result is attached to this solver record yet."
        : "Architectural room packing is deferred until the candidate clears the earlier promotion gates.",
      publicSummary: "Detailed architectural room packing is a later-stage check."
    };
  }
  return {
    id: "architecture",
    label: "Architectural feasibility",
    status: candidate.roomPacking.pass ? "PASS" : "WATCH",
    summary: candidate.roomPacking.pass
      ? `Frozen geometry clears room-packing heuristics with a score of ${candidate.roomPacking.score.toFixed(1)}.`
      : `Room-packing review remains open: ${(candidate.roomPacking.reasons ?? ["architectural tuning required"])[0]}.`,
    publicSummary: candidate.roomPacking.pass
      ? "The frozen geometry clears the current architectural planning heuristics."
      : "The site geometry may work, but the interior planning still needs refinement.",
    metrics: [
      { id: "room-pack-score", label: "Room-packing score", value: Number(candidate.roomPacking.score.toFixed(1)) },
      { id: "freeze-hash", label: "Canonical freeze", value: candidate.freeze?.freezeHash?.slice(0, 12) ?? null }
    ]
  };
}

function pavementGate(candidate: WorkbenchCandidateEvidenceInput): EvidenceGate {
  if (!candidate.pavement) return { id: "pavement", label: "Site efficiency", status: "WATCH", summary: "Pavement efficiency was not emitted for this candidate." };
  const highShare = candidate.pavement.buildableSharePct > 35;
  return {
    id: "pavement",
    label: "Pavement / site efficiency",
    status: highShare ? "WATCH" : "PASS",
    summary: `${candidate.pavement.buildableSharePct.toFixed(0)}% of the modeled drive centerline is estimated to occupy otherwise-buildable land. Hardened mobility separately verifies the full vehicle body against the modeled ${candidate.mobilityAudit?.driveWidthFt ?? 12} ft corridor.`,
    publicSummary: highShare
      ? "Vehicle access consumes a meaningful share of otherwise-buildable land and may be worth optimizing."
      : "The current access pattern avoids excessive use of the modeled buildable envelope.",
    metrics: [
      { id: "pavement-total", label: "Estimated pavement", value: Math.round(candidate.pavement.estimatedTotalPavementSqFt), unit: "sq ft" },
      { id: "pavement-buildable", label: "Estimated pavement in buildable land", value: Math.round(candidate.pavement.estimatedBuildablePavementSqFt), unit: "sq ft" },
      { id: "buildable-share", label: "Buildable-land share", value: Number(candidate.pavement.buildableSharePct.toFixed(1)), unit: "%" }
    ]
  };
}

export function workbenchCandidateEvidence(candidate: WorkbenchCandidateEvidenceInput, run: WorkbenchRunContext): AssessmentEvidence {
  const lifecycle: LifecycleState = candidate.lifecycle ?? (candidate.freeze?.freezeHash
    ? "FROZEN"
    : candidate.promotionReady
      ? "PROMOTED"
      : candidate.combinedPass
        ? "AUDITED"
        : "SCREENED");

  const geometryVerdict = candidate.physicalPass ? "PASS" : "FAIL";
  const releaseVerdict = candidate.promotionReady && candidate.roomPacking?.pass ? "READY" : geometryVerdict === "FAIL" ? "BLOCKED" : "CONDITIONAL";
  const gates = [physicalGate(candidate), mobilityGate(candidate), programGate(candidate), promotionGate(candidate), architectureGate(candidate), pavementGate(candidate), {
    id: "professional-validation",
    label: "Professional validation",
    status: "PROFESSIONAL_REVIEW" as const,
    summary: "Solver results are design-development evidence only. Zoning, survey/easements, fire/building, structure, MEP, civil/drainage, energy, and permits remain outside this automated promotion gate.",
    publicSummary: "Professional and jurisdiction review is still required before relying on this as a buildable or permit-ready design."
  }];

  const findings = [
    ...(candidate.mobilityAudit?.failures ?? []).slice(0, 4).map((issue, index) => ({ id: `mobility-fail-${index}`, title: "Mobility blocker", status: "FAIL" as const, summary: issue })),
    ...(candidate.mobilityAudit?.warnings ?? []).slice(0, 4).map((issue, index) => ({ id: `mobility-watch-${index}`, title: "Mobility watch", status: "WATCH" as const, summary: issue })),
    ...(candidate.physicalIssues ?? []).slice(0, 4).map((issue, index) => ({ id: `physical-${index}`, title: "Physical issue", status: "WATCH" as const, summary: issue, audience: ["WORKBENCH" as const] })),
    ...(candidate.program.reasons ?? []).slice(0, 3).map((reason, index) => ({ id: `program-${index}`, title: "Program note", status: candidate.programPass ? "PASS" as const : "WATCH" as const, summary: reason }))
  ];

  return {
    schemaVersion: "lotscope-assessment-evidence-v1",
    id: `${run.project}-${candidate.id}`,
    title: `${candidate.family} · ${candidate.id}`,
    subtitle: `${run.project} · ${run.scenario}`,
    lifecycle,
    geometryVerdict,
    releaseVerdict,
    feasibilityLabel: candidate.promotionReady ? "Promotion-ready geometry" : candidate.combinedPass ? "Technical pass · promotion tuning" : candidate.physicalPass ? "Physical pass · program tuning" : "Physical tuning required",
    informationConfidenceLabel: "Workbench modeled evidence · external approvals open",
    executiveSummary: candidate.promotionReady
      ? "This candidate clears physical, hardened mobility, program, clearance, and capacity promotion gates. Architectural packing and professional-review boundaries determine whether it should advance further."
      : candidate.combinedPass
        ? "This candidate is technically feasible under the current Workbench model but has not cleared every promotion threshold."
        : candidate.physicalPass
          ? "The hard site and mobility geometry works under the current model, but the residential program still needs tuning."
          : "This candidate remains in physical or mobility development and should not be promoted yet.",
    assumptions: [
      `Solver: ${run.solver}.`,
      `Scoring: ${run.scoringVersion}.`,
      `Scenario: ${run.scenario}.`,
      candidate.mobilityAudit ? `Mobility door model: ${candidate.mobilityAudit.doorModel}; pavement model: ${candidate.mobilityAudit.pavementModel}.` : "Hardened mobility audit not attached.",
      "Generated garage-door openings are design-development geometry, not structural door sizing approval.",
      "Modeled geometry and heuristics are design-development evidence, not zoning/code/civil/permit approval."
    ],
    gates,
    findings,
    professionalBoundaries: [
      { id: "zoning", label: "Zoning / allowed use", status: "OPEN", note: "Parcel-specific entitlement and code interpretation remain external validation." },
      { id: "survey", label: "Survey / easements", status: "OPEN", note: "Final property and easement geometry requires authoritative source confirmation." },
      { id: "civil", label: "Civil / drainage / grading", status: "OPEN", note: "Drive grades, drainage, utilities, snow storage, and civil certification are not automated here." },
      { id: "building", label: "Building / fire / structure / MEP", status: "OPEN", note: "Detailed code, fire separation, structural, MEP, and energy design remain professional work." },
      { id: "permit", label: "Permit readiness", status: "OPEN", note: "Workbench promotion is not permit or construction approval." }
    ],
    trace: {
      sourceProject: run.project,
      sourceRevision: run.sourceRevision ?? candidate.freeze?.freezeHash ?? candidate.id,
      engineRevision: `${run.solver} / ${run.scoringVersion}`,
      generatedAt: new Date().toISOString()
    }
  };
}
