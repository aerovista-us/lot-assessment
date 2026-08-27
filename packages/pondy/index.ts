import { FULL_SIZE_SUV } from "@/packages/circulation";
import { Point, insetPolygonBySegment } from "@/packages/geometry";
import { FamilySearch } from "@/packages/optimizer";
import { PlacementCandidate, PlacementProblem } from "@/packages/placement";

export const PONDY_SURVEY: Point[] = [
  [0, 0], [148, 0], [148, 50], [125.143, 43.016], [84.813, 43.016], [0, 57.01]
];

// Segment order follows PONDY_SURVEY. Pennsylvania frontage is segment 1 (x=148).
const SEGMENT_SETBACK = [5, 20, 10, 10, 10, 25];

export const PONDY_BUILDABLE = insetPolygonBySegment(
  PONDY_SURVEY,
  (segmentIndex) => SEGMENT_SETBACK[segmentIndex] ?? 0
);

export const pondyProblem: PlacementProblem = {
  parcel: PONDY_SURVEY,
  buildableEnvelope: PONDY_BUILDABLE,
  vehicle: FULL_SIZE_SUV,
  // Pennsylvania frontage is x=148. Vehicle may begin just outside that edge.
  allowVehicleOutside: ([x]) => x >= 147.8,
  minimumStructureSeparationFt: 0
};

function unitMass(args: {
  id: "A" | "B";
  plateX: number;
  plateY: number;
  plateW: number;
  plateD: number;
  garageX: number;
  garageY: number;
  garageW?: number;
  garageD?: number;
}) {
  const group = `unit-${args.id}`;
  return [
    {
      id: `HOME-${args.id}`,
      kind: "home" as const,
      x: args.plateX,
      y: args.plateY,
      widthFt: args.plateW,
      depthFt: args.plateD,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      // The home plate represents the complete two-story residential envelope.
      // Ground-level garage overlap is subtracted by the program gate.
      circulationObstacle: false
    },
    {
      id: `GARAGE-${args.id}`,
      kind: "garage" as const,
      x: args.garageX,
      y: args.garageY,
      widthFt: args.garageW ?? 22,
      depthFt: args.garageD ?? 22,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      circulationObstacle: true
    }
  ];
}

/**
 * Family 1 — Side Spine
 * Strongly favors use of the 10 ft side-setback corridor for the main access spine,
 * then branches only where a garage needs an approach. This is a preference, not a
 * hard rule; the optimizer may still move the legal pavement geometry.
 */
export const sideSpine: FamilySearch = {
  id: "side-spine",
  variables: [
    { id: "ax", min: 98, max: 108, step: 2 },
    { id: "ay", min: 5, max: 9, step: 2 },
    { id: "bx", min: 40, max: 58, step: 2 },
    { id: "by", min: 5, max: 11, step: 2 },
    { id: "spineY", min: 35, max: 39, step: 1 },
    { id: "turnAX", min: 112, max: 124, step: 2 },
    { id: "turnBX", min: 70, max: 88, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-SS-${serial}`,
    family: "side-spine",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 12, plateY: v.ay, plateW: 38, plateD: 28, garageX: v.ax, garageY: v.ay + 2 }),
      ...unitMass({ id: "B", plateX: v.bx - 8, plateY: v.by, plateW: 36, plateD: 28, garageX: v.bx + 4, garageY: v.by + 2 })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.spineY], [v.turnAX, v.spineY], [v.ax + 22, v.ay + 13]], movableControlPoints: [1], controlPointLimitFt: 3 },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnBX, v.spineY], [v.bx + 26, v.by + 13]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "side-spine", intendedLivingA: 1824, intendedLivingB: 1792 }
  })
};

/**
 * Family 2 — Staggered Spine
 * The first discovery run proved this access topology physically. Run 02 enlarges
 * only the residential plates so the 2-car garage overlap is no longer miscounted
 * as conditioned living area. Circulation geometry stays materially recognizable.
 */
export const staggeredSpine: FamilySearch = {
  id: "staggered-spine",
  variables: [
    { id: "ax", min: 96, max: 100, step: 1 },
    { id: "ay", min: 5, max: 7, step: 1 },
    { id: "bx", min: 33, max: 36, step: 1 },
    { id: "by", min: 5, max: 8, step: 1 },
    { id: "gby", min: 13, max: 17, step: 1 },
    { id: "spineY", min: 34, max: 38, step: 1 },
    { id: "turnX", min: 70, max: 84, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-Z-${serial}`,
    family: "staggered-spine",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 12, plateY: v.ay, plateW: 44, plateD: 28, garageX: v.ax + 8, garageY: v.ay }),
      ...unitMass({ id: "B", plateX: v.bx - 6, plateY: v.by, plateW: 44, plateD: 28, garageX: v.bx, garageY: v.gby })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.ay + 11], [v.ax + 30, v.ay + 11]], movableControlPoints: [], controlPointLimitFt: 0 },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 22, v.gby + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "staggered-spine", run02ProgramRepair: true, intendedLivingA: 1800, intendedLivingB: 1800 }
  })
};

