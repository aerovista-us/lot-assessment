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
  points: [[151, 18], [128, 18]] as Array<[number, number]>,
  movableControlPoints: [] as number[]
};

function provenRearDrive(spineY: number, turnX: number, bendX: number, bendY: number, mouthX: number, mouthY: number) {
  return {
    id: "DRIVE-B",
    garageId: "GARAGE-B",
    points: [[151, spineY], [turnX, spineY], [bendX, bendY], [mouthX, mouthY]] as Array<[number, number]>,
    movableControlPoints: [1, 2],
    controlPointLimitFt: 1.5
  };
}

/**
 * D2 — Compact Front Block.
 * Keeps the proven north access corridor but changes the street-side mass from the
 * long 49x25 plate into a deeper 40x29.3 block. The rear unit retains the proven
 * garage-mouth relationship so this run isolates whether a materially different front
 * house proportion can coexist with the same circulation truth.
 */
export const compactFrontBlock: FamilySearch = {
  id: "compact-front-block",
  variables: [
    { id: "spineY", min: 39, max: 40, step: 0.5 },
    { id: "turnX", min: 81, max: 83, step: 1 },
    { id: "bendY", min: 27.5, max: 28.5, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-CFB-${serial}`,
    family: "compact-front-block",
    placements: [
      ...unitMass({ id: "A", plateX: 88, plateY: 5, plateW: 40, plateD: 29.3, garageX: 108, garageY: 8 }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 32, plateD: 32.5,
        garageX: 37, garageY: 16,
        wings: [{ id: "EAST-WING", x: 57, y: 5, widthFt: 16, depthFt: 10 }]
      })
    ],
    drives: [frontStreetDrive, provenRearDrive(v.spineY, v.turnX, 68, v.bendY, 57, 26)],
    metadata: {
      topology: "compact-front-block-proven-rear-mouth",
      designGroup: "compact-front-block",
      designIntent: "deeper-street-home-same-proven-rear-access",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D3 — Deep Narrow Rear.
 * The front block remains compact, while Unit B becomes a deeper/narrower primary mass
 * with a low east wing. The garage is shifted two feet west and the terminal approach
 * follows it, producing a visibly different rear-house/garage relationship while staying
 * inside the proven access corridor.
 */
export const deepNarrowRear: FamilySearch = {
  id: "deep-narrow-rear",
  variables: [
    { id: "spineY", min: 39, max: 40, step: 0.5 },
    { id: "turnX", min: 81, max: 83, step: 1 },
    { id: "bendY", min: 28, max: 29, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-DNR-${serial}`,
    family: "deep-narrow-rear",
    placements: [
      ...unitMass({ id: "A", plateX: 88, plateY: 5, plateW: 40, plateD: 29.3, garageX: 108, garageY: 8 }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 29, plateD: 34,
        garageX: 34, garageY: 16,
        wings: [{ id: "EAST-WING", x: 54, y: 5, widthFt: 16, depthFt: 12 }]
      })
    ],
    drives: [frontStreetDrive, provenRearDrive(v.spineY, v.turnX, 66, v.bendY, 54, 26)],
    metadata: {
      topology: "deep-narrow-rear-west-garage",
      designGroup: "deep-narrow-rear",
      designIntent: "deeper-rear-home-garage-shifted-west",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D4 — Front L / Rear Standard.
 * Unit A becomes a compact east block plus a low west wing, creating an L-shaped street
 * residence and a larger visual break between its upper mass and the rear access lane.
 * The rear geometry stays near the proven control so any failure is attributable to the
 * L-shaped front mass rather than an invented rear turn.
 */
export const frontLRearStandard: FamilySearch = {
  id: "front-l-rear-standard",
  variables: [
    { id: "spineY", min: 38.5, max: 39.5, step: 0.5 },
    { id: "turnX", min: 78, max: 80, step: 1 },
    { id: "bendY", min: 27, max: 28, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-FLRS-${serial}`,
    family: "front-l-rear-standard",
    placements: [
      ...unitMass({
        id: "A", plateX: 96, plateY: 5, plateW: 32, plateD: 25,
        garageX: 108, garageY: 8,
        wings: [{ id: "LOW-WEST", x: 82, y: 5, widthFt: 14, depthFt: 23 }]
      }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 32, plateD: 32.5,
        garageX: 37, garageY: 16,
        wings: [{ id: "EAST-WING", x: 57, y: 5, widthFt: 16, depthFt: 10 }]
      })
    ],
    drives: [frontStreetDrive, provenRearDrive(v.spineY, v.turnX, 68, v.bendY, 57, 26)],
    metadata: {
      topology: "front-l-low-west-wing",
      designGroup: "front-l-rear-standard",
      designIntent: "front-L-massing-proven-rear-access",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

/**
 * D5 — Balanced Twin Blocks.
 * Both residences use relatively compact primary plates rather than one long front and
 * one broad rear rectangle. The rear wing grows to the east while the garage remains in
 * the proven western mouth. This is deliberately a massing alternative, not a fake new
 * driveway topology.
 */
export const balancedTwinBlocks: FamilySearch = {
  id: "balanced-twin-blocks",
  variables: [
    { id: "spineY", min: 39, max: 40, step: 0.5 },
    { id: "turnX", min: 80, max: 82, step: 1 },
    { id: "bendY", min: 27.5, max: 28.5, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-BTB-${serial}`,
    family: "balanced-twin-blocks",
    placements: [
      ...unitMass({ id: "A", plateX: 88, plateY: 5, plateW: 40, plateD: 29.3, garageX: 108, garageY: 8 }),
      ...unitMass({
        id: "B", plateX: 25, plateY: 5, plateW: 30, plateD: 33,
        garageX: 35, garageY: 16,
        wings: [{ id: "EAST-WING", x: 55, y: 5, widthFt: 18, depthFt: 11 }]
      })
    ],
    drives: [frontStreetDrive, provenRearDrive(v.spineY, v.turnX, 67, v.bendY, 55, 26)],
    metadata: {
      topology: "balanced-primary-blocks",
      designGroup: "balanced-twin-blocks",
      designIntent: "compact-balanced-massing-with-proven-corridor",
      intendedLivingA: 1800, intendedLivingB: 1800
    }
  })
};

export const diversityFamilies: FamilySearch[] = [
  compactFrontBlock,
  deepNarrowRear,
  frontLRearStandard,
  balancedTwinBlocks
];
