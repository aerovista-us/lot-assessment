import type { Point } from "@/packages/geometry";

export const CANDIDATE_SCHEMA_VERSION = "lotscope-candidate-registry-v1" as const;
export const EXPORT_SCHEMA_VERSION = "lotscope-package-v1" as const;

export type CandidateStatus =
  | "DRAFT"
  | "QUEUED_FOR_EVALUATION"
  | "EVALUATING"
  | "REJECTED"
  | "PARTIAL_FAIL"
  | "ACCEPTABLE_FOR_INTERVENTION"
  | "PASS"
  | "PROMOTION_READY"
  | "FROZEN"
  | "ARCHIVED";

export type EvidenceState = "CURRENT" | "STALE" | "REVALIDATION_REQUIRED" | "NONE";
export type GateStatus = "PASS" | "PASS_TIGHT" | "WATCH" | "FAIL" | "PROFESSIONAL_REVIEW";
export type CandidateSource = "AUTOMATION" | "STAFF_INTERVENTION" | "IMPORT" | "HISTORICAL";
export type CandidateComponentKind =
  | "parcel"
  | "envelope"
  | "home"
  | "garage"
  | "stall"
  | "opening"
  | "pavement"
  | "driveway"
  | "route"
  | "annotation";

export type ComponentBase = {
  id: string;
  kind: CandidateComponentKind;
  label: string;
  locked?: boolean;
  provenance?: string;
};

export type PolygonComponent = ComponentBase & {
  kind: "parcel" | "envelope" | "pavement";
  polygon: Point[];
};

export type PlacementComponent = ComponentBase & {
  kind: "home" | "garage";
  x: number;
  y: number;
  widthFt: number;
  depthFt: number;
  polygon?: Point[];
  rotationDeg?: number;
  movable?: boolean;
  resizable?: boolean;
  rotationLimitDeg?: number;
};

export type StallComponent = ComponentBase & {
  kind: "stall";
  garageId: string;
  axleX: number;
  axleY: number;
  headingDeg: number;
  vehicleId: string;
};

export type OpeningComponent = ComponentBase & {
  kind: "opening";
  ownerId: string;
  wall: "north" | "south" | "east" | "west";
  openingWidthFt: number;
  offsetFt: number;
};

export type PathComponent = ComponentBase & {
  kind: "driveway" | "route";
  garageId?: string;
  points: Point[];
  widthFt?: number;
  movableControlPoints?: number[];
};

export type AnnotationComponent = ComponentBase & {
  kind: "annotation";
  point?: Point;
  text: string;
};

export type CandidateComponent = PolygonComponent | PlacementComponent | StallComponent | OpeningComponent | PathComponent | AnnotationComponent;

export type GateEvaluation = {
  id: string;
  label: string;
  status: GateStatus;
  summary: string;
  blockerClass?: string;
  repairClasses?: string[];
  metrics?: Record<string, string | number | boolean | null>;
};

export type CandidateEvaluation = {
  id: string;
  candidateId: string;
  createdAt: string;
  engineVersion: string;
  rulesVersion: string;
  schemaVersion: string;
  status: "PASS" | "FAIL" | "PARTIAL_FAIL";
  promotionReady: boolean;
  score?: number;
  gates: GateEvaluation[];
  summary: string;
};

export type CandidateLineage = {
  parentCandidateId: string | null;
  rootCandidateId: string;
  relation: "ROOT" | "VARIANT" | "NEW_DESIGN" | "IMPORT_COPY";
  note?: string;
};

export type CandidateRecord = {
  schemaVersion: typeof CANDIDATE_SCHEMA_VERSION;
  id: string;
  projectId: string;
  lotId: string;
  designId: string;
  revisionLabel: string;
  label: string;
  family: string;
  topologyKey: string;
  source: CandidateSource;
  status: CandidateStatus;
  evidenceState: EvidenceState;
  classificationReason: string;
  components: CandidateComponent[];
  evaluationHistory: CandidateEvaluation[];
  currentEvaluationId: string | null;
  lineage: CandidateLineage;
  tags: string[];
  staffNotes: string[];
  createdAt: string;
  updatedAt: string;
};

export type LotRecord = {
  id: string;
  projectId: string;
  label: string;
  address?: string;
  jurisdiction?: string;
  frontage: string;
  parcel: Point[];
  rulesVersion: string;
  informationState: "CONFIRMED" | "MIXED" | "ASSUMED" | "UNKNOWN";
};

export type ProjectRecord = {
  id: string;
  label: string;
  status: "ACTIVE" | "HOLD" | "COMPLETE";
  lotIds: string[];
};

export type CheckpointRecord = {
  id: string;
  candidateId: string;
  label: string;
  createdAt: string;
  componentSnapshot: CandidateComponent[];
  currentEvaluationId: string | null;
};

export type CandidateRegistry = {
  schemaVersion: typeof CANDIDATE_SCHEMA_VERSION;
  projects: ProjectRecord[];
  lots: LotRecord[];
  candidates: CandidateRecord[];
  checkpoints: CheckpointRecord[];
};

export type LotScopePackage = {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  project: ProjectRecord;
  lot: LotRecord;
  candidate: CandidateRecord;
  checkpoints: CheckpointRecord[];
  historicalEvidenceOnly: boolean;
};

