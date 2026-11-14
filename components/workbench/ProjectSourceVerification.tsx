"use client";
import { useState } from "react";

type SourceArtifact = {
  id: string; path: string; title: string; type: string;
  visibility: "internal" | "customer-review";
  evidenceState: "SOURCE_ONLY" | "REVIEW_REQUIRED" | "WITHHELD";
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

export function ProjectSourceVerification({ manifest }: { manifest: SourceManifest }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SourceResult | null>(null);
  const [error, setError] = useState("");
  async function verify() {
    setChecking(true);
    setError("");
    setResult(null);
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
  return <section className="wb-panel" aria-label="Source verification and import gate">
    <p className="eyebrow">SOURCE IMPORT CHECK / READ ONLY</p>
    <h2>Verify pinned source files</h2>
    <p>Checks the listed source files against the pinned commit. This is not an import, professional validation, customer approval, or report publication.</p>
    <button type="button" className="secondary-button" onClick={verify} disabled={checking} aria-busy={checking}>
      {checking ? "Checking sources…" : "Verify source files"}
    </button>
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
