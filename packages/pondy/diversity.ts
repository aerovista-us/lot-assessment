import { FamilySearch } from "@/packages/optimizer";
import { PlacementCandidate } from "@/packages/placement";

type Wing = { id: string; x: number; y: number; widthFt: number; depthFt: number };

function unitMass(args: {
  id: "A" | "B";
  plateX: number;
  plateY: number;
  plateW: number;
  plateD: number;
  garageX: number;
  garageY: number;
  wings?: Wing[];
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
    ...(args.wings ?? []).map((wing) => ({
      id: `HOME-${args.id}-${wing.id}`,
      kind: "home" as const,
      x: wing.x,
      y: wing.y,
      widthFt: wing.widthFt,
      depthFt: wing.depthFt,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      circulationObstacle: false
    })),
    {
      id: `GARAGE-${args.id}`,
      kind: "garage" as const,
      x: args.garageX,
      y: args.garageY,
      widthFt: 20,
      depthFt: 20,
      movable: true,
      movementLimitFt: 2,
      integrationGroupId: group,
      circulationObstacle: true
    }
  ];
}

const frontStreetDrive = {
  id: "DRIVE-A",
  garageId: "GARAGE-A",
  points: [[151, 17], [128, 17]] as Array<[number, number]>,
  movableControlPoints: [] as number[]
};

/**
 * D2 — Mid Detached Garage.
 * A low L-shaped street unit preserves the north access corridor. Unit B becomes a
 * tall/narrow rear home with its two-car garage detached in the center gap. The terminal
 * approach is nearly horizontal so the garage is genuinely reachable rather than merely
 * intersected by a diagonal swept path.
 */
