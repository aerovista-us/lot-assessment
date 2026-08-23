export type ConstraintMode = "HARD" | "SOFT";
export type Mobility = "LOCKED" | "MOVABLE" | "DERIVED";
export type PipelineStatus = "READY" | "PASS" | "REVIEW" | "BLOCKED";

export type Provenance = {
  source: string;
  confidence: "confirmed" | "planning" | "assumed";
};

export type Constraint<T> = {
  value: T;
  mode: ConstraintMode;
  mobility: Mobility;
  movement?: string;
  provenance: Provenance;
};

export type ProjectSpec = {
  id: string;
  name: string;
  revision: string;
  parcel: {
    polygon: Array<[number, number]>;
    frontage: string;
    accessSides: string[];
  };
  setbacks: {
    frontFt: number;
    rearFt: number;
    leftFt: number;
    rightFt: number;
  };
  program: {
    units: number;
    targetLivingSqFt: [number, number];
    maxUnitDifferenceSqFt: number;
    stories: number;
    enclosedSpacesPerUnit: number;
  };
  circulation: {
    drivewayWidthFt: number;
    designVehicle: string;
    vehicleWidthFt: number;
    vehicleLengthFt: number;
    minRearAxleRadiusFt: number;
  };
  constraints: Array<{
    id: string;
    label: string;
    mode: ConstraintMode;
    mobility: Mobility;
    movement?: string;
  }>;
};

export type PipelineStage = {
  id: string;
  label: string;
  purpose: string;
  status: PipelineStatus;
  output: string;
};

export type Candidate = {
  id: string;
  family: string;
  summary: string;
  status: "UNSOLVED" | "FEASIBLE" | "NEAR_PASS" | "REJECTED";
  scores?: {
    circulation: number;
    architecture: number;
    yard: number;
    simplicity: number;
    overall: number;
  };
  adjustment?: string;
};

export const pondyLot2Spec: ProjectSpec = {
  id: "pondy-lot2",
  name: "Pondy Flats · Lot 2",
  revision: "workbench-seed-1",
  parcel: {
    polygon: [[0,0],[148,0],[148,50],[125.143,43.016],[84.813,43.016],[0,57.01]],
    frontage: "Pennsylvania Street",
    accessSides: ["Pennsylvania Street"]
  },
  setbacks: { frontFt: 20, rearFt: 25, leftFt: 5, rightFt: 10 },
  program: {
    units: 2,
    targetLivingSqFt: [1600, 1900],
    maxUnitDifferenceSqFt: 120,
    stories: 2,
    enclosedSpacesPerUnit: 2
  },
  circulation: {
    drivewayWidthFt: 12,
    designVehicle: "Full-size SUV / pickup",
    vehicleWidthFt: 8,
    vehicleLengthFt: 20.5,
    minRearAxleRadiusFt: 25
  },
  constraints: [
    { id: "access", label: "Vehicle access from Pennsylvania only", mode: "HARD", mobility: "LOCKED" },
    { id: "survey", label: "Parcel polygon", mode: "HARD", mobility: "LOCKED" },
    { id: "setbacks", label: "Working setbacks", mode: "HARD", mobility: "LOCKED" },
    { id: "drive", label: "Driveway alignment", mode: "HARD", mobility: "MOVABLE", movement: "reshape/shift inside parcel while preserving Penn entry" },
    { id: "garage", label: "Garage position/orientation", mode: "HARD", mobility: "MOVABLE", movement: "translate, mirror, rotate, change door face if all gates still pass" },
    { id: "homes", label: "Home footprints", mode: "HARD", mobility: "MOVABLE", movement: "translate/resize within program and setback gates" },
    { id: "style", label: "Exterior style", mode: "SOFT", mobility: "MOVABLE", movement: "representation after geometry freeze" }
  ]
};

export function pipelineFor(spec: ProjectSpec): PipelineStage[] {
  const hasSingleAccess = spec.parcel.accessSides.length === 1;
  return [
    { id: "compile", label: "1 · Compile", purpose: "Normalize parcel, sources, constraints and program into one ProjectSpec.", status: "PASS", output: `${spec.parcel.polygon.length}-vertex parcel · ${spec.constraints.length} constraints` },
    { id: "generate", label: "2 · Generate", purpose: "Create diverse topology families before assigning exact coordinates.", status: "READY", output: "Family definitions are next; cards at right are unsolved topology seeds." },
    { id: "solve", label: "3 · Solve", purpose: "Place buildings, garages and drive controls inside the legal envelope.", status: "READY", output: "Placement + optimizer packages online · 1′ → 0.5′ → 0.25′ refinement" },
    { id: "circulation", label: "4 · Circulation", purpose: "Run vehicle swept path, turning, staging, clearance and independent-access gates.", status: hasSingleAccess ? "READY" : "REVIEW", output: `Swept-path engine online · entry locked to ${spec.parcel.accessSides.join(", ")}` },
    { id: "program", label: "5 · Program", purpose: "Reject site fits that cannot become two credible homes inside the required area range.", status: "READY", output: `${spec.program.targetLivingSqFt[0]}–${spec.program.targetLivingSqFt[1]} SF each · Δ≤${spec.program.maxUnitDifferenceSqFt}` },
    { id: "rank", label: "6 · Rank", purpose: "Keep diverse Pareto survivors instead of forcing one opaque winner.", status: "READY", output: "Physical objective exists; architectural/program score layer still to wire." },
    { id: "develop", label: "7 · Develop", purpose: "Agent + human bounded repair of selected candidates.", status: "READY", output: "Bounded drive/placement repair engine online" },
    { id: "freeze", label: "8 · Freeze", purpose: "Hash canonical geometry and make downstream drawings representation-only.", status: "READY", output: "Geometry hash + ProjectSpec hash + solver version" },
    { id: "deliver", label: "9 · Deliver", purpose: "Generate site, plans, elevations, sections, renders and consistency gates from one model.", status: "READY", output: "One model → all sheets" }
  ];
}

/**
 * Topology prompts only. These are deliberately UNSOLVED until a family definition
 * is connected to packages/optimizer and its resulting geometry passes the gates.
 */
export const seedCandidates: Candidate[] = [
  { id: "SEED-001", family: "Staggered / shared spine", summary: "Generate offset homes with Penn-only shared drive and independently solved garage approaches.", status: "UNSOLVED" },
  { id: "SEED-002", family: "Front / rear split", summary: "Generate one street-proximate and one rear home; allow local maneuvering-court variables before building movement.", status: "UNSOLVED" },
  { id: "SEED-003", family: "Attached duplex / offset garages", summary: "Generate a shared-demising family with independently variable garage positions and door approaches.", status: "UNSOLVED" },
  { id: "SEED-004", family: "Courtyard / mid-lot garages", summary: "Generate central parking-court variants and keep only those that preserve credible home plates.", status: "UNSOLVED" }
];
