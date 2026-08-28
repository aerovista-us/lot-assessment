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
      circulationObstacle: false
    },
    {
      id: `GARAGE-${args.id}`,
      kind: "garage" as const,
      x: args.garageX,
      y: args.garageY,
      widthFt: args.garageW ?? 20,
      depthFt: args.garageD ?? 20,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      circulationObstacle: true
    }
  ];
}

/**
 * Add useful residential floor plate on the south/low side of the rear unit without
 * widening the garage mouth or stealing the north-side vehicle turn. The wing is a
 * declared component of the same unit, so containment, shifting and swept-path walls
 * remain explicit rather than pretending the whole bounding rectangle is buildable.
 */
function rearCompoundMass(args: {
  rearX: number;
  rearW: number;
  rearD: number;
  garageY: number;
  wingW: number;
  wingD: number;
}) {
  const rearEast = args.rearX + args.rearW;
  return [
    ...unitMass({
      id: "B",
      plateX: args.rearX,
      plateY: 5,
      plateW: args.rearW,
      plateD: args.rearD,
      garageX: rearEast - 20,
      garageY: args.garageY
    }),
    {
      id: "HOME-B-WING",
      kind: "home" as const,
      x: rearEast,
      y: 5,
      widthFt: args.wingW,
      depthFt: args.wingD,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: "unit-B",
      circulationObstacle: false
    }
  ];
}

/** Family 1 — Side Spine. Run 08 adds a low south wing to recover residential capacity. */
export const sideSpine: FamilySearch = {
  id: "side-spine",
  variables: [
    { id: "frontX", min: 77, max: 80, step: 1 },
    { id: "rearX", min: 25, max: 26, step: 1 },
    { id: "rearW", min: 31, max: 32, step: 1 },
    { id: "wingW", min: 14, max: 18, step: 2 },
    { id: "wingD", min: 8, max: 10, step: 1 },
    { id: "rearGarageY", min: 15, max: 17, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "turnX", min: 78, max: 80, step: 1 },
    { id: "alignX", min: 67, max: 71, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    const mouthY = v.rearGarageY + 10;
    return {
      id: `PONDY-SS-${serial}`,
      family: "side-spine",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 24, garageX: 108, garageY: 7 }),
        ...rearCompoundMass({ rearX: v.rearX, rearW: v.rearW, rearD: 32.5, garageY: v.rearGarageY, wingW: v.wingW, wingD: v.wingD })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, mouthY], [rearEast, mouthY]], movableControlPoints: [1, 2], controlPointLimitFt: 2 }
      ],
      metadata: { topology: "side-spine-compound-rear", intendedLivingA: 1800, intendedLivingB: 1800, run08Compound: true }
    };
  }
};

/** Family 2 — Staggered Spine: same access logic with a deeper front plate. */
export const staggeredSpine: FamilySearch = {
  id: "staggered-spine",
  variables: [
    { id: "frontX", min: 79, max: 82, step: 1 },
    { id: "rearX", min: 25, max: 26, step: 1 },
    { id: "rearW", min: 31, max: 32, step: 1 },
    { id: "wingW", min: 14, max: 18, step: 2 },
    { id: "wingD", min: 8, max: 10, step: 1 },
    { id: "rearGarageY", min: 14, max: 16, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "turnX", min: 79, max: 81, step: 1 },
    { id: "alignX", min: 67, max: 71, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    const mouthY = v.rearGarageY + 10;
    return {
      id: `PONDY-Z-${serial}`,
      family: "staggered-spine",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 25, garageX: 108, garageY: 8 }),
        ...rearCompoundMass({ rearX: v.rearX, rearW: v.rearW, rearD: 32.5, garageY: v.rearGarageY, wingW: v.wingW, wingD: v.wingD })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 18], [128, 18]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, mouthY], [rearEast, mouthY]], movableControlPoints: [1, 2], controlPointLimitFt: 2 }
      ],
      metadata: { topology: "staggered-compound-rear", intendedLivingA: 1800, intendedLivingB: 1800, run08Compound: true }
    };
  }
};

