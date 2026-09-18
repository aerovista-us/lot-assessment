import {
  EXPORT_SCHEMA_VERSION,
  branchCandidate,
  cloneCandidateComponents,
  createExportPackage,
  importPackage,
  markEvidenceStale,
  type CandidateRecord,
  type CandidateRegistry,
  type CheckpointRecord,
  type LotScopePackage
} from "@/packages/candidates";

export const WORKSPACE_SCHEMA_VERSION = "lotscope-workspace-v1" as const;

export type CandidateWorkspaceState = {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  updatedAt: string;
  candidates: CandidateRecord[];
  checkpoints: CheckpointRecord[];
};

export type ImportMode = "COPY" | "VARIANT" | "NEW_DESIGN";

export function emptyCandidateWorkspace(updatedAt = new Date().toISOString()): CandidateWorkspaceState {
  return { schemaVersion: WORKSPACE_SCHEMA_VERSION, updatedAt, candidates: [], checkpoints: [] };
}
function deepCloneEvaluationHistory(candidate: CandidateRecord): CandidateRecord["evaluationHistory"] {
  return candidate.evaluationHistory.map((evaluation) => ({
    ...evaluation,
    gates: evaluation.gates.map((gate) => ({
      ...gate,
      repairClasses: gate.repairClasses ? [...gate.repairClasses] : undefined,
      metrics: gate.metrics ? { ...gate.metrics } : undefined
    }))
  }));
}

export function cloneCandidateRecord(candidate: CandidateRecord): CandidateRecord {
  return {
    ...candidate,
    components: cloneCandidateComponents(candidate.components),
    evaluationHistory: deepCloneEvaluationHistory(candidate),
    tags: [...candidate.tags],
    staffNotes: [...candidate.staffNotes],
    lineage: { ...candidate.lineage }
  };
}

export function mergeCandidateRegistry(base: CandidateRegistry, workspace: CandidateWorkspaceState): CandidateRegistry {
  const localIds = new Set(workspace.candidates.map((candidate) => candidate.id));
  const checkpointIds = new Set(workspace.checkpoints.map((checkpoint) => checkpoint.id));
  return {
    ...base,
    candidates: [...base.candidates.filter((candidate) => !localIds.has(candidate.id)), ...workspace.candidates],
    checkpoints: [...base.checkpoints.filter((checkpoint) => !checkpointIds.has(checkpoint.id)), ...workspace.checkpoints]
  };
}

export function upsertWorkspaceCandidate(
  state: CandidateWorkspaceState,
  candidate: CandidateRecord,
  updatedAt = new Date().toISOString()
): CandidateWorkspaceState {
  const cloned = cloneCandidateRecord(candidate);
  const existing = state.candidates.findIndex((item) => item.id === candidate.id);
  const candidates = [...state.candidates];
  if (existing >= 0) candidates[existing] = cloned;
  else candidates.push(cloned);
  return { ...state, updatedAt, candidates };
}

function compactToken(iso: string) {
  return iso.replace(/[-:.TZ]/g, "").slice(0, 17);
}

