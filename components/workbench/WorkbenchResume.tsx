"use client";

import Link from "next/link";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentWorkspaceDesignDocument } from "@/packages/candidates/workspace";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const timestamp = (value: string | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

export function WorkbenchResume({ defaultCandidateId }: { defaultCandidateId: string }) {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  if (!workspace.ready) return <div className="workbench-resume resume-loading" role="status">Finding your saved work…</div>;
  if (workspace.storageError) return <div className="workbench-resume resume-error" role="alert"><strong>Your saved workspace needs attention</strong><p>{workspace.storageError}</p><button type="button" className="secondary-button" onClick={workspace.retryStorage}>Retry saved workspace</button></div>;

  const localIds = new Set(workspace.workspace.candidates.map(candidate => candidate.id));
  const recent = workspace.registry.candidates.map(candidate => {
    const design = currentWorkspaceDesignDocument(workspace.workspace, candidate);
    return {candidate, design, activity: Math.max(timestamp(candidate.updatedAt), timestamp(design?.updatedAt))};
  }).filter(entry => localIds.has(entry.candidate.id) || entry.design)
    .sort((a,b) => b.activity - a.activity || a.candidate.id.localeCompare(b.candidate.id));
  const fallback = workspace.registry.candidates.find(candidate => candidate.id === defaultCandidateId) ?? workspace.registry.candidates[0];
  const candidate = recent[0]?.candidate ?? fallback;
  const design = recent[0]?.design;
  if (!candidate) return <div className="workbench-resume"><p>No design is available yet.</p><Link className="secondary-button" href="/workbench/projects">Open projects</Link></div>;

  return <section className="workbench-resume" aria-label="Continue your design">
    <p className="eyebrow">{recent.length ? "PICK UP WHERE YOU LEFT OFF" : "START WITH YOUR PROJECT"}</p>
    <div className="resume-heading"><h2>{candidate.revisionLabel}</h2><span>{recent.length ? "Saved in this browser" : "Project starting point"}</span></div>
    <p className="resume-description">{design ? `Design revision ${design.revision} · ${design.shapes.filter(shape => shape.kind === "ROOM").length} rooms · ${design.shapes.filter(shape => shape.kind === "CIRCULATION").length} hallways` : recent.length ? "Continue this draft and shape its room layout." : "Explore the starting design, then make it your own."}</p>
    <div className="hero-actions"><Link className="primary-button" data-continue-design={candidate.id} href={`/workbench/projects/pondy-lot2/candidates/${encodeURIComponent(candidate.id)}`}>{recent.length ? "Continue" : "Open"} {candidate.revisionLabel}<span aria-hidden="true">↗</span></Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Browse designs</Link></div>
    {recent.length ? <p className="resume-storage-note">Export a backup to carry this work to another browser or device.</p> : null}
  </section>;
}
