import { emptyCandidateWorkspace, WORKSPACE_SCHEMA_VERSION, type CandidateWorkspaceState } from "@/packages/candidates/workspace";

export const WORKSPACE_STORAGE_KEY = "lotscope:pondy-lot2:candidate-workspace:v1";

type WorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

/** Never replace unreadable customer data with an empty workspace. */
export function readBrowserWorkspace(storage: Pick<WorkspaceStorage, "getItem">): CandidateWorkspaceState {
  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    throw new Error("Browser storage is unavailable. Allow site storage, then retry before editing or reporting.");
  }
  if (raw === null) return emptyCandidateWorkspace();
  let parsed: CandidateWorkspaceState;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Saved workspace data could not be read. Existing data has been kept; recover your exported package before making changes.");
  }
  if (!parsed || parsed.schemaVersion !== WORKSPACE_SCHEMA_VERSION ||
      !Array.isArray(parsed.candidates) || !Array.isArray(parsed.checkpoints) ||
      (parsed.designDocuments !== undefined && !Array.isArray(parsed.designDocuments))) {
    throw new Error("Saved workspace format is unsupported. Existing data has been kept; use a compatible exported package to recover it.");
  }
  return parsed;
}

export function persistBrowserWorkspace(storage: WorkspaceStorage, state: CandidateWorkspaceState): void {
  const serialized = JSON.stringify(state);
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, serialized);
    if (storage.getItem(WORKSPACE_STORAGE_KEY) !== serialized) throw new Error("Read-back mismatch");
  } catch {
    throw new Error("Save could not be confirmed in this browser. Check site storage permissions or available space, then retry before closing the page.");
  }
}