function uniqueId(baseId: string, registry: CandidateRegistry) {
  if (!registry.candidates.some((candidate) => candidate.id === baseId)) return baseId;
  let serial = 2;
  while (registry.candidates.some((candidate) => candidate.id === `${baseId}-${serial}`)) serial += 1;
  return `${baseId}-${serial}`;
}
function nextDesignNumber(registry: CandidateRegistry) {
  let max = 0;
  for (const candidate of registry.candidates) {
    const match = candidate.designId.match(/design-(\d+)/i) ?? candidate.revisionLabel.match(/Design\s+(\d+)/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function nextVariantNumber(parent: CandidateRecord, registry: CandidateRegistry) {
  const siblings = registry.candidates.filter((candidate) =>
    candidate.designId === parent.designId && candidate.lineage.parentCandidateId === parent.id
  );
  return siblings.length + 1;
}

export function createWorkspaceCheckpoint(
  candidate: CandidateRecord,
  label?: string,
  createdAt = new Date().toISOString()
): CheckpointRecord {
  return {
    id: `cp-${candidate.id}-${compactToken(createdAt)}`,
    candidateId: candidate.id,
    label: label?.trim() || `${candidate.revisionLabel} checkpoint`,
    createdAt,
    componentSnapshot: cloneCandidateComponents(candidate.components),
    currentEvaluationId: candidate.currentEvaluationId
  };
}
export function addWorkspaceCheckpoint(
  state: CandidateWorkspaceState,
  checkpoint: CheckpointRecord,
  updatedAt = new Date().toISOString()
): CandidateWorkspaceState {
  const checkpoints = state.checkpoints.filter((item) => item.id !== checkpoint.id);
  checkpoints.push({
    ...checkpoint,
    componentSnapshot: cloneCandidateComponents(checkpoint.componentSnapshot)
  });
  return { ...state, updatedAt, checkpoints };
}

export function branchWorkspaceCandidate(args: {
  base: CandidateRegistry;
  state: CandidateWorkspaceState;
  parentId: string;
  relation: "VARIANT" | "NEW_DESIGN";
  createdAt?: string;
}): { state: CandidateWorkspaceState; candidate: CandidateRecord } {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const registry = mergeCandidateRegistry(args.base, args.state);
  const parent = registry.candidates.find((candidate) => candidate.id === args.parentId);
  if (!parent) throw new Error("Parent candidate not found.");

  if (args.relation === "VARIANT") {
    const serial = nextVariantNumber(parent, registry);
    const id = uniqueId(`${parent.id}-variant-${serial}`, registry);
    const candidate = branchCandidate({
      parent,
      id,
      revisionLabel: `${parent.revisionLabel}.${serial}`,
      label: `${parent.label} · variant ${serial}`,
      relation: "VARIANT",
      createdAt
    });
    candidate.classificationReason = "Staff variant branch. Prior machine evidence is stale until this exact geometry is re-evaluated.";
    candidate.tags = [...new Set([...candidate.tags, "staff-variant", "requires-revalidation"])];
    return { state: upsertWorkspaceCandidate(args.state, candidate, createdAt), candidate };
  }

  const designNumber = nextDesignNumber(registry);
  const designId = `design-${designNumber}`;
  const id = uniqueId(`pondy-d${designNumber}-${compactToken(createdAt)}`, registry);
  const candidate = branchCandidate({
    parent,
    id,
    designId,
    revisionLabel: `Design ${designNumber}`,
    label: `Design ${designNumber} · new topology draft`,
    relation: "NEW_DESIGN",
    createdAt
  });
  candidate.topologyKey = `draft-new-topology:${designId}`;
  candidate.classificationReason = "New design branch. Topology and all machine evidence require revalidation before any PASS can apply.";
  candidate.tags = [...new Set([...candidate.tags, "new-design", "topology-pending", "requires-revalidation"])];
  return { state: upsertWorkspaceCandidate(args.state, candidate, createdAt), candidate };
}
export function createWorkspaceExportPackage(
  base: CandidateRegistry,
  state: CandidateWorkspaceState,
  candidateId: string,
  exportedAt = new Date().toISOString()
) {
  return createExportPackage(mergeCandidateRegistry(base, state), candidateId, exportedAt);
}

export function isLotScopePackage(value: unknown): value is LotScopePackage {
  if (!value || typeof value !== "object") return false;
  const pkg = value as Partial<LotScopePackage>;
  return pkg.schemaVersion === EXPORT_SCHEMA_VERSION &&
    Boolean(pkg.project?.id && pkg.lot?.id && pkg.candidate?.id) &&
    Array.isArray(pkg.candidate?.components) &&
    Array.isArray(pkg.candidate?.evaluationHistory) &&
    Array.isArray(pkg.checkpoints);
}

function importedCheckpoints(pkg: LotScopePackage, candidateId: string, token: string) {
  return pkg.checkpoints.map((checkpoint, index): CheckpointRecord => ({
    ...checkpoint,
    id: `cp-${candidateId}-import-${token}-${index + 1}`,
    candidateId,
    label: `${checkpoint.label} · imported`,
    componentSnapshot: cloneCandidateComponents(checkpoint.componentSnapshot),
    currentEvaluationId: checkpoint.currentEvaluationId
  }));
}
export function importWorkspacePackage(args: {
  base: CandidateRegistry;
  state: CandidateWorkspaceState;
  pkg: LotScopePackage;
  mode?: ImportMode;
  createdAt?: string;
}): { state: CandidateWorkspaceState; candidate: CandidateRecord } {
  const createdAt = args.createdAt ?? new Date().toISOString();
  const mode = args.mode ?? "COPY";
  const registry = mergeCandidateRegistry(args.base, args.state);
  if (args.pkg.project.id !== args.base.projects[0]?.id || args.pkg.lot.id !== args.base.lots[0]?.id) {
    throw new Error("This package belongs to a different project or lot.");
  }
  const token = compactToken(createdAt);
  const id = uniqueId(`${args.pkg.candidate.id}-import-${token}`, registry);
  let candidate = importPackage(args.pkg, id, createdAt);
  if (mode === "VARIANT") {
    candidate = { ...candidate, designId: args.pkg.candidate.designId, lineage: { ...candidate.lineage, relation: "VARIANT" } };
  }
  if (mode === "NEW_DESIGN") {
    const designNumber = nextDesignNumber(registry);
    candidate = {
      ...candidate,
      designId: `design-${designNumber}`,
      revisionLabel: `Design ${designNumber}`,
      label: `Design ${designNumber} · imported new design`,
      topologyKey: `draft-new-topology:design-${designNumber}`,
      lineage: { ...candidate.lineage, relation: "NEW_DESIGN" }
    };
  }
  candidate = {
    ...candidate,
    source: "IMPORT",
    status: "DRAFT",
    evidenceState: "REVALIDATION_REQUIRED",
    currentEvaluationId: null,
    evaluationHistory: deepCloneEvaluationHistory(args.pkg.candidate),
    classificationReason: "Imported historical evidence is preserved for context but is not current. Re-run the active pipeline before promotion.",
    tags: [...new Set([...candidate.tags, "imported", "requires-revalidation"])],
    staffNotes: [...candidate.staffNotes, `Imported from ${args.pkg.candidate.id} using ${mode.toLowerCase()} mode.`]
  };
  const candidateState = upsertWorkspaceCandidate(args.state, candidate, createdAt);
  const imported = importedCheckpoints(args.pkg, candidate.id, token);
  const checkpointIds = new Set(imported.map((checkpoint) => checkpoint.id));
  const checkpoints = [
    ...candidateState.checkpoints.filter((checkpoint) => !checkpointIds.has(checkpoint.id)),
    ...imported
  ];
  return { state: { ...candidateState, checkpoints, updatedAt: createdAt }, candidate };
}

export function restoreWorkspaceCheckpoint(args: {
  base: CandidateRegistry;
  state: CandidateWorkspaceState;
  candidateId: string;
  checkpointId: string;
  restoredAt?: string;
}): { state: CandidateWorkspaceState; candidate: CandidateRecord } {
  const restoredAt = args.restoredAt ?? new Date().toISOString();
  const registry = mergeCandidateRegistry(args.base, args.state);
  const candidate = registry.candidates.find((item) => item.id === args.candidateId);
  const checkpoint = registry.checkpoints.find((item) => item.id === args.checkpointId && item.candidateId === args.candidateId);
  if (!candidate) throw new Error("Candidate not found.");
  if (!checkpoint) throw new Error("Checkpoint not found for this candidate.");
  const restored = markEvidenceStale({
    ...cloneCandidateRecord(candidate),
    components: cloneCandidateComponents(checkpoint.componentSnapshot),
    classificationReason: "Checkpoint geometry restored. Historical evidence remains available, but this restored working state requires revalidation before promotion.",
    staffNotes: [...candidate.staffNotes, `Restored checkpoint ${checkpoint.label}.`]
  }, restoredAt);
  return { state: upsertWorkspaceCandidate(args.state, restored, restoredAt), candidate: restored };
}

export type CandidateDifference = {
  added: string[];
  removed: string[];
  changed: string[];
};

export function compareCandidateComponents(left: CandidateRecord, right: CandidateRecord): CandidateDifference {
  const leftMap = new Map(left.components.map((component) => [component.id, component]));
  const rightMap = new Map(right.components.map((component) => [component.id, component]));
  const added = [...rightMap.keys()].filter((id) => !leftMap.has(id));
  const removed = [...leftMap.keys()].filter((id) => !rightMap.has(id));
  const changed = [...leftMap.keys()].filter((id) => {
    const rightComponent = rightMap.get(id);
    return rightComponent ? JSON.stringify(leftMap.get(id)) !== JSON.stringify(rightComponent) : false;
  });
  return { added, removed, changed };
}
