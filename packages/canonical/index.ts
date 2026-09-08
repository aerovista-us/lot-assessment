import { createHash } from "node:crypto";
import type { DrivePath, PlacementCandidate } from "@/packages/placement";

export const CANONICAL_CANDIDATE_SCHEMA = "lotscope-candidate-v1" as const;
export const CANONICAL_HASH_ALGORITHM = "sha256" as const;

export type CanonicalPlacement = {
  id: string;
  kind: PlacementCandidate["placements"][number]["kind"];
  x: number;
  y: number;
  widthFt: number;
  depthFt: number;
  movable: boolean;
  movementLimitFt?: number;
  integrationGroupId?: string;
  circulationObstacle?: boolean;
};

export type CanonicalDrive = {
  id: string;
  garageId?: string;
  points: Array<[number, number]>;
  movableControlPoints?: number[];
  controlPointLimitFt?: number;
};

export type CanonicalCandidateV1 = {
  schemaVersion: typeof CANONICAL_CANDIDATE_SCHEMA;
  project: {
    id: string;
    revision: string;
  };
  scenarioId: string;
  solverVersion: string;
  scoringVersion: string;
  candidate: {
    id: string;
    family: string;
    placements: CanonicalPlacement[];
    drives: CanonicalDrive[];
    metadata: Record<string, string | number | boolean>;
  };
};

export type FrozenCandidate = {
  hashAlgorithm: typeof CANONICAL_HASH_ALGORITHM;
  freezeHash: string;
  canonical: CanonicalCandidateV1;
};

export type FreezeCandidateInput = {
  projectId: string;
  projectRevision: string;
  scenarioId: string;
  solverVersion: string;
  scoringVersion: string;
  candidate: PlacementCandidate;
};

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function rounded(value: number) {
  const checked = finite(value, "geometry value");
  return Math.round((checked + Number.EPSILON) * 10000) / 10000;
}

function canonicalMetadata(metadata: PlacementCandidate["metadata"] = {}) {
  return Object.fromEntries(
    Object.entries(metadata)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, typeof value === "number" ? rounded(value) : value])
  ) as Record<string, string | number | boolean>;
}

function canonicalPlacements(candidate: PlacementCandidate): CanonicalPlacement[] {
  return candidate.placements
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      x: rounded(item.x),
      y: rounded(item.y),
      widthFt: rounded(item.widthFt),
      depthFt: rounded(item.depthFt),
      movable: item.movable,
      ...(item.movementLimitFt == null ? {} : { movementLimitFt: rounded(item.movementLimitFt) }),
      ...(item.integrationGroupId == null ? {} : { integrationGroupId: item.integrationGroupId }),
      ...(item.circulationObstacle == null ? {} : { circulationObstacle: item.circulationObstacle })
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalDrive(drive: DrivePath): CanonicalDrive {
  return {
    id: drive.id,
    ...(drive.garageId == null ? {} : { garageId: drive.garageId }),
    points: drive.points.map(([x, y]) => [rounded(x), rounded(y)] as [number, number]),
    ...(drive.movableControlPoints == null
      ? {}
      : { movableControlPoints: [...drive.movableControlPoints].sort((a, b) => a - b) }),
    ...(drive.controlPointLimitFt == null ? {} : { controlPointLimitFt: rounded(drive.controlPointLimitFt) })
  };
}

export function canonicalizeCandidate(input: FreezeCandidateInput): CanonicalCandidateV1 {
  if (!input.projectId || !input.projectRevision || !input.scenarioId || !input.solverVersion || !input.scoringVersion) {
    throw new Error("freeze context is incomplete");
  }
  if (!input.candidate.id || !input.candidate.family) throw new Error("candidate identity is incomplete");

  return {
    schemaVersion: CANONICAL_CANDIDATE_SCHEMA,
    project: { id: input.projectId, revision: input.projectRevision },
    scenarioId: input.scenarioId,
    solverVersion: input.solverVersion,
    scoringVersion: input.scoringVersion,
    candidate: {
      id: input.candidate.id,
      family: input.candidate.family,
      placements: canonicalPlacements(input.candidate),
      drives: input.candidate.drives.map(canonicalDrive).sort((a, b) => a.id.localeCompare(b.id)),
      metadata: canonicalMetadata(input.candidate.metadata)
    }
  };
}

export function freezeHash(canonical: CanonicalCandidateV1) {
  return createHash(CANONICAL_HASH_ALGORITHM).update(JSON.stringify(canonical)).digest("hex");
}

export function freezeCandidate(input: FreezeCandidateInput): FrozenCandidate {
  const canonical = canonicalizeCandidate(input);
  return {
    hashAlgorithm: CANONICAL_HASH_ALGORITHM,
    freezeHash: freezeHash(canonical),
    canonical
  };
}

export function verifyFrozenCandidate(frozen: FrozenCandidate) {
  return frozen.hashAlgorithm === CANONICAL_HASH_ALGORITHM && frozen.freezeHash === freezeHash(frozen.canonical);
}
