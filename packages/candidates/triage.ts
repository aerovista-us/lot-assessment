import { polygonInside, type Point } from "@/packages/geometry";
import { placementPolygon, type AxisAlignedPlacement, type DrivePath } from "@/packages/placement";
import {
  CANDIDATE_SCHEMA_VERSION,
  classifyCandidate,
  type CandidateComponent,
  type CandidateEvaluation,
  type CandidateRecord,
  type CandidateStatus
} from "@/packages/candidates";

export type RankedSearchCandidate = {
  id: string;
  family: string;
  conceptGroup?: string;
  combinedPass: boolean;
  promotionReady: boolean;
  physicalPass: boolean;
  principalHomeContainmentPass?: boolean;
  placementEvaluation?: {
    containmentPass: boolean;
    overlapPass: boolean;
    separationPass: boolean;
    circulationPass: boolean;
  };
  programPass: boolean;
  combinedScore: number;
  physicalIssues: string[];
  placements: AxisAlignedPlacement[];
  drives: DrivePath[];
  minimumClearanceFt: number | null;
  promotionBoundaryClearanceFt?: number | null;
  promotionChecks?: {
    clearanceReady?: boolean;
    capacityReady?: boolean;
    mobilityReady?: boolean;
    minimumClearanceFt?: number;
    requiredNetLivingCapacitySqFt?: number;
  };
  mobilityAudit?: {
    pass: boolean;
    promotionReady: boolean;
    status: "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL";
    warnings?: string[];
    failures?: string[];
  };
  program?: {
    pass: boolean;
    qualityScore?: number;
    reasons?: string[];
  };
  metadata?: Record<string, string | number | boolean>;
};

export type RankedSearchPayload = {
  project: string;
  solver: string;
  scoringVersion: string;
  searchProfile?: string;
  elapsedMs?: number;
  evaluatedCount: number;
  promotionReadyCount: number;
  combinedPassCount: number;
  results: RankedSearchCandidate[];
};
export type TriageBucket = "RECOMMENDED" | "INTERVENTION" | "HISTORY";

export type TriagedCandidate = {
  bucket: TriageBucket;
  rank: number;
  conceptKey: string;
  candidate: CandidateRecord;
};

export type CandidateTriageResult = {
  schemaVersion: "lotscope-candidate-triage-v1";
  generatedAt: string;
  source: {
    solver: string;
    scoringVersion: string;
    searchProfile?: string;
    elapsedMs?: number;
    evaluatedCount: number;
    combinedPassCount: number;
    promotionReadyCount: number;
  };
  counts: Record<TriageBucket, number>;
  representatives: TriagedCandidate[];
};

type TriageContext = {
  projectId: string;
  lotId: string;
  parcel: Point[];
  principalEnvelope: Point[];
  rulesVersion: string;
  generatedAt?: string;
};
function placementComponents(result: RankedSearchCandidate): CandidateComponent[] {
  const placements: CandidateComponent[] = [];
  for (const item of result.placements) {
    if (item.kind !== "home" && item.kind !== "garage") continue;
    placements.push({
      id: item.id,
      kind: item.kind,
      label: item.id,
      x: item.x,
      y: item.y,
      widthFt: item.widthFt,
      depthFt: item.depthFt,
      rotationDeg: item.rotationDeg,
      movable: item.movable,
      resizable: item.kind === "home",
      rotationLimitDeg: item.rotationLimitDeg
    });
  }
  const drives = result.drives.map((drive): CandidateComponent => ({
    id: drive.id,
    kind: "driveway",
    label: drive.id,
    garageId: drive.garageId,
    points: drive.points,
    movableControlPoints: drive.movableControlPoints
  }));
  return [...placements, ...drives];
}

