"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { useCandidateWorkspace } from "@/components/workbench/useCandidateWorkspace";
import { currentWorkspaceDesignDocument } from "@/packages/candidates/workspace";
import { pondyCandidateRegistry } from "@/projects/pondy-lot2/candidate-registry";

const timestamp = (value: string | undefined) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

function useResumeWorkspace(defaultCandidateId: string) {
  const workspace = useCandidateWorkspace(pondyCandidateRegistry);
  const localIds = new Set(workspace.workspace.candidates.map(candidate => candidate.id));
  const recent = workspace.registry.candidates.map(candidate => {
    const design = currentWorkspaceDesignDocument(workspace.workspace, candidate);
    return {candidate, design, activity: Math.max(timestamp(candidate.updatedAt), timestamp(design?.updatedAt))};
  }).filter(entry => localIds.has(entry.candidate.id) || entry.design)
    .sort((a,b) => b.activity - a.activity || a.candidate.id.localeCompare(b.candidate.id));
  const fallback = workspace.registry.candidates.find(candidate => candidate.id === defaultCandidateId) ?? workspace.registry.candidates[0];
  const candidate = recent[0]?.candidate ?? fallback;
  const design = recent[0]?.design;
  return { ready: workspace.ready, storageError: workspace.storageError, retryStorage: workspace.retryStorage, candidate, design, hasSavedWork: recent.length > 0 };
}

const ResumeContext = createContext<ReturnType<typeof useResumeWorkspace> | null>(null);

export function WorkbenchHomeWorkspace({ defaultCandidateId, children }: { defaultCandidateId: string; children: ReactNode }) {
  const resume = useResumeWorkspace(defaultCandidateId);
  return <ResumeContext.Provider value={resume}>{children}</ResumeContext.Provider>;
}

function useHomeWorkspace() {
  const resume = useContext(ResumeContext);
  if (!resume) throw new Error("Home actions require the Workbench home workspace.");
  return resume;
}

export function WorkbenchResume() {
  const { ready, storageError, retryStorage, candidate, design, hasSavedWork } = useHomeWorkspace();
  if (!ready) return <div className="workbench-resume resume-loading" role="status">Finding your saved work…</div>;
  if (storageError) return <div className="workbench-resume resume-error" role="alert"><strong>Your saved workspace needs attention</strong><p>{storageError}</p><button type="button" className="secondary-button" onClick={retryStorage}>Retry saved workspace</button></div>;
  if (!candidate) return <div className="workbench-resume"><p>No design is available yet.</p><Link className="secondary-button" href="/workbench/projects">Open projects</Link></div>;

  return <section className="workbench-resume" aria-label="Continue your design">
    <p className="eyebrow">{hasSavedWork ? "PICK UP WHERE YOU LEFT OFF" : "START WITH YOUR PROJECT"}</p>
    <div className="resume-heading"><h2>{candidate.revisionLabel}</h2><span>{hasSavedWork ? "Saved in this browser" : "Project starting point"}</span></div>
    <p className="resume-description">{design ? `Design revision ${design.revision} · ${design.shapes.filter(shape => shape.kind === "ROOM").length} rooms · ${design.shapes.filter(shape => shape.kind === "CIRCULATION").length} hallways` : hasSavedWork ? "Continue this draft and shape its room layout." : "Explore the starting design, then make it your own."}</p>
    <div className="hero-actions"><Link className="primary-button" data-continue-design={candidate.id} href={`/workbench/projects/pondy-lot2/candidates/${encodeURIComponent(candidate.id)}`}>{hasSavedWork ? "Continue" : "Open"} {candidate.revisionLabel}<span aria-hidden="true">↗</span></Link><Link className="secondary-button" href="/workbench/projects/pondy-lot2/candidates">Browse designs</Link></div>
    {hasSavedWork ? <p className="resume-storage-note">Export a backup to carry this work to another browser or device.</p> : null}
  </section>;
}

export function WorkbenchJourneyCards() {
  const { ready, storageError, candidate } = useHomeWorkspace();
  if (!ready) return <p className="microcopy" role="status">Finding your saved design…</p>;
  if (storageError || !candidate) return <p className="microcopy">Restore your saved workspace above to continue the design journey.</p>;
  const path = `/workbench/projects/pondy-lot2/candidates/${encodeURIComponent(candidate.id)}`;
  const stages = [
    { number: "01", title: "Explore the lot", copy: "Review the parcel, buildings and source constraints. Compare the arrangements worth developing.", action: "Open project", href: "/workbench/projects/pondy-lot2" },
    { number: "02", title: "Shape your layout", copy: "Generate room alternatives, inspect the tradeoffs and save the arrangement you prefer.", action: "Enter layout studio", href: `${path}#universal-design-editor` },
    { number: "03", title: "Review the whole story", copy: "Understand the checks and open questions. Preview a report from your saved design.", action: "Preview a report", href: `${path}#customer-report-preview` }
  ];
  return <div className="studio-journey-grid">{stages.map(stage => <Link className="studio-journey-card" href={stage.href} key={stage.number}><span className="studio-step-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.copy}</p><strong>{stage.action} <span aria-hidden="true">↗</span></strong></Link>)}</div>;
}