/** Family 3 — Split Front remains a deliberately unmassaged historical experiment. */
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
      ...unitMass({ id: "A", plateX: v.agx - 30, plateY: 5, plateW: 42, plateD: 27, garageX: v.agx, garageY: v.agy, garageW: 22, garageD: 22 }),
      ...unitMass({ id: "B", plateX: v.bgx - 28, plateY: 10, plateW: 40, plateD: 28, garageX: v.bgx, garageY: v.bgy, garageW: 22, garageD: 22 })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.agy + 11], [v.agx + 22, v.agy + 11]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bgx + 22, v.bgy + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "split-front", intendedLivingA: 1800, intendedLivingB: 1760 }
  })
};

/** Family 4 — E2-R: old front/rear DNA plus a low wing, not old coordinates. */
export const e2Reset: FamilySearch = {
  id: "e2-r",
  variables: [
    { id: "frontX", min: 77, max: 81, step: 1 },
    { id: "rearX", min: 25, max: 26, step: 1 },
    { id: "rearW", min: 31, max: 32, step: 1 },
    { id: "wingW", min: 14, max: 18, step: 2 },
    { id: "wingD", min: 8, max: 10, step: 1 },
    { id: "rearGarageY", min: 14, max: 16, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "turnX", min: 77, max: 80, step: 1 },
    { id: "alignX", min: 66, max: 71, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    const mouthY = v.rearGarageY + 10;
    return {
      id: `PONDY-E2R-${serial}`,
      family: "e2-r",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 23, garageX: 108, garageY: 6 }),
        ...rearCompoundMass({ rearX: v.rearX, rearW: v.rearW, rearD: 32.5, garageY: v.rearGarageY, wingW: v.wingW, wingD: v.wingD })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 16], [128, 16]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, mouthY], [rearEast, mouthY]], movableControlPoints: [1, 2], controlPointLimitFt: 2 }
      ],
      metadata: { topology: "e2-reset-compound-rear", historicalSeed: "E2", intendedLivingA: 1800, intendedLivingB: 1800, run08Compound: true }
    };
  }
};

/** Family 5 — G1-R: circulation-first variation with the compound rear capacity repair. */
export const g1Reset: FamilySearch = {
  id: "g1-r",
  variables: [
    { id: "frontX", min: 77, max: 81, step: 1 },
    { id: "rearX", min: 25, max: 26, step: 1 },
    { id: "rearW", min: 31, max: 32, step: 1 },
    { id: "wingW", min: 14, max: 18, step: 2 },
    { id: "wingD", min: 8, max: 10, step: 1 },
    { id: "rearGarageY", min: 15, max: 17, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "turnX", min: 77, max: 80, step: 1 },
    { id: "alignX", min: 66, max: 71, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    const mouthY = v.rearGarageY + 10;
    return {
      id: `PONDY-G1R-${serial}`,
      family: "g1-r",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 24, garageX: 108, garageY: 8 }),
        ...rearCompoundMass({ rearX: v.rearX, rearW: v.rearW, rearD: 32.7, garageY: v.rearGarageY, wingW: v.wingW, wingD: v.wingD })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 18], [128, 18]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, mouthY], [rearEast, mouthY]], movableControlPoints: [1, 2], controlPointLimitFt: 2 }
      ],
      metadata: { topology: "g1-reset-compound-rear", historicalSeed: "G1", intendedLivingA: 1800, intendedLivingB: 1800, run08Compound: true }
    };
  }
};

/**
 * Family 6 — V2-R / Butterfly. Rotation is still not proven in the shared engine,
 * so this remains an honest axis-aligned exploratory proxy rather than a fake solve.
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
      ...unitMass({ id: "A", plateX: v.ax - 16, plateY: v.ay, plateW: 38, plateD: 27, garageX: v.ax, garageY: v.ay + 2, garageW: 22, garageD: 22 }),
      ...unitMass({ id: "B", plateX: v.bx - 14, plateY: v.by, plateW: 38, plateD: 27, garageX: v.bx + 2, garageY: v.by + 1, garageW: 22, garageD: 22 })
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