export function currentEvaluation(candidate: CandidateRecord) {
  if (!candidate.currentEvaluationId) return null;
  return candidate.evaluationHistory.find((item) => item.id === candidate.currentEvaluationId) ?? null;
}

export function markEvidenceStale(candidate: CandidateRecord, updatedAt = new Date().toISOString()): CandidateRecord {
  return { ...candidate, evidenceState: "STALE", status: "DRAFT", currentEvaluationId: null, updatedAt };
}

function clonePoint(point: Point): Point {
  return [point[0], point[1]];
}

export function cloneCandidateComponents(components: CandidateComponent[]): CandidateComponent[] {
  return components.map((component) => {
    if (component.kind === "parcel" || component.kind === "envelope" || component.kind === "pavement") {
      return { ...component, polygon: component.polygon.map(clonePoint) };
    }
    if (component.kind === "home" || component.kind === "garage") {
      return { ...component, polygon: component.polygon?.map(clonePoint) };
    }
    if (component.kind === "driveway" || component.kind === "route") {
      return { ...component, points: component.points.map(clonePoint), movableControlPoints: component.movableControlPoints ? [...component.movableControlPoints] : undefined };
    }
    if (component.kind === "annotation") {
      return { ...component, point: component.point ? clonePoint(component.point) : undefined };
    }
    return { ...component };
  });
}

export function branchCandidate(args: {
  parent: CandidateRecord;
  id: string;
  designId?: string;
  revisionLabel: string;
  label: string;
  relation: "VARIANT" | "NEW_DESIGN" | "IMPORT_COPY";
  createdAt?: string;
}): CandidateRecord {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const sameDesign = args.relation === "VARIANT";
  return {
    ...args.parent,
    id: args.id,
    designId: args.designId ?? (sameDesign ? args.parent.designId : args.id),
    revisionLabel: args.revisionLabel,
    label: args.label,
    source: args.relation === "IMPORT_COPY" ? "IMPORT" : "STAFF_INTERVENTION",
    status: "DRAFT",
    evidenceState: args.relation === "IMPORT_COPY" ? "REVALIDATION_REQUIRED" : "STALE",
    components: cloneCandidateComponents(args.parent.components),
    evaluationHistory: args.relation === "IMPORT_COPY" ? args.parent.evaluationHistory : [],
    currentEvaluationId: null,
    lineage: {
      parentCandidateId: args.parent.id,
      rootCandidateId: args.parent.lineage.rootCandidateId,
      relation: args.relation,
      note: args.relation === "NEW_DESIGN" ? "Topology-level branch from an earlier candidate." : undefined
    },
    staffNotes: [...args.parent.staffNotes],
    createdAt,
    updatedAt: createdAt
  };
}

export function classifyCandidate(evaluation: CandidateEvaluation): { status: CandidateStatus; reason: string } {
  if (evaluation.promotionReady) return { status: "PROMOTION_READY", reason: "All current promotion gates pass under the recorded engine and rules revisions." };
  if (evaluation.status === "PASS") return { status: "PASS", reason: "Current machine evaluation passes hard gates but is not yet promotion-ready." };

  const failures = evaluation.gates.filter((gate) => gate.status === "FAIL");
  const fundamental = failures.some((gate) => ["parcel", "program", "topology"].includes(gate.blockerClass ?? ""));
  const repairable = failures.some((gate) => (gate.repairClasses?.length ?? 0) > 0);
  const coreSound = ["parcel", "program"].every((blockerClass) =>
    evaluation.gates.some((gate) => gate.blockerClass === blockerClass && (gate.status === "PASS" || gate.status === "PASS_TIGHT" || gate.status === "WATCH"))
  );
  if (coreSound && !fundamental && repairable) {
    return { status: "ACCEPTABLE_FOR_INTERVENTION", reason: "Core parcel/program evidence is sound and the current blockers have explicit repair classes." };
  }
  if (evaluation.status === "PARTIAL_FAIL") {
    return { status: "PARTIAL_FAIL", reason: "The candidate retains useful passing evidence but is not currently classified for normal staff intervention." };
  }
  return { status: "REJECTED", reason: fundamental ? "A fundamental parcel, program, or topology blocker prevents normal intervention." : "Current failures do not yet have a bounded repair path." };
}

export function createExportPackage(registry: CandidateRegistry, candidateId: string, exportedAt = new Date().toISOString()): LotScopePackage | null {
  const candidate = registry.candidates.find((item) => item.id === candidateId);
  if (!candidate) return null;
  const project = registry.projects.find((item) => item.id === candidate.projectId);
  const lot = registry.lots.find((item) => item.id === candidate.lotId);
  if (!project || !lot) return null;
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    project,
    lot,
    candidate,
    checkpoints: registry.checkpoints.filter((item) => item.candidateId === candidateId),
    historicalEvidenceOnly: true
  };
}

export function importPackage(pkg: LotScopePackage, newId: string, createdAt = new Date().toISOString()): CandidateRecord {
  return branchCandidate({
    parent: pkg.candidate,
    id: newId,
    revisionLabel: `${pkg.candidate.revisionLabel} import`,
    label: `${pkg.candidate.label} · imported copy`,
    relation: "IMPORT_COPY",
    createdAt
  });
}
