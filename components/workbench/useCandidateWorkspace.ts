"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CandidateRecord, CandidateRegistry, LotScopePackage } from "@/packages/candidates";
import {
  addWorkspaceCheckpoint,
  branchWorkspaceCandidate,
  createWorkspaceCheckpoint,
  emptyCandidateWorkspace,
  importWorkspacePackage,
  mergeCandidateRegistry,
  restoreWorkspaceCheckpoint,
  upsertWorkspaceCandidate,
  saveWorkspaceDesignDocument,
  type CandidateWorkspaceState,
  type ImportMode
} from "@/packages/candidates/workspace";
import { readBrowserWorkspace, persistBrowserWorkspace } from "@/packages/candidates/browser-workspace";

const CHANGE_EVENT = "lotscope-candidate-workspace-change";

function readWorkspace(): CandidateWorkspaceState {
  if (typeof window === "undefined") return emptyCandidateWorkspace();
  return readBrowserWorkspace(window.localStorage);
}

export function useCandidateWorkspace(base: CandidateRegistry) {
  const [workspace, setWorkspace] = useState<CandidateWorkspaceState>(() => emptyCandidateWorkspace());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const refreshWorkspace = useCallback(() => {
    try {
      setWorkspace(readWorkspace());
      setStorageError(null);
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : "Could not read this browser's saved workspace.");
    }
  }, []);

  useEffect(() => {
    const refresh = refreshWorkspace;
    refresh();
    setReady(true);
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [refreshWorkspace]);

  const registry = useMemo(() => mergeCandidateRegistry(base, workspace), [base, workspace]);

  const commit = useCallback((next: CandidateWorkspaceState) => {
    try {
      persistBrowserWorkspace(window.localStorage, next);
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : "Could not confirm the save.");
      throw cause;
    }
    setWorkspace(next);
    setStorageError(null);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);
  const saveCandidate = useCallback((candidate: CandidateRecord) => {
    const next = upsertWorkspaceCandidate(readWorkspace(), candidate);
    commit(next);
    return candidate;
  }, [commit]);

  const saveDesignDocument = useCallback((candidate:CandidateRecord,document:import("@/packages/candidates/design-document").DesignDocument)=>{
    const next=saveWorkspaceDesignDocument(readWorkspace(),candidate,document);
    commit(next);return document;
  },[commit]);

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
    storageError,
    retryStorage: refreshWorkspace,
    workspace,
    registry,
    saveCandidate,
    saveDesignDocument,
    checkpointCandidate,
    branchCandidate,
    importCandidatePackage,
    restoreCheckpoint,
    isLocalCandidate
  };
}
