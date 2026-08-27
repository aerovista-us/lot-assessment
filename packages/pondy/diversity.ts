import { FamilySearch } from "@/packages/optimizer";
import { PlacementCandidate } from "@/packages/placement";

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
  integrated?: boolean;
}) {
  const group = `unit-${args.id}`;
  const integrated = args.integrated !== false;
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
      integrationGroupId: integrated ? group : undefined,
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
      integrationGroupId: integrated ? group : undefined,
      circulationObstacle: true
    }
  ];
}

/**
 * D1 — Interior Garage Pair
 * Homes remain front/rear, but both garage mouths are pulled toward the open middle gap.
 * This deliberately tests a shared center court rather than sending the rear vehicle deep
 * into the rear home mass.
 */
export const interiorGaragePair: FamilySearch = {
  id: "interior-garage-pair",
  variables: [
    { id: "frontX", min: 82, max: 86, step: 1 },
    { id: "rearX", min: 25, max: 27, step: 1 },
    { id: "rearW", min: 34, max: 37, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "courtX", min: 70, max: 76, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    return {
      id: `PONDY-IGP-${serial}`,
      family: "interior-garage-pair",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 24, garageX: v.frontX, garageY: 7 }),
        ...unitMass({ id: "B", plateX: v.rearX, plateY: 5, plateW: v.rearW, plateD: 32.5, garageX: rearEast - 20, garageY: 15.5 })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.spineY], [v.courtX + 22, v.spineY], [v.frontX, 17]], movableControlPoints: [1], controlPointLimitFt: 2 },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.courtX, v.spineY], [rearEast, 25.5]], movableControlPoints: [1], controlPointLimitFt: 2 }
      ],
      metadata: { topology: "interior-garage-pair", designIntent: "shared-center-court", intendedLivingA: 1800, intendedLivingB: 1800 }
    };
  }
};

/**
 * D2 — Mid Detached Rear Garage
 * The rear unit keeps its house far west, but its garage is detached in the center gap.
 * Vehicle travel stops earlier and the rear house is no longer shaped around a garage bay.
 */
export const midDetachedGarage: FamilySearch = {
  id: "mid-detached-garage",
  variables: [
    { id: "frontX", min: 88, max: 92, step: 1 },
    { id: "rearX", min: 25, max: 27, step: 1 },
    { id: "rearW", min: 35, max: 37, step: 1 },
    { id: "garageBX", min: 64, max: 68, step: 1 },
    { id: "garageBY", min: 15, max: 17, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "turnX", min: 80, max: 84, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-MDG-${serial}`,
    family: "mid-detached-garage",
    placements: [
      ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 25, garageX: 108, garageY: 7 }),
      ...unitMass({ id: "B", plateX: v.rearX, plateY: 5, plateW: v.rearW, plateD: 28, garageX: v.garageBX, garageY: v.garageBY, integrated: false })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.turnX, v.spineY], [v.garageBX + 20, v.garageBY + 10]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "mid-detached-garage", designIntent: "rear-house-clean-plate", intendedLivingA: 1800, intendedLivingB: 1800 }
  })
};

/**
 * D3 — Front Loaded Pair
 * Both garages are pulled toward Pennsylvania. Unit B's garage is detached and staggered
 * behind the street-side garage, reducing the amount of driveway penetrating the lot.
 */
export const frontLoadedPair: FamilySearch = {
  id: "front-loaded-pair",
  variables: [
    { id: "homeAX", min: 78, max: 82, step: 1 },
    { id: "homeBX", min: 25, max: 27, step: 1 },
    { id: "homeBW", min: 36, max: 38, step: 1 },
    { id: "garageBX", min: 86, max: 90, step: 1 },
    { id: "garageBY", min: 17, max: 19, step: 1 },
    { id: "driveBY", min: 31, max: 34, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-FLP-${serial}`,
    family: "front-loaded-pair",
    placements: [
      ...unitMass({ id: "A", plateX: v.homeAX, plateY: 5, plateW: 128 - v.homeAX, plateD: 22, garageX: 108, garageY: 5 }),
      ...unitMass({ id: "B", plateX: v.homeBX, plateY: 5, plateW: v.homeBW, plateD: 28, garageX: v.garageBX, garageY: v.garageBY, integrated: false })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 15], [128, 15]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.driveBY], [111, v.driveBY], [v.garageBX + 20, v.garageBY + 10]], movableControlPoints: [1], controlPointLimitFt: 3 }
    ],
    metadata: { topology: "front-loaded-pair", designIntent: "minimize-deep-pavement", intendedLivingA: 1800, intendedLivingB: 1800 }
  })
};

/**
 * D4 — Offset Court
 * A broad gap is intentionally reserved between the two houses. The rear garage sits at
 * the east end of the rear home while the front home is pushed farther toward the street,
 * creating a central maneuvering/courtyard zone rather than a long edge-only solution.
 */
export const offsetCourt: FamilySearch = {
  id: "offset-court",
  variables: [
    { id: "frontX", min: 94, max: 98, step: 1 },
    { id: "rearX", min: 25, max: 27, step: 1 },
    { id: "rearW", min: 36, max: 38, step: 1 },
    { id: "rearGarageY", min: 14, max: 17, step: 1 },
    { id: "spineY", min: 36.5, max: 38, step: 0.5 },
    { id: "courtX", min: 75, max: 82, step: 1 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + v.rearW;
    return {
      id: `PONDY-OC-${serial}`,
      family: "offset-court",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 30, garageX: 108, garageY: 7 }),
        ...unitMass({ id: "B", plateX: v.rearX, plateY: 5, plateW: v.rearW, plateD: 31, garageX: rearEast - 20, garageY: v.rearGarageY })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.courtX + 12, v.spineY], [v.courtX, v.rearGarageY + 10], [rearEast, v.rearGarageY + 10]], movableControlPoints: [1, 2], controlPointLimitFt: 3 }
      ],
      metadata: { topology: "offset-court", designIntent: "central-open-gap", intendedLivingA: 1800, intendedLivingB: 1800 }
    };
  }
};

export const diversityFamilies: FamilySearch[] = [
  interiorGaragePair,
  midDetachedGarage,
  frontLoadedPair,
  offsetCourt
];
