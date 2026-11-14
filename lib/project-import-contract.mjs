import { createHash } from "node:crypto";

const PROJECTS = Object.freeze({
  "pondy-lot2": { repository: "aerovista-us/PondyFlats", kind: "design" },
  "b-street-1011": { repository: "aerovista-us/bstreet", kind: "owner-strategy" },
});
const REQUIRED = ["schemaVersion", "projectId", "sourceRepository", "sourceRevision", "artifacts"];
const ARTIFACT_TYPES = new Set(["source-document", "customer-report", "drawing-package", "candidate-record", "evidence"]);
const VISIBILITIES = new Set(["internal", "customer-review"]);
const STATES = new Set(["SOURCE_ONLY", "REVIEW_REQUIRED", "WITHHELD"]);

/**
 * Read-only preparation: validate an import manifest and compute its stable fingerprint.
 * Never stores, overwrites, publishes, or treats imported content as engineering authority.
 */
export function prepareProjectImport(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, errors: ["Manifest must be an object"], plan: null };
  }
  for (const key of REQUIRED) if (!(key in manifest)) errors.push("Missing " + key);
  if (manifest.schemaVersion !== "lotscope-source-manifest-v1") errors.push("Unsupported schemaVersion");
  const project = PROJECTS[manifest.projectId];
  if (!project) errors.push("Unknown projectId");
  if (project && manifest.sourceRepository !== project.repository) errors.push("Repository does not match registered project");
  if (typeof manifest.sourceRevision !== "string" || !/^[a-f0-9]{40}$/.test(manifest.sourceRevision)) errors.push("sourceRevision must be a complete Git commit SHA");
  if (!Array.isArray(manifest.artifacts) || !manifest.artifacts.length) errors.push("At least one artifact is required");
  const seen = new Set();
  if (Array.isArray(manifest.artifacts)) for (const [index, artifact] of manifest.artifacts.entries()) {
    const key = "artifacts[" + index + "]";
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) { errors.push(key + " must be an object"); continue; }
    if (typeof artifact.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(artifact.id)) errors.push(key + ".id is invalid");
    if (seen.has(artifact.id)) errors.push(key + ".id is duplicated");
    seen.add(artifact.id);
    if (!ARTIFACT_TYPES.has(artifact.type)) errors.push(key + ".type is unsupported");
    if (!VISIBILITIES.has(artifact.visibility)) errors.push(key + ".visibility is unsupported");
    if (!STATES.has(artifact.evidenceState)) errors.push(key + ".evidenceState cannot assert approval");
    if (typeof artifact.path !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(artifact.path)
        || artifact.path.startsWith("/") || artifact.path.split("/").includes("..") || artifact.path.includes("//")) errors.push(key + ".path must be a safe relative source path");
    if (typeof artifact.title !== "string" || !artifact.title.trim()) errors.push(key + ".title is required");
  }
  if (errors.length) return { ok: false, errors, plan: null };
  const canonical = JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    projectId: manifest.projectId,
    sourceRepository: manifest.sourceRepository,
    sourceRevision: manifest.sourceRevision,
    artifacts: manifest.artifacts.map(({id, type, path, title, visibility, evidenceState}) => ({id,type,path,title,visibility,evidenceState})).sort((a,b) => a.id.localeCompare(b.id)),
  });
  const fingerprint = createHash("sha256").update(canonical).digest("hex");
  return {
    ok: true, errors: [],
    plan: {
      projectId: manifest.projectId,
      sourceRepository: manifest.sourceRepository,
      sourceRevision: manifest.sourceRevision,
      fingerprint,
      artifactCount: manifest.artifacts.length,
      artifacts: manifest.artifacts.map(a => ({
        ...a,
        sourceRef: "https://github.com/" + manifest.sourceRepository + "/blob/" + manifest.sourceRevision + "/" + a.path,
        importState: "PENDING_SOURCE_VERIFICATION",
        reportRelease: "WITHHELD",
      })),
      nextStep: "Verify source hash and file existence; bind authenticated project ID; obtain reviewer approval before persisted import",
      mutationAllowed: false,
      automaticPublication: false,
    },
  };
}

export function compareImportPlans(current, incoming) {
  if (!current?.ok || !incoming?.ok) return { action: "BLOCK", reason: "Both plans must pass validation" };
  if (current.plan.projectId !== incoming.plan.projectId) return { action: "BLOCK", reason: "Cross-project overwrite forbidden" };
  if (current.plan.fingerprint === incoming.plan.fingerprint) return { action: "NOOP", reason: "Identical source manifest" };
  return { action: "REVIEW_REQUIRED", reason: "New source revision or artifact set; create a separate revision, do not overwrite" };
}
