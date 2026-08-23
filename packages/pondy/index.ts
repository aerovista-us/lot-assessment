import { FULL_SIZE_SUV } from "@/packages/circulation";
import { Point, insetPolygonBySegment } from "@/packages/geometry";
import { FamilySearch } from "@/packages/optimizer";
import { PlacementCandidate, PlacementProblem } from "@/packages/placement";

export const PONDY_SURVEY: Point[] = [
  [0, 0], [148, 0], [148, 50], [125.143, 43.016], [84.813, 43.016], [0, 57.01]
];

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
      // Benchmark plate represents two-story/overhead living capacity. Ground-level
      // walls are resolved by the program layer; do not falsely block garage entry.
      circulationObstacle: false
    },
    {
      id: `GARAGE-${args.id}`,
      kind: "garage" as const,
      x: args.garageX,
      y: args.garageY,
      widthFt: 22,
      depthFt: 22,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      circulationObstacle: true
    }
  ];
}

/**
 * Family 1: Pondy-derived Z/staggered geometry. This is not the historical design;
 * it uses the same circulation lesson as a parameterized search family.
 */
export const staggeredSpine: FamilySearch = {
  id: "staggered-spine",
  variables: [
    { id: "ax", min: 94, max: 104, step: 2 },
    { id: "ay", min: 5, max: 9, step: 2 },
    { id: "bx", min: 25, max: 35, step: 2 },
    { id: "by", min: 5, max: 11, step: 2 },
    { id: "gby", min: 13, max: 19, step: 2 },
    { id: "spineY", min: 34, max: 39, step: 1 },
    { id: "turnX", min: 72, max: 86, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-Z-${serial}`,
    family: "staggered-spine",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax, plateY: v.ay, plateW: 30, plateD: 28, garageX: v.ax + 8, garageY: v.ay }),
      ...unitMass({ id: "B", plateX: v.bx, plateY: v.by, plateW: 32, plateD: 28, garageX: v.bx, garageY: v.gby })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.ay + 11], [v.ax + 30, v.ay + 11]], movableControlPoints: [], controlPointLimitFt: 0 },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 22, v.gby + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "staggered", intendedLivingA: 1680, intendedLivingB: 1792 }
  })
};

/** Family 2: both garages east-facing, with the rear unit shifted north/south independently. */
export const dualEastGarages: FamilySearch = {
  id: "dual-east-garages",
  variables: [
    { id: "ax", min: 96, max: 106, step: 2 },
    { id: "ay", min: 5, max: 9, step: 2 },
    { id: "bx", min: 28, max: 42, step: 2 },
    { id: "by", min: 5, max: 13, step: 2 },
    { id: "spineY", min: 34, max: 39, step: 1 },
    { id: "turnX", min: 70, max: 88, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-EE-${serial}`,
    family: "dual-east-garages",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 6, plateY: v.ay, plateW: 34, plateD: 28, garageX: v.ax, garageY: v.ay + 3 }),
      ...unitMass({ id: "B", plateX: v.bx - 8, plateY: v.by, plateW: 34, plateD: 28, garageX: v.bx + 4, garageY: v.by + 3 })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.ay + 14], [v.ax + 22, v.ay + 14]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 26, v.by + 14]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "dual-east", intendedLivingA: 1768, intendedLivingB: 1768 }
  })
};

/** Family 3: compact front unit plus broader rear plate, favoring yard and unit separation. */
export const frontRearSplit: FamilySearch = {
  id: "front-rear-split",
  variables: [
    { id: "ax", min: 98, max: 106, step: 2 },
    { id: "bx", min: 25, max: 37, step: 2 },
    { id: "bgy", min: 14, max: 20, step: 2 },
    { id: "spineY", min: 34, max: 39, step: 1 },
    { id: "turnX", min: 72, max: 90, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-FR-${serial}`,
    family: "front-rear-split",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 4, plateY: 5, plateW: 32, plateD: 27, garageX: v.ax + 6, garageY: 5 }),
      ...unitMass({ id: "B", plateX: v.bx, plateY: 5, plateW: 36, plateD: 28, garageX: v.bx + 6, garageY: v.bgy })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 16], [v.ax + 28, 16]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 28, v.bgy + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "front-rear", intendedLivingA: 1728, intendedLivingB: 1800 }
  })
};

/** Family 4: garage-forward front home, offset rear garage to reduce shared maneuver dependence. */
export const offsetGaragePair: FamilySearch = {
  id: "offset-garage-pair",
  variables: [
    { id: "ax", min: 99, max: 106, step: 1 },
    { id: "agy", min: 5, max: 11, step: 2 },
    { id: "bx", min: 25, max: 39, step: 2 },
    { id: "bgy", min: 13, max: 21, step: 2 },
    { id: "spineY", min: 35, max: 39, step: 1 },
    { id: "turnX", min: 70, max: 88, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-OG-${serial}`,
    family: "offset-garage-pair",
    placements: [
      ...unitMass({ id: "A", plateX: v.ax - 10, plateY: 5, plateW: 38, plateD: 28, garageX: v.ax, garageY: v.agy }),
      ...unitMass({ id: "B", plateX: v.bx, plateY: 5, plateW: 32, plateD: 28, garageX: v.bx + 2, garageY: v.bgy })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.agy + 11], [v.ax + 22, v.agy + 11]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.bx + 24, v.bgy + 11]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "offset-garages", intendedLivingA: 1824, intendedLivingB: 1728 }
  })
};

export const pondyFamilies: FamilySearch[] = [staggeredSpine, dualEastGarages, frontRearSplit, offsetGaragePair];