function issueText(result: RankedSearchCandidate) {
  return result.physicalIssues.join(" ").toLowerCase();
}
function evaluationFor(result: RankedSearchCandidate, context: TriageContext): CandidateEvaluation {
  const issues = issueText(result);
  const parcelFail = result.placements.some((item) => !polygonInside(placementPolygon(item), context.parcel, 0.08));
  const buildableFail = (result.placementEvaluation ? !result.placementEvaluation.containmentPass : issues.includes("outside buildable envelope")) || result.principalHomeContainmentPass === false;
  const structureFail = result.placementEvaluation ? !(result.placementEvaluation.overlapPass && result.placementEvaluation.separationPass) : (issues.includes("overlap") || issues.includes("separation"));
  const mobilityStatus = result.mobilityAudit?.status ?? (result.physicalPass ? "PASS" : "FAIL");
  const mobilityGateStatus = mobilityStatus === "PASS" ? "PASS" : mobilityStatus;
  const gates: CandidateEvaluation["gates"] = [
    {
      id: "parcel",
      label: "Parcel containment",
      status: parcelFail ? "FAIL" : "PASS",
      summary: parcelFail ? "Solver evidence reports a true parcel-containment failure." : "No true parcel-containment failure is reported by the ranked solver.",
      blockerClass: "parcel"
    },
    {
      id: "buildable-fit",
      label: "Buildable-envelope fit",
      status: buildableFail ? "FAIL" : "PASS",
      summary: buildableFail ? "One or more placements remain outside the active buildable envelope." : "Placements pass the active buildable-envelope containment check.",
      blockerClass: "geometry",
      repairClasses: buildableFail ? ["translate-building", "translate-garage", "reproportion-building"] : undefined
    },
    {
      id: "structure",
      label: "Structure overlap / separation",
      status: structureFail ? "FAIL" : "PASS",
      summary: structureFail ? "Ranked search reports a structure overlap or minimum-separation conflict." : "Modeled overlap and structure-separation checks pass.",
      blockerClass: "geometry",
      repairClasses: structureFail ? ["translate-building", "translate-garage", "reproportion-building"] : undefined
    },
    {
      id: "program",
      label: "Program fit",
      status: result.programPass ? "PASS" : "FAIL",
      summary: result.programPass ? "Program evaluation passes." : (result.program?.reasons?.[0] ?? "Program evaluation fails."),
      blockerClass: "program"
    },
    {
      id: "mobility",
      label: "Vehicle circulation",
      status: mobilityGateStatus,
      summary: result.mobilityAudit?.failures?.[0] ?? result.mobilityAudit?.warnings?.[0] ?? `Mobility audit is ${mobilityStatus}.`,
      blockerClass: "circulation",
      repairClasses: mobilityStatus === "PASS" ? undefined : ["reshape-drive", "local-pavement-flare", "translate-garage", "reproportion-building"]
    }
  ];
  if (result.promotionChecks) {
    gates.push({
      id: "promotion-clearance",
      label: "Promotion boundary clearance",
      status: result.promotionChecks.clearanceReady ? "PASS" : "WATCH",
      summary: result.promotionChecks.clearanceReady
        ? "Promotion boundary-clearance target is met."
        : `Boundary clearance remains below the promotion target${result.promotionBoundaryClearanceFt == null ? "." : ` at ${result.promotionBoundaryClearanceFt.toFixed(2)} ft.`}`,
      blockerClass: "clearance",
      repairClasses: result.promotionChecks.clearanceReady ? undefined : ["reshape-drive", "translate-building", "translate-garage"]
    });
    gates.push({
      id: "promotion-capacity",
      label: "Promotion living-capacity reserve",
      status: result.promotionChecks.capacityReady ? "PASS" : "WATCH",
      summary: result.promotionChecks.capacityReady
        ? "Required promotion living-capacity reserve is met."
        : "Program passes screening but the preferred promotion-capacity reserve is not yet met.",
      blockerClass: "capacity",
      repairClasses: result.promotionChecks.capacityReady ? undefined : ["reproportion-building"]
    });
  }
  const status: CandidateEvaluation["status"] = result.combinedPass ? "PASS" : (result.programPass || result.physicalPass ? "PARTIAL_FAIL" : "FAIL");
  return {
    id: `eval-${result.id}-triage`,
    candidateId: `auto-${result.id}`,
    createdAt: context.generatedAt ?? new Date().toISOString(),
    engineVersion: "lotscope-candidate-triage-v1",
    rulesVersion: context.rulesVersion,
    schemaVersion: "lotscope-candidate-triage-v1",
    status,
    promotionReady: result.promotionReady,
    score: result.combinedScore,
    gates,
    summary: result.promotionReady
      ? "Ranked search reports this candidate as promotion-ready."
      : result.combinedPass
        ? "Ranked search passes hard screening gates but promotion checks remain."
        : "Ranked search retains useful evidence but one or more hard screening gates remain open."
  };
}

function bucketFor(status: CandidateStatus): TriageBucket {
  if (status === "PASS" || status === "PROMOTION_READY" || status === "FROZEN") return "RECOMMENDED";
  if (status === "ACCEPTABLE_FOR_INTERVENTION") return "INTERVENTION";
  return "HISTORY";
}

function conceptKey(result: RankedSearchCandidate) {
  return result.conceptGroup || result.family;
}

