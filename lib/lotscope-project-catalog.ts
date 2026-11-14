export type LotScopeAppId = "lotscope" | "lotscope-advanced" | "lotscope-workbench";
export type ProjectEvidenceState = "SOURCE_RECORDED" | "IMPORT_PENDING" | "REVIEW_REQUIRED";
export type LotScopeProject = {
  id: string;
  name: string;
  sourceRepository: string;
  projectType: "design" | "owner-strategy";
  workbenchPath: string;
  evidenceState: ProjectEvidenceState;
  customerReport: { status: "SOURCE_ONLY" | "INTEGRATED"; label: string; sourcePath: string };
  importTarget: LotScopeAppId;
  notes: string;
};

export const LOTSCOPE_APPLICATIONS = [
  { id: "lotscope", name: "LotScope", role: "Guided site intake and feasibility" },
  { id: "lotscope-advanced", name: "LotScope Advanced", role: "Advanced design and site analysis", availability: "PLANNED" },
  { id: "lotscope-workbench", name: "LotScope Workbench", role: "Staff case coordination, evidence and reports" },
] as const;

export const LOTSCOPE_PROJECTS: readonly LotScopeProject[] = [
  {
    id: "pondy-lot2",
    name: "Pondy Flats — Lot 2",
    sourceRepository: "aerovista-us/PondyFlats",
    projectType: "design",
    workbenchPath: "/workbench/projects/pondy-lot2",
    evidenceState: "SOURCE_RECORDED",
    customerReport: { status: "SOURCE_ONLY", label: "Design and drawing packages", sourcePath: "https://github.com/aerovista-us/PondyFlats" },
    importTarget: "lotscope-workbench",
    notes: "Existing candidates and geometry are already represented in Workbench; cross-repo sheet/report imports remain pending. Concept only, not for construction.",
  },
  {
    id: "b-street-1011",
    name: "B Street — 1011 N B St",
    sourceRepository: "aerovista-us/bstreet",
    projectType: "owner-strategy",
    workbenchPath: "/workbench/projects/b-street-1011",
    evidenceState: "IMPORT_PENDING",
    customerReport: { status: "SOURCE_ONLY", label: "Owner Powerhouse and document kit", sourcePath: "https://github.com/aerovista-us/bstreet" },
    importTarget: "lotscope-workbench",
    notes: "Owner strategy and property due diligence are source documents only; no verified canonical parcel, city, lender, or title clearance imported.",
  },
] as const;
