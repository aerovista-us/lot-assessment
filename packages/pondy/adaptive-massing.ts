import type { FamilySearch } from "@/packages/optimizer";
import type { PlacementCandidate } from "@/packages/placement";

type HomePiece = { id: string; x: number; y: number; widthFt: number; depthFt: number };

const GARAGE_LONG_FT = 23;
const GARAGE_CROSS_FT = 22;

function homePiece(unit: "A" | "B", piece: HomePiece) {
  return {
    id: piece.id,
    kind: "home" as const,
    x: piece.x,
    y: piece.y,
    widthFt: piece.widthFt,
    depthFt: piece.depthFt,
    movable: true,
    movementLimitFt: 2,
    integrationGroupId: `unit-${unit}`,
    circulationObstacle: false
  };
}

function garage(unit: "A" | "B", x: number, y: number) {
  return {
    id: `GARAGE-${unit}`,
    kind: "garage" as const,
    x,
    y,
    widthFt: GARAGE_LONG_FT,
    depthFt: GARAGE_CROSS_FT,
    movable: true,
    movementLimitFt: 2,
    integrationGroupId: `unit-${unit}`,
    circulationObstacle: true
  };
}

function rearUnit() {
  return [
    homePiece("B", { id: "HOME-B", x: 25, y: 5, widthFt: 29, depthFt: 32.5 }),
    homePiece("B", { id: "HOME-B-EAST-WING", x: 54, y: 5, widthFt: 24, depthFt: 12 }),
    garage("B", 31, 15)
  ];
}

function frontGarage() {
  return garage("A", 105, 7);
}

function rearDrive(spineY: number, turnX: number, bendY: number) {
  return {
    id: "DRIVE-B",
    garageId: "GARAGE-B",
    points: [[151, spineY], [turnX, spineY], [66, bendY], [54, 26]] as Array<[number, number]>,
    movableControlPoints: [1, 2],
    controlPointLimitFt: 2
  };
}

const frontDrive = {
  id: "DRIVE-A",
  garageId: "GARAGE-A",
  points: [[151, 18], [128, 18]] as Array<[number, number]>,
  movableControlPoints: [] as number[]
};

function adaptiveFamily(args: {
  id: string;
  prefix: string;
  intent: string;
  front: () => ReturnType<typeof homePiece>[];
}): FamilySearch {
  return {
    id: args.id,
    variables: [
      { id: "spineY", min: 37, max: 38, step: 0.5 },
      { id: "turnX", min: 79, max: 81, step: 1 },
      { id: "bendY", min: 26, max: 27, step: 0.5 }
    ],
    build: (v, serial): PlacementCandidate => ({
      id: `${args.prefix}-${serial}`,
      family: args.id,
      placements: [...args.front(), frontGarage(), ...rearUnit()],
      drives: [frontDrive, rearDrive(v.spineY, v.turnX, v.bendY)],
      metadata: {
        topology: `${args.id}-23x22`,
        designGroup: args.id,
        designIntent: args.intent,
        intendedLivingA: 1800,
        intendedLivingB: 1800,
        garageStandard: "23x22",
        adaptiveBuildingTranslation: true,
        adaptiveBuildingReproportioning: true,
        mobilitySeed: "run85-deep-narrow-hard-pass",
        capacityTargetSqFt: 1944,
        movementPolicy: "move/re-proportion building mass before adding pavement"
      }
    })
  };
}

export const adaptiveDeepNarrow = adaptiveFamily({
  id: "adaptive-deep-narrow",
  prefix: "PONDY-ADN",
  intent: "deep-narrow-front-with-capacity-ready-rear-wing",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 79, y: 5, widthFt: 49, depthFt: 25 })
  ]
});

export const adaptiveFrontL = adaptiveFamily({
  id: "adaptive-front-l",
  prefix: "PONDY-AFL",
  intent: "front-L-with-capacity-ready-rear-wing",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 96, y: 5, widthFt: 32, depthFt: 25 }),
    homePiece("A", { id: "HOME-A-LOW-WEST", x: 78, y: 5, widthFt: 18, depthFt: 24 })
  ]
});

export const adaptiveBalanced = adaptiveFamily({
  id: "adaptive-balanced",
  prefix: "PONDY-AB",
  intent: "balanced-front-block-with-capacity-ready-rear-wing",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 82, y: 5, widthFt: 46, depthFt: 27 })
  ]
});

export const adaptiveCompact = adaptiveFamily({
  id: "adaptive-compact",
  prefix: "PONDY-AC",
  intent: "compact-deep-front-block-with-capacity-ready-rear-wing",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 83, y: 5, widthFt: 45, depthFt: 28 })
  ]
});

export const adaptiveStepped = adaptiveFamily({
  id: "adaptive-stepped",
  prefix: "PONDY-AS",
  intent: "stepped-front-massing-with-capacity-ready-rear-wing",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 92, y: 5, widthFt: 36, depthFt: 27 }),
    homePiece("A", { id: "HOME-A-WEST-STEP", x: 78, y: 5, widthFt: 14, depthFt: 20 })
  ]
});

export const adaptiveFamilies: FamilySearch[] = [
  adaptiveDeepNarrow,
  adaptiveFrontL,
  adaptiveBalanced,
  adaptiveCompact,
  adaptiveStepped
];