function resultPriority(result: RankedSearchCandidate) {
  return Number(result.promotionReady) * 1_000_000 + Number(result.combinedPass) * 100_000 + Number(result.programPass) * 10_000 + result.combinedScore;
}
function toCandidate(result: RankedSearchCandidate, context: TriageContext, rank: number): CandidateRecord {
  const evaluation = evaluationFor(result, context);
  const classification = classifyCandidate(evaluation);
  const localHardFailures = evaluation.gates.filter((gate) => gate.status === "FAIL" && !["parcel", "program", "topology"].includes(gate.blockerClass ?? "")).length;
  const interventionThresholdMet = (evaluation.score ?? Number.NEGATIVE_INFINITY) >= 0 && localHardFailures <= 2;
  const triageStatus = classification.status === "ACCEPTABLE_FOR_INTERVENTION" && !interventionThresholdMet ? "PARTIAL_FAIL" : classification.status;
  const triageReason = classification.status === "ACCEPTABLE_FOR_INTERVENTION" && !interventionThresholdMet
    ? "Repair classes exist, but this result falls below the v1 intervention threshold; preserve it as searchable history instead of normal staff work."
    : classification.reason;
  const createdAt = context.generatedAt ?? new Date().toISOString();
  const concept = conceptKey(result);
  return {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    id: `auto-${result.id}`,
    projectId: context.projectId,
    lotId: context.lotId,
    designId: `auto-${concept.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    revisionLabel: `Auto ${rank}`,
    label: `${result.family} · ranked exploration`,
    family: result.family,
    topologyKey: concept,
    source: "AUTOMATION",
    status: triageStatus,
    evidenceState: "CURRENT",
    classificationReason: triageReason,
    components: [
      { id: "parcel", kind: "parcel", label: "Lot survey", polygon: context.parcel, locked: true, provenance: "Pondy lot record" },
      { id: "principal-envelope", kind: "envelope", label: "Principal buildable envelope", polygon: context.principalEnvelope, locked: true, provenance: context.rulesVersion },
      ...placementComponents(result)
    ],
    evaluationHistory: [evaluation],
    currentEvaluationId: evaluation.id,
    lineage: { parentCandidateId: null, rootCandidateId: `auto-${result.id}`, relation: "ROOT", note: "Generated by broad Workbench exploration." },
    tags: ["automation", "ranked-search", result.family, triageStatus.toLowerCase()],
    staffNotes: ["Automation-generated candidate. Machine evaluation owns status; staff may branch only after review."],
    createdAt,
    updatedAt: createdAt
  };
}

export function triageRankedSearch(payload: RankedSearchPayload, context: TriageContext): CandidateTriageResult {
  const generatedAt = context.generatedAt ?? new Date().toISOString();
  const ranked = [...payload.results].sort((a, b) => resultPriority(b) - resultPriority(a));
  const representatives: TriagedCandidate[] = [];
  const seenConcepts = new Set<string>();

  for (const result of ranked) {
    const key = conceptKey(result);
    if (seenConcepts.has(key)) continue;
    seenConcepts.add(key);
    const candidate = toCandidate(result, { ...context, generatedAt }, representatives.length + 1);
    representatives.push({ bucket: bucketFor(candidate.status), rank: representatives.length + 1, conceptKey: key, candidate });
  }

  const caps: Record<TriageBucket, number> = { RECOMMENDED: 5, INTERVENTION: 8, HISTORY: 6 };
  const counts: Record<TriageBucket, number> = { RECOMMENDED: 0, INTERVENTION: 0, HISTORY: 0 };
  const capped = representatives.filter((item) => {
    if (counts[item.bucket] >= caps[item.bucket]) return false;
    counts[item.bucket] += 1;
    return true;
  }).slice(0, 15);
  const finalCounts: Record<TriageBucket, number> = { RECOMMENDED: 0, INTERVENTION: 0, HISTORY: 0 };
  for (const item of capped) finalCounts[item.bucket] += 1;

  return {
    schemaVersion: "lotscope-candidate-triage-v1",
    generatedAt,
    source: {
      solver: payload.solver,
      scoringVersion: payload.scoringVersion,
      searchProfile: payload.searchProfile,
      elapsedMs: payload.elapsedMs,
      evaluatedCount: payload.evaluatedCount,
      combinedPassCount: payload.combinedPassCount,
      promotionReadyCount: payload.promotionReadyCount
    },
    counts: finalCounts,
    representatives: capped
  };
}
