declare module "@/lib/project-import-contract.mjs" {
  export type ImportArtifact = {
    id: string; type: string; title: string; path: string;
    visibility: "internal" | "customer-review";
    evidenceState: "SOURCE_ONLY" | "REVIEW_REQUIRED" | "WITHHELD";
  };
  export type ImportPlan = {
    projectId: string; sourceRepository: string; sourceRevision: string;
    fingerprint: string; artifactCount: number;
    artifacts: (ImportArtifact & { sourceRef: string; importState: string; reportRelease: string })[];
    nextStep: string; mutationAllowed: false; automaticPublication: false;
  };
  export type ImportPreflight = { ok: boolean; errors: string[]; plan: ImportPlan | null };
  export function prepareProjectImport(manifest: unknown): ImportPreflight;
  export function compareImportPlans(current: ImportPreflight, incoming: ImportPreflight): { action: "BLOCK" | "NOOP" | "REVIEW_REQUIRED"; reason: string };
}
declare module "@/lib/project-import-source-verifier.mjs" {
  import type { ImportPlan } from "@/lib/project-import-contract.mjs";
  export const MAX_MANIFEST_BYTES: number;
  export type VerifiedSourceArtifact = ImportPlan["artifacts"][number] & {
    verified: boolean; fileSha: string | null; sourceStatus: string;
  };
  export type VerifiedImportPlan = Omit<ImportPlan, "artifacts"> & {
    artifacts: VerifiedSourceArtifact[];
    allSourcesVerified: boolean;
    approvalState: "NOT_REQUESTED";
    importState: "NOT_PERSISTED";
    reportRelease: "WITHHELD";
  };
  export function verifyProjectImportSources(manifest: unknown): Promise<{
    ok: boolean; code: string; errors: string[]; plan: VerifiedImportPlan | null;
  }>;
}