/** Family 3 — Split Front: front-bias both garage intercepts, preserve deeper home plates behind them. */
export const splitFront: FamilySearch = {
  id: "split-front",
  variables: [
    { id: "agx", min: 102, max: 112, step: 2 },
    { id: "agy", min: 5, max: 10, step: 1 },
    { id: "bgx", min: 78, max: 94, step: 2 },
    { id: "bgy", min: 16, max: 21, step: 1 },
    { id: "spineY", min: 35, max: 39, step: 1 },
    { id: "turnX", min: 94, max: 108, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-SF-${serial}`,
    family: "split-front",
    placements: [
      ...unitMass({ id: "A", plateX: v.agx - 30, plateY: 5, plateW: 42, plateD: 27, garageX: v.agx, garageY: v.agy }),
      ...unitMass({ id: "B", plateX: v.bgx - 28, plateY: 10, plateW: 40, plateD: 28, garageX: v.bgx, garageY: v.bgy })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.agy + 11], [v.agx + 22, v.agy + 11]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bgx + 22, v.bgy + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "split-front", intendedLivingA: 1800, intendedLivingB: 1760 }
  })
};

/**
 * Family 4 — E2-R
 * Preserve E2's front/rear relationship and independent garage idea, discard every
 * historical coordinate, and regenerate against the current parcel and access rules.
 * Run 02 widens the plates while keeping the garage/access relationship that passed
 * the first physical benchmark.
 */
export const e2Reset: FamilySearch = {
  id: "e2-r",
  variables: [
    { id: "ax", min: 98, max: 101, step: 1 },
    { id: "ay", min: 5, max: 7, step: 1 },
    { id: "bx", min: 42, max: 45, step: 1 },
    { id: "by", min: 5, max: 8, step: 1 },
    { id: "spineY", min: 34, max: 38, step: 1 },
    { id: "turnX", min: 72, max: 86, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-E2R-${serial}`,
    family: "e2-r",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 16, plateY: v.ay, plateW: 44, plateD: 28, garageX: v.ax + 2, garageY: v.ay + 3 }),
      ...unitMass({ id: "B", plateX: v.bx - 15, plateY: v.by, plateW: 44, plateD: 28, garageX: v.bx + 8, garageY: v.by + 3 })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.ay + 14], [v.ax + 24, v.ay + 14]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 30, v.by + 14]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "e2-reset", historicalSeed: "E2", run02ProgramRepair: true, intendedLivingA: 1800, intendedLivingB: 1800 }
  })
};

/**
 * Family 5 — G1-R
 * Preserve G1's circulation-first lesson but regenerate building/garage placement.
 * Run 02 keeps its successful offset garage paths and restores credible net living
 * capacity around the garage footprints.
 */
export const g1Reset: FamilySearch = {
  id: "g1-r",
  variables: [
    { id: "ax", min: 99, max: 102, step: 1 },
    { id: "agy", min: 5, max: 9, step: 1 },
    { id: "bx", min: 33, max: 36, step: 1 },
    { id: "bgy", min: 13, max: 18, step: 1 },
    { id: "spineY", min: 35, max: 39, step: 1 },
    { id: "turnX", min: 70, max: 84, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-G1R-${serial}`,
    family: "g1-r",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 15, plateY: 5, plateW: 44, plateD: 28, garageX: v.ax, garageY: v.agy }),
      ...unitMass({ id: "B", plateX: v.bx - 6, plateY: 5, plateW: 44, plateD: 28, garageX: v.bx + 2, garageY: v.bgy })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.agy + 11], [v.ax + 22, v.agy + 11]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 24, v.bgy + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "g1-reset", historicalSeed: "G1", run02ProgramRepair: true, intendedLivingA: 1800, intendedLivingB: 1800 }
  })
};

/**
 * Family 6 — V2-R / Butterfly
 * Axis-aligned solver cannot literally rotate the buildings yet, so preserve the
 * butterfly idea as two diverging access branches and separated residential wings.
 * This is intentionally labeled as a topology reset, not a literal historical V2.
 */
export const v2Reset: FamilySearch = {
  id: "v2-r",
  variables: [
    { id: "ax", min: 90, max: 102, step: 2 },
    { id: "bx", min: 56, max: 72, step: 2 },
    { id: "ay", min: 5, max: 8, step: 1 },
    { id: "by", min: 11, max: 15, step: 1 },
    { id: "branchX", min: 92, max: 108, step: 2 },
    { id: "spineY", min: 35, max: 39, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-V2R-${serial}`,
    family: "v2-r",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 16, plateY: v.ay, plateW: 38, plateD: 27, garageX: v.ax, garageY: v.ay + 2 }),
      ...unitMass({ id: "B", plateX: v.bx - 14, plateY: v.by, plateW: 38, plateD: 27, garageX: v.bx + 2, garageY: v.by + 1 })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.spineY], [v.branchX, v.spineY], [v.ax + 22, v.ay + 13]], movableControlPoints: [1], controlPointLimitFt: 3 },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.branchX - 12, v.spineY], [v.bx + 24, v.by + 12]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "v2-reset", historicalSeed: "V2", intendedLivingA: 1760, intendedLivingB: 1760 }
  })
};

export const pondyFamilies: FamilySearch[] = [
  sideSpine,
  staggeredSpine,
  splitFront,
  e2Reset,
  g1Reset,
  v2Reset
];
