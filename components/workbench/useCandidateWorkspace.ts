"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CandidateRecord, CandidateRegistry, LotScopePackage } from "@/packages/candidates";
import {
  WORKSPACE_SCHEMA_VERSION,
  addWorkspaceCheckpoint,
  branchWorkspaceCandidate,
  createWorkspaceCheckpoint,
  emptyCandidateWorkspace,
  importWorkspacePackage,
  mergeCandidateRegistry,
  restoreWorkspaceCheckpoint,
  upsertWorkspaceCandidate,
  type CandidateWorkspaceState,
  type ImportMode
} from "@/packages/candidates/workspace";

const STORAGE_KEY = "lotscope:pondy-lot2:candidate-workspace:v1";
const CHANGE_EVENT = "lotscope-candidate-workspace-change";

function readWorkspace(): CandidateWorkspaceState {
  if (typeof window === "undefined") return emptyCandidateWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCandidateWorkspace();
    const parsed = JSON.parse(raw) as CandidateWorkspaceState;
    if (parsed.schemaVersion !== WORKSPACE_SCHEMA_VERSION) return emptyCandidateWorkspace();
    if (!Array.isArray(parsed.candidates) || !Array.isArray(parsed.checkpoints)) return emptyCandidateWorkspace();
    return parsed;
  } catch {
    return emptyCandidateWorkspace();
  }
}

function persistWorkspace(state: CandidateWorkspaceState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useCandidateWorkspace(base: CandidateRegistry) {
  const [workspace, setWorkspace] = useState<CandidateWorkspaceState>(() => emptyCandidateWorkspace());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setWorkspace(readWorkspace());
    refresh();
    setReady(true);
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const registry = useMemo(() => mergeCandidateRegistry(base, workspace), [base, workspace]);

  const commit = useCallback((next: CandidateWorkspaceState) => {
    setWorkspace(next);
    persistWorkspace(next);
  }, []);
  const saveCandidate = useCallback((candidate: CandidateRecord) => {
    const next = upsertWorkspaceCandidate(readWorkspace(), candidate);
    commit(next);
    return candidate;
  }, [commit]);

  const checkpointCandidate = useCallback((candidateId: string, label?: string) => {
    const current = readWorkspace();
    const merged = mergeCandidateRegistry(base, current);
    const candidate = merged.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    const checkpoint = createWorkspaceCheckpoint(candidate, label);
    const next = addWorkspaceCheckpoint(current, checkpoint);
    commit(next);
    return checkpoint;
  }, [base, commit]);

  const branchCandidate = useCallback((candidateId: string, relation: "VARIANT" | "NEW_DESIGN") => {
    const current = readWorkspace();
    const result = branchWorkspaceCandidate({ base, state: current, parentId: candidateId, relation });
    commit(result.state);
    return result.candidate;
  }, [base, commit]);

  const importCandidatePackage = useCallback((pkg: LotScopePackage, mode: ImportMode = "COPY") => {
    const current = readWorkspace();
    const result = importWorkspacePackage({ base, state: current, pkg, mode });
    commit(result.state);
    return result.candidate;
  }, [base, commit]);
  const restoreCheckpoint = useCallback((candidateId: string, checkpointId: string) => {
    const current = readWorkspace();
    const result = restoreWorkspaceCheckpoint({ base, state: current, candidateId, checkpointId });
    commit(result.state);
    return result.candidate;
  }, [base, commit]);

  const isLocalCandidate = useCallback((candidateId: string) =>
    workspace.candidates.some((candidate) => candidate.id === candidateId), [workspace.candidates]);

  return {
    ready,
    workspace,
    registry,
    saveCandidate,
    checkpointCandidate,
    branchCandidate,
    importCandidatePackage,
    restoreCheckpoint,
    isLocalCandidate
  };
}
