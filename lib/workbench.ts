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
  scenario?: {
    id: string;
    label: string;
    status: "ACTIVE" | "ALTERNATE" | "HOLD";
    notes: string[];
  };
  optimizationPreferences?: Array<{
    id: string;
    label: string;
    weight: "HIGH" | "MEDIUM" | "LOW";
  }>;
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
  revision: "discovery-reset-2026-08-27",
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
  scenario: {
    id: "baseline-no-alley",
    label: "Baseline · no alley / no special rear access",
    status: "ACTIVE",
    notes: [
      "Pennsylvania is the only modeled access origin.",
      "20 ft front / 25 ft rear / 5 ft + 10 ft side planning envelope.",
      "Rear-25 accessory-structure rules are evaluated only in a separately labeled alternate scenario.",
      "Lot 1 easement/rear-access interpretation remains on hold until legally verified."
    ]
  },
  optimizationPreferences: [
    { id: "setback-circulation", label: "Prefer circulation in otherwise-unbuildable setback land when legal and usable", weight: "HIGH" },
    { id: "buildable-pavement", label: "Minimize pavement occupying otherwise-buildable residential envelope", weight: "HIGH" },
    { id: "garage-intercept", label: "Prefer garage placement that intercepts access without unnecessary motor-court pavement", weight: "HIGH" },
    { id: "unit-balance", label: "Preserve balanced residential capacity between units", weight: "HIGH" },
    { id: "open-space", label: "Preserve useful private/open space", weight: "MEDIUM" },
    { id: "simplicity", label: "Prefer geometrically simple circulation when scores are otherwise comparable", weight: "LOW" }
  ],
  constraints: [
    { id: "access", label: "Vehicle access originates from Pennsylvania", mode: "HARD", mobility: "LOCKED" },
    { id: "survey", label: "Exact parcel polygon", mode: "HARD", mobility: "LOCKED" },
    { id: "setbacks", label: "Selected scenario setback envelope", mode: "HARD", mobility: "LOCKED" },
    { id: "program", label: "Two approximately balanced homes with required enclosed parking", mode: "HARD", mobility: "LOCKED" },
    { id: "vehicle", label: "Comparable FS-SUV / full-size pickup test assumptions", mode: "HARD", mobility: "LOCKED" },
    { id: "drive", label: "Driveway alignment and pavement shape", mode: "SOFT", mobility: "MOVABLE", movement: "reshape/shift/flare inside legal site area while preserving Penn entry" },
    { id: "garage", label: "Garage position/orientation/door approach", mode: "SOFT", mobility: "MOVABLE", movement: "translate, reorient, change door face and test credible two-car dimensions" },
    { id: "homes", label: "Home footprints", mode: "SOFT", mobility: "MOVABLE", movement: "translate/resize/re-proportion within program and setback gates" },
    { id: "style", label: "Exterior style", mode: "SOFT", mobility: "MOVABLE", movement: "representation after geometry freeze" }
  ]
};

export function pipelineFor(spec: ProjectSpec): PipelineStage[] {
  const hasSingleAccess = spec.parcel.accessSides.length === 1;
  return [
    { id: "compile", label: "1 · Compile", purpose: "Normalize parcel, sources, constraints, scenario, program and preferences into one ProjectSpec.", status: "PASS", output: `${spec.parcel.polygon.length}-vertex parcel · ${spec.constraints.length} constraints · ${spec.scenario?.label || "scenario unset"}` },
    { id: "generate", label: "2 · Generate", purpose: "Create diverse topology families before assigning exact coordinates.", status: "READY", output: "Six baseline discovery families + historical topology resets + R5.1e control." },
    { id: "solve", label: "3 · Solve", purpose: "Place buildings, garages and drive controls inside the legal envelope.", status: "READY", output: "Placement + optimizer packages online · 1′ → 0.5′ → 0.25′ refinement" },
    { id: "circulation", label: "4 · Circulation", purpose: "Run vehicle swept path, turning, staging, clearance and independent-access gates.", status: hasSingleAccess ? "READY" : "REVIEW", output: `Swept-path engine online · entry locked to ${spec.parcel.accessSides.join(", ")}` },
    { id: "program", label: "5 · Program", purpose: "Reject site fits that cannot become two credible homes inside the required area range.", status: "READY", output: `${spec.program.targetLivingSqFt[0]}–${spec.program.targetLivingSqFt[1]} SF each · Δ≤${spec.program.maxUnitDifferenceSqFt}` },
    { id: "rank", label: "6 · Rank", purpose: "Rank hard-gate survivors using program quality and site-efficiency preferences without turning preferences into laws.", status: "READY", output: "Add buildable-land pavement penalty and preserve diverse Pareto survivors." },
    { id: "develop", label: "7 · Develop", purpose: "Agent + human bounded repair of selected candidates.", status: "READY", output: "Bounded drive/placement repair engine online" },
    { id: "freeze", label: "8 · Freeze", purpose: "Hash canonical geometry and make downstream drawings representation-only.", status: "READY", output: "Deferred until finalists exist" },
    { id: "deliver", label: "9 · Deliver", purpose: "Generate site, plans, elevations, sections, renders and consistency gates from one model.", status: "READY", output: "One model → all sheets after finalist freeze" }
  ];
}

/** Discovery topology prompts. They preserve ideas, not stale historical coordinates. */
export const seedCandidates: Candidate[] = [
  { id: "SEED-SIDE-SPINE", family: "Side Spine", summary: "Exploit the 10 ft side-setback corridor for the main access spine where geometry allows; branch only where garages require it.", status: "UNSOLVED" },
  { id: "SEED-STAGGERED", family: "Staggered Spine", summary: "Use one Pennsylvania-origin spine with garage intercepts at different depths to reduce shared maneuver pavement.", status: "UNSOLVED" },
  { id: "SEED-SPLIT-FRONT", family: "Split Front", summary: "Bias both garages toward Pennsylvania and preserve deeper contiguous residential zones behind them.", status: "UNSOLVED" },
  { id: "SEED-E2-R", family: "E2-R", summary: "Preserve E2 design DNA but discard its historical coordinates and rebuild it against the current survey, access and setback rules.", status: "UNSOLVED" },
  { id: "SEED-G1-R", family: "G1-R", summary: "Rebuild G1 as a fresh topology family rather than merely patching the old placement; optimize pavement and garage approach first.", status: "UNSOLVED" },
  { id: "SEED-V2-R", family: "V2-R / Butterfly", summary: "Preserve the diverging/butterfly relationship while rebuilding garage access and placement on the correct parcel geometry.", status: "UNSOLVED" }
];
