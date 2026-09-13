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

/**
 * Corridor-aware rear mass. Keep the Run 85 primary plate and garage mouth, but hold
 * the east wing below the proven turning sweep. 24.6x11.5 preserves the 1.08 capacity
 * reserve while keeping the wing east edge below x=79 and its north edge at y=16.5.
 */
function rearUnit() {
  return [
    homePiece("B", { id: "HOME-B", x: 25, y: 5, widthFt: 29, depthFt: 32.5 }),
    homePiece("B", { id: "HOME-B-EAST-WING", x: 54, y: 5, widthFt: 24.6, depthFt: 11.5 }),
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
        corridorAwareMassing: true,
        mobilitySeed: "run85-deep-narrow-hard-pass",
        capacityTargetSqFt: 1944,
        movementPolicy: "preserve proven swept-path corridor; deform building mass around it before adding pavement"
      }
    })
  };
}

export const adaptiveDeepNarrow = adaptiveFamily({
  id: "adaptive-deep-narrow",
  prefix: "PONDY-ADN",
  intent: "deep-narrow-front-corridor-aware",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 79, y: 5, widthFt: 49, depthFt: 25 })
  ]
});

export const adaptiveFrontL = adaptiveFamily({
  id: "adaptive-front-l",
  prefix: "PONDY-AFL",
  intent: "front-L-corridor-aware",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 96, y: 5, widthFt: 32, depthFt: 25 }),
    homePiece("A", { id: "HOME-A-LOW-WEST", x: 79, y: 5, widthFt: 17, depthFt: 25 })
  ]
});

export const adaptiveBalanced = adaptiveFamily({
  id: "adaptive-balanced",
  prefix: "PONDY-AB",
  intent: "balanced-front-block-corridor-aware",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 82, y: 5, widthFt: 46, depthFt: 25 }),
    homePiece("A", { id: "HOME-A-WEST-STEP", x: 79, y: 5, widthFt: 3, depthFt: 25 })
  ]
});

export const adaptiveCompact = adaptiveFamily({
  id: "adaptive-compact",
  prefix: "PONDY-AC",
  intent: "compact-front-block-corridor-aware",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 84, y: 5, widthFt: 44, depthFt: 25 }),
    homePiece("A", { id: "HOME-A-WEST-STEP", x: 79, y: 5, widthFt: 5, depthFt: 25 })
  ]
});

export const adaptiveStepped = adaptiveFamily({
  id: "adaptive-stepped",
  prefix: "PONDY-AS",
  intent: "stepped-front-massing-corridor-aware",
  front: () => [
    homePiece("A", { id: "HOME-A", x: 92, y: 5, widthFt: 36, depthFt: 25 }),
    homePiece("A", { id: "HOME-A-WEST-STEP", x: 79, y: 5, widthFt: 13, depthFt: 25 })
  ]
});

/**
 * Design #2 orientation spike. The original vertical rear stack cannot simply rotate
 * farther because the upper 22x22 box collides with the sloped accessory envelope.
 * This version allows the garages themselves to move: two detached 22x22 garages are
 * staggered horizontally and rotated toward the north access corridor. Their door
 * approach legs are collinear with the garage longitudinal axes, eliminating the old
 * forced steering correction immediately before each door.
 *
 * The houses are temporarily kept shallow (top at y=30) so this spike answers the
 * circulation/orientation question independently. Program capacity is intentionally
 * still allowed to fail here; if the vehicle proof survives, the next pass can rebuild
 * the residential L-massing around the measured swept corridor rather than guessing.
 */
export const rotatedRearGarageStack: FamilySearch = {
  id: "rear-garage-stack",
  variables: [
    { id: "angleDeg", min: 45, max: 50, step: 5 },
    { id: "highY", min: 41.6, max: 41.8, step: 0.2 }
  ],
  build: (v, serial): PlacementCandidate => {
    const garageSize = 22;
    const garageAY = 10;
    const garageBY = 10;
    const garageAX = 10;
    const garageBX = 43;
    const angleRad = v.angleDeg * Math.PI / 180;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);

    const doorAndAlign = (x: number, y: number) => {
      const centerX = x + garageSize / 2;
      const centerY = y + garageSize / 2;
      const door: [number, number] = [centerX + garageSize / 2 * c, centerY + garageSize / 2 * s];
      const align: [number, number] = [door[0] + 13 * c, door[1] + 13 * s];
      return { door, align };
    };

    const a = doorAndAlign(garageAX, garageAY);
    const b = doorAndAlign(garageBX, garageBY);
    const duplexX = 72;
    const partyX = 100;
    const partyGap = 0.04;

    return {
      id: `PONDY-RGSROT-${serial}`,
      family: "rear-garage-stack",
      placements: [
        { id: "HOME-B", kind: "home", x: duplexX, y: 5, widthFt: partyX - duplexX - partyGap, depthFt: 25, movable: false, integrationGroupId: "unit-B", circulationObstacle: false },
        { id: "HOME-A", kind: "home", x: partyX, y: 5, widthFt: 128 - partyX, depthFt: 25, movable: false, integrationGroupId: "unit-A", circulationObstacle: false },
        { id: "GARAGE-A", kind: "garage", x: garageAX, y: garageAY, widthFt: garageSize, depthFt: garageSize, rotationDeg: v.angleDeg, rotationLimitDeg: 55, movable: false, integrationGroupId: "unit-A", circulationObstacle: true },
        { id: "GARAGE-B", kind: "garage", x: garageBX, y: garageBY, widthFt: garageSize, depthFt: garageSize, rotationDeg: v.angleDeg, rotationLimitDeg: 55, movable: false, integrationGroupId: "unit-B", circulationObstacle: true }
      ],
      drives: [
        {
          id: "DRIVE-A",
          garageId: "GARAGE-A",
          points: [[151, 38], [82, 38], [64, v.highY], [50, v.highY], a.align, a.door],
          movableControlPoints: [1, 2, 3, 4],
          controlPointLimitFt: 1.5
        },
        {
          id: "DRIVE-B",
          garageId: "GARAGE-B",
          points: [[151, 38], b.align, b.door],
          movableControlPoints: [1],
          controlPointLimitFt: 1.5
        }
      ],
      metadata: {
        topology: "accessory-rear-garages-diagonal-orientation-spike",
        designGroup: "rear-garage-stack-rotation-spike",
        designIntent: "owner-rear-garages-diagonal-access-proof",
        intendedLivingA: 1800,
        intendedLivingB: 1800,
        garageStandard: "22x22",
        garageRotationDeg: v.angleDeg,
        garageAccessoryHypothesis: true,
        accessoryRearSetbackFt: 5,
        accessorySideSetbackFt: 5,
        rotationSpike: true,
        diagnosticProgramCapacityPending: true,
        movementPolicy: "move and orient detached garages first, preserve the proven north vehicle corridor, then rebuild residential mass around the measured sweep"
      }
    };
  }
};

export const adaptiveFamilies: FamilySearch[] = [
  adaptiveDeepNarrow,
  adaptiveFrontL,
  adaptiveBalanced,
  adaptiveCompact,
  adaptiveStepped,
  rotatedRearGarageStack
];
