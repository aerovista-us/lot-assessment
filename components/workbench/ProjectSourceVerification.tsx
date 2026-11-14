"use client";
import { useState } from "react";

type SourceArtifact = {
  id: string; path: string; title: string; type: string;
  visibility: string;
  evidenceState: string;
};
type SourceManifest = {
  schemaVersion: string; projectId: string; sourceRepository: string;
  sourceRevision: string; artifacts: SourceArtifact[];
};
type SourceResult = {
  ok: boolean; code: string; errors: string[];
  plan: null | {
    fingerprint: string;
    allSourcesVerified: boolean;
    importState: string;
    reportRelease: string;
    artifacts: (SourceArtifact & { sourceStatus: string; verified: boolean; fileSha: string | null })[];
  };
};

export function ProjectSourceVerification({ manifest, allowReviewSubmission = false }: { manifest: SourceManifest; allowReviewSubmission?: boolean }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SourceResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<{ action: string; status: string; reportRelease: string } | null>(null);
  async function verify() {
    setChecking(true);
    setError("");
    setResult(null);
    setSubmission(null);
    try {
      const response = await fetch("/api/workbench/project-imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(manifest),
      });
      const payload = await response.json() as SourceResult;
      if (!payload || typeof payload.code !== "string") throw new Error("Unexpected verifier response");
      setResult(payload);
      if (!response.ok && !payload.plan) setError(payload.errors?.join("; ") || payload.code);
    } catch {
      setError("Source verification could not run. No import or publication occurred.");
    } finally {
      setChecking(false);
    }
  }
  async function submitReview() {
    if (!allowReviewSubmission || !result?.ok || !result.plan?.allSourcesVerified) return;
    setSubmitting(true);
    setError("");
    setSubmission(null);
    try {
      const response = await fetch("/api/workbench/project-imports/submit-review", {
        method: "POST",
        headers: {"content-type": "application/json"},
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({
          sourceProjectKey: manifest.projectId,
          sourceRevision: manifest.sourceRevision,
          artifacts: manifest.artifacts.map(({id,path,type,visibility})=>({id,path,type,visibility})),
        }),
      });
      const body = await response.json() as {code?:string;action?:string;status?:string;reportRelease?:string};
      if (!response.ok || !body.action || !body.status || !body.reportRelease) {
        throw new Error(body.code || "Review record was not accepted");
      }
      setSubmission({action:body.action,status:body.status,reportRelease:body.reportRelease});
    } catch(error) {
      setError(error instanceof Error ? error.message : "Review submission unavailable");
    } finally {
      setSubmitting(false);
    }
  }
  return <section className="wb-panel" aria-label="Source verification and import gate">
    <p className="eyebrow">SOURCE IMPORT CHECK / READ ONLY</p>
    <h2>Verify pinned source files</h2>
    <p>Checks the listed source files against the pinned commit. This is not an import, professional validation, customer approval, or report publication.</p>
    <button type="button" className="secondary-button" onClick={verify} disabled={checking} aria-busy={checking}>
      {checking ? "Checking sources…" : "Verify source files"}
    </button>
    {allowReviewSubmission && result?.ok && result.plan?.allSourcesVerified && <div className="hero-actions">
      <button type="button" className="secondary-button" onClick={submitReview} disabled={checking || submitting}
        aria-busy={submitting}>{submitting ? "Sending to staging review…" : "Record staging import review"}</button>
      <p className="microcopy">Founder/admin only. The AVCC server re-verifies sources and keeps every record in REVIEW_REQUIRED / WITHHELD.</p>
    </div>}
    {submission && <p role="status">AVCC review: {submission.action} · {submission.status} · customer release {submission.reportRelease}</p>}
    {error && <p role="alert" className="repair-watch">{error}</p>}
    {result && <div role="status" aria-live="polite">
      <p><strong>{result.ok ? "Source files found" : "Verification incomplete"}</strong> · {result.code}</p>
      <p className="microcopy">Import: {result.plan?.importState ?? "BLOCKED"} · Customer report: {result.plan?.reportRelease ?? "WITHHELD"}</p>
      {result.plan?.artifacts.map(item => <p key={item.id} className="microcopy">
        {item.title}: {item.sourceStatus} {item.verified ? "(source exists, content not approved)" : "(review required)"}
      </p>)}
    </div>}
  </section>;
}