export const midDetachedGarage: FamilySearch = {
  id: "mid-detached-garage",
  variables: [
    { id: "spineY", min: 38, max: 39, step: 0.5 },
    { id: "turnX", min: 94, max: 96, step: 1 },
    { id: "alignX", min: 76, max: 78, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-MDG3-${serial}`,
    family: "mid-detached-garage",
    placements: [
      ...unitMass({
        id: "A", plateX: 83, plateY: 5, plateW: 45, plateD: 22,
        garageX: 108, garageY: 7,
        wings: [{ id: "LOW-WEST", x: 69, y: 5, widthFt: 14, depthFt: 13 }]
      }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 27, plateD: 33.15,
        garageX: 52, garageY: 14.7,
        wings: [{ id: "LOW-EAST", x: 52, y: 5, widthFt: 8, depthFt: 9.62 }]
      })
    ],
    drives: [
      frontStreetDrive,
      {
        id: "DRIVE-B", garageId: "GARAGE-B",
        points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, 26], [72, 24.7]],
        movableControlPoints: [1, 2], controlPointLimitFt: 1.5
      }
    ],
    metadata: {
      topology: "mid-detached-horizontal-mouth",
      designGroup: "mid-detached",
      designIntent: "detached-center-garage-low-front-L",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D3 — Rear Attached L.
 * The same corridor is spent differently: the rear house grows east along the south edge
 * and physically meets the garage, forming a compact rear L. This trades some private
 * rear yard geometry for an attached garage relationship without reverting to Design 1.
 */
export const rearAttachedL: FamilySearch = {
  id: "rear-attached-l",
  variables: [
    { id: "spineY", min: 38, max: 39, step: 0.5 },
    { id: "turnX", min: 93, max: 95, step: 1 },
    { id: "alignX", min: 76, max: 78, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-RAL-${serial}`,
    family: "rear-attached-l",
    placements: [
      ...unitMass({
        id: "A", plateX: 83, plateY: 5, plateW: 45, plateD: 22,
        garageX: 108, garageY: 7,
        wings: [{ id: "LOW-WEST", x: 69, y: 5, widthFt: 14, depthFt: 13 }]
      }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 27, plateD: 33.15,
        garageX: 52, garageY: 14.7,
        wings: [{ id: "GARAGE-LINK", x: 52, y: 5, widthFt: 20, depthFt: 9.6 }]
      })
    ],
    drives: [
      frontStreetDrive,
      {
        id: "DRIVE-B", garageId: "GARAGE-B",
        points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, 26], [72, 24.7]],
        movableControlPoints: [1, 2], controlPointLimitFt: 1.5
      }
    ],
    metadata: {
      topology: "rear-attached-l-horizontal-mouth",
      designGroup: "rear-attached-l",
      designIntent: "rear-L-attached-center-garage",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D4 — Long Wing / Short Spine.
 * The street unit is radically re-proportioned: a compact 32x22 primary mass sits near
 * Pennsylvania while a long low wing extends west below the turning zone. That opens
 * enough high-level clearance to move the rear garage ten feet east and shorten the deep
 * access run.
 */
export const longWingShortSpine: FamilySearch = {
  id: "long-wing-short-spine",
  variables: [
    { id: "spineY", min: 38, max: 39, step: 0.5 },
    { id: "turnX", min: 104, max: 106, step: 1 },
    { id: "alignX", min: 87, max: 89, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-LWSS-${serial}`,
    family: "long-wing-short-spine",
    placements: [
      ...unitMass({
        id: "A", plateX: 96, plateY: 5, plateW: 32, plateD: 22,
        garageX: 108, garageY: 7,
        wings: [{ id: "LONG-LOW-WEST", x: 65, y: 5, widthFt: 31, depthFt: 15.1 }]
      }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 27, plateD: 33.15,
        garageX: 62, garageY: 14.7,
        wings: [{ id: "LOW-EAST", x: 52, y: 5, widthFt: 8, depthFt: 9.62 }]
      })
    ],
    drives: [
      frontStreetDrive,
      {
        id: "DRIVE-B", garageId: "GARAGE-B",
        points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, 26], [82, 24.7]],
        movableControlPoints: [1, 2], controlPointLimitFt: 1.5
      }
    ],
    metadata: {
      topology: "long-low-front-wing-short-spine",
      designGroup: "long-wing-short-spine",
      designIntent: "compact-front-primary-central-rear-garage",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D5 — Deep Rear Court.
 * Unit B becomes the deepest/narrowest primary plate in the set and its garage moves
 * farther west. Unit A uses a medium low wing, leaving a visibly larger open middle zone.
 * The access corridor is shared with Design 1, but the building/garage relationships are
 * materially different and the rear approach terminates farther west.
 */
export const deepRearCourt: FamilySearch = {
  id: "deep-rear-court",
  variables: [
    { id: "spineY", min: 38, max: 39, step: 0.5 },
    { id: "turnX", min: 92, max: 94, step: 1 },
    { id: "alignX", min: 74, max: 76, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-DRC-${serial}`,
    family: "deep-rear-court",
    placements: [
      ...unitMass({
        id: "A", plateX: 92, plateY: 5, plateW: 36, plateD: 22,
        garageX: 108, garageY: 7,
        wings: [{ id: "LOW-WEST", x: 70, y: 5, widthFt: 22, depthFt: 17.28 }]
      }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 25, plateD: 33.55,
        garageX: 49, garageY: 15.45,
        wings: [{ id: "LOW-EAST", x: 50, y: 5, widthFt: 13, depthFt: 10.4 }]
      })
    ],
    drives: [
      frontStreetDrive,
      {
        id: "DRIVE-B", garageId: "GARAGE-B",
        points: [[151, v.spineY], [v.turnX, v.spineY], [v.alignX, 27], [69, 25.45]],
        movableControlPoints: [1, 2], controlPointLimitFt: 1.5
      }
    ],
    metadata: {
      topology: "deep-narrow-rear-open-court",
      designGroup: "deep-rear-court",
      designIntent: "deep-rear-primary-west-garage-open-middle",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

export const diversityFamilies: FamilySearch[] = [
  midDetachedGarage,
  rearAttachedL,
  longWingShortSpine,
  deepRearCourt
];
