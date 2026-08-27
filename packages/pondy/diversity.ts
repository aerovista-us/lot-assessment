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
  garageW?: number;
  garageD?: number;
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
      widthFt: args.garageW ?? 20,
      depthFt: args.garageD ?? 20,
      movable: true,
      movementLimitFt: 2,
      // A detached garage still belongs to the unit. Sharing the unit group lets the
      // program gate count it without implying that it overlaps the home in plan.
      integrationGroupId: group,
      circulationObstacle: true
    }
  ];
}

/**
 * D2 — Mid Detached Garage
 * The rear home is a clean detached-garage plate. The garage occupies the otherwise
 * awkward center gap and is reached from a shallow diagonal north-side approach rather
 * than the long side-spine/horizontal garage approach of Design 1.
 */
export const midDetachedGarage: FamilySearch = {
  id: "mid-detached-garage",
  variables: [
    { id: "frontX", min: 82.5, max: 83.5, step: 0.5 },
    { id: "rearX", min: 25, max: 25.5, step: 0.5 },
    { id: "garageBX", min: 61.5, max: 62.5, step: 0.5 },
    { id: "garageBY", min: 12.5, max: 13, step: 0.5 },
    { id: "startY", min: 39.5, max: 41, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => ({
    id: `PONDY-MDG2-${serial}`,
    family: "mid-detached-garage",
    placements: [
      ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 26.2, garageX: 108, garageY: 7 }),
      ...unitMass({ id: "B", plateX: v.rearX, plateY: 5, plateW: 36.5, plateD: 27, garageX: v.garageBX, garageY: v.garageBY })
    ],
    drives: [
      { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
      { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.startY], [v.garageBX + 10, v.garageBY + 20]], movableControlPoints: [] }
    ],
    metadata: {
      topology: "mid-detached-north-approach",
      designGroup: "mid-detached",
      designIntent: "detached-center-garage-shallow-diagonal",
      intendedLivingA: 1800,
      intendedLivingB: 1800
    }
  })
};

/**
 * D3 — Rear North-Door
 * The rear garage remains integrated with the rear home, but the garage opening is on
 * the north side. A direct shallow diagonal bypasses the front house instead of using
 * the proven side-spine then turning horizontally into the garage.
 */
export const rearNorthDoor: FamilySearch = {
  id: "rear-north-door",
  variables: [
    { id: "frontX", min: 82.5, max: 83.5, step: 0.5 },
    { id: "rearX", min: 25, max: 25.5, step: 0.5 },
    { id: "startY", min: 40, max: 41.5, step: 0.5 },
    { id: "garageBY", min: 12.5, max: 13, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearEast = v.rearX + 37;
    return {
      id: `PONDY-RND-${serial}`,
      family: "rear-north-door",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: 26.2, garageX: 108, garageY: 7 }),
        ...unitMass({
          id: "B",
          plateX: v.rearX,
          plateY: 5,
          plateW: 37,
          plateD: 27,
          garageX: rearEast - 20,
          garageY: v.garageBY,
          wings: [{ id: "EAST-WING", x: rearEast, y: 5, widthFt: 10, depthFt: 17.5 }]
        })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.startY], [rearEast - 10, v.garageBY + 20]], movableControlPoints: [] }
      ],
      metadata: {
        topology: "rear-integrated-north-door",
        designGroup: "rear-north-door",
        designIntent: "integrated-rear-garage-direct-north-approach",
        intendedLivingA: 1800,
        intendedLivingB: 1800
      }
    };
  }
};

/**
 * D4 — Dual North Approach
 * Both garage doors are treated as north-facing. The street-side garage is raised to
 * the north edge of the front home so its approach never passes through residual house
 * mass; the rear garage remains detached in the middle gap. Two shallow diagonals replace
 * the long edge spine entirely.
 */
export const dualNorthApproach: FamilySearch = {
  id: "dual-north-approach",
  variables: [
    { id: "frontX", min: 82.5, max: 83.5, step: 0.5 },
    { id: "garageBX", min: 61.5, max: 62.5, step: 0.5 },
    { id: "garageBY", min: 12.5, max: 13, step: 0.5 },
    { id: "driveAY", min: 37, max: 39, step: 0.5 },
    { id: "driveBY", min: 40, max: 41.5, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => {
    const frontDepth = 26.2;
    const garageAY = 5 + frontDepth - 20;
    return {
      id: `PONDY-DNA-${serial}`,
      family: "dual-north-approach",
      placements: [
        ...unitMass({ id: "A", plateX: v.frontX, plateY: 5, plateW: 128 - v.frontX, plateD: frontDepth, garageX: 108, garageY: garageAY }),
        ...unitMass({ id: "B", plateX: 25, plateY: 5, plateW: 36.5, plateD: 27, garageX: v.garageBX, garageY: v.garageBY })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, v.driveAY], [118, garageAY + 20]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.driveBY], [v.garageBX + 10, v.garageBY + 20]], movableControlPoints: [] }
      ],
      metadata: {
        topology: "dual-north-diagonal",
        designGroup: "dual-north",
        designIntent: "two-north-facing-garages-no-side-spine",
        intendedLivingA: 1800,
        intendedLivingB: 1800
      }
    };
  }
};

/**
 * D5 — Offset Court
 * A low west wing lets the front unit meet program capacity without filling the upper
 * maneuvering zone. The rear garage faces east into the central gap and receives a
 * genuine curved approach after the vehicle clears the taller front mass.
 */
export const offsetCourt: FamilySearch = {
  id: "offset-court",
  variables: [
    { id: "frontX", min: 87.5, max: 88.5, step: 0.5 },
    { id: "courtX", min: 86, max: 89, step: 1 },
    { id: "spineY", min: 39, max: 40.5, step: 0.5 },
    { id: "rearGarageY", min: 5, max: 6, step: 0.5 }
  ],
  build: (v, serial): PlacementCandidate => {
    const rearX = 25;
    const rearEast = 62;
    return {
      id: `PONDY-OC2-${serial}`,
      family: "offset-court",
      placements: [
        ...unitMass({
          id: "A",
          plateX: v.frontX,
          plateY: 5,
          plateW: 128 - v.frontX,
          plateD: 26.2,
          garageX: 108,
          garageY: 7,
          wings: [{ id: "LOW-WEST", x: v.frontX - 10, y: 5, widthFt: 10, depthFt: 13 }]
        }),
        ...unitMass({
          id: "B",
          plateX: rearX,
          plateY: 5,
          plateW: 37,
          plateD: 27,
          garageX: rearEast - 10,
          garageY: v.rearGarageY,
          wings: [{ id: "EAST-WING", x: rearEast, y: 5, widthFt: 10, depthFt: 17.5 }]
        })
      ],
      drives: [
        { id: "DRIVE-A", garageId: "GARAGE-A", points: [[151, 17], [128, 17]], movableControlPoints: [] },
        { id: "DRIVE-B", garageId: "GARAGE-B", points: [[151, v.spineY], [v.courtX, v.spineY], [rearEast + 10, v.rearGarageY + 10]], movableControlPoints: [1], controlPointLimitFt: 2 }
      ],
      metadata: {
        topology: "offset-court-east-door",
        designGroup: "offset-court",
        designIntent: "central-court-curved-rear-garage-approach",
        intendedLivingA: 1800,
        intendedLivingB: 1800
      }
    };
  }
};

export const diversityFamilies: FamilySearch[] = [
  midDetachedGarage,
  rearNorthDoor,
  dualNorthApproach,
  offsetCourt
];
