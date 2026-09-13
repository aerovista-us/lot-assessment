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
 * Design #2 rotation spike. Keep the northern garage essentially where the vertical
 * stack fits the accessory envelope, toe the southern garage only a few degrees toward
 * its arriving path, and move the connected duplex east enough to preserve a real
 * vehicle corridor. The final south-garage approach is constructed on the rotated
 * garage longitudinal axis so the solver no longer has to invent a sharp last steering
 * correction immediately before the door.
 *
 * The family intentionally retains id `rear-garage-stack` so the ranked benchmark uses
 * the detached-accessory envelope and principal-home containment policy already applied
 * to Design #2. `designIntent` keeps it a distinct concept for evidence comparison.
 */
export const rotatedRearGarageStack: FamilySearch = {
  id: "rear-garage-stack",
  variables: [
    { id: "angleDeg", min: 2, max: 4, step: 2 },
    { id: "spineY", min: 37.5, max: 38.5, step: 0.5 },
    { id: "turnX", min: 72, max: 76, step: 2 }
  ],
  build: (v, serial): PlacementCandidate => {
    const garageX = 5.8;
    const garageSouthY = 5.8;
    const garageNorthY = 29;
    const garageSize = 22;
    const angleRad = v.angleDeg * Math.PI / 180;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    const southCenterX = garageX + garageSize / 2;
    const southCenterY = garageSouthY + garageSize / 2;
    const southDoor: [number, number] = [southCenterX + garageSize / 2 * c, southCenterY + garageSize / 2 * s];
    const southAlign: [number, number] = [southDoor[0] + 27 * c, southDoor[1] + 27 * s];
    const northDoor: [number, number] = [garageX + garageSize, garageNorthY + garageSize / 2];
    const northAlign: [number, number] = [55, northDoor[1]];
    const duplexX = 62.5;
    const partyX = 95;
    const partyGap = 0.04;

    return {
      id: `PONDY-RGSROT-${serial}`,
      family: "rear-garage-stack",
      placements: [
        { id: "HOME-B", kind: "home", x: duplexX, y: 5, widthFt: partyX - duplexX - partyGap, depthFt: 28, movable: false, integrationGroupId: "unit-B", circulationObstacle: false },
        { id: "HOME-A", kind: "home", x: partyX, y: 5, widthFt: 128 - partyX, depthFt: 28, movable: false, integrationGroupId: "unit-A", circulationObstacle: false },
        { id: "GARAGE-A", kind: "garage", x: garageX, y: garageSouthY, widthFt: garageSize, depthFt: garageSize, rotationDeg: v.angleDeg, rotationLimitDeg: 5, movable: false, integrationGroupId: "unit-A", circulationObstacle: true },
        { id: "GARAGE-B", kind: "garage", x: garageX, y: garageNorthY, widthFt: garageSize, depthFt: garageSize, movable: false, integrationGroupId: "unit-B", circulationObstacle: true }
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.spineY], [v.turnX, v.spineY], southAlign, southDoor], movableControlPoints: [1, 2], controlPointLimitFt: 2 },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], northAlign, northDoor], movableControlPoints: [1, 2], controlPointLimitFt: 2 }
      ],
      metadata: {
        topology: "accessory-rear-stack-rotated-south-garage",
        designGroup: "rear-garage-stack-rotation-spike",
        designIntent: "owner-rear-stack-rotated-south-garage",
        intendedLivingA: 1800,
        intendedLivingB: 1800,
        garageStandard: "22x22",
        southGarageRotationDeg: v.angleDeg,
        garageAccessoryHypothesis: true,
        accessoryRearSetbackFt: 5,
        accessorySideSetbackFt: 5,
        duplexConnected: true,
        duplexPartyWallIntent: true,
        rotationSpike: true,
        movementPolicy: "rotate detached garage toward arrival and translate/re-proportion residential mass to preserve the proven swept corridor"
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
