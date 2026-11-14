import { prepareProjectImport } from "./project-import-contract.mjs";

export const MAX_MANIFEST_BYTES = 128 * 1024;

export async function verifyProjectImportSources(manifest, options = {}) {
  const preflight = prepareProjectImport(manifest);
  if (!preflight.ok) return { ok: false, code: "INVALID_MANIFEST", errors: preflight.errors, plan: null };
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxArtifacts = options.maxArtifacts ?? 40;
  if (preflight.plan.artifactCount > maxArtifacts) {
    return { ok: false, code: "TOO_MANY_ARTIFACTS", errors: ["Artifact count exceeds verification limit"], plan: null };
  }
  const artifacts = [];
  for (const artifact of preflight.plan.artifacts) {
    const path = artifact.path.split("/").map(encodeURIComponent).join("/");
    const url = `https://api.github.com/repos/${manifest.sourceRepository}/contents/${path}?ref=${manifest.sourceRevision}`;
    let result = { ...artifact, verified: false, fileSha: null, sourceStatus: "UNAVAILABLE" };
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/vnd.github+json", "user-agent": "lotscope-import-preflight" },
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.type === "file" && typeof data.sha === "string" && /^[a-f0-9]{40}$/.test(data.sha)) {
          result = { ...artifact, verified: true, fileSha: data.sha, sourceStatus: "SOURCE_FILE_EXISTS" };
        } else {
          result.sourceStatus = "NOT_A_FILE";
        }
      } else {
        result.sourceStatus = response.status === 404 ? "NOT_FOUND" : "UNAVAILABLE";
      }
    } catch {
      result.sourceStatus = "UNAVAILABLE";
    }
    artifacts.push(result);
  }
  const allSourcesVerified = artifacts.every(a => a.verified);
  return {
    ok: allSourcesVerified,
    code: allSourcesVerified ? "SOURCE_FILES_VERIFIED" : "SOURCE_VERIFICATION_INCOMPLETE",
    errors: allSourcesVerified ? [] : ["One or more source files could not be verified at the pinned revision"],
    plan: {
      ...preflight.plan,
      artifacts,
      allSourcesVerified,
      mutationAllowed: false,
      automaticPublication: false,
      approvalState: "NOT_REQUESTED",
      importState: "NOT_PERSISTED",
      reportRelease: "WITHHELD",
    },
  };
}
