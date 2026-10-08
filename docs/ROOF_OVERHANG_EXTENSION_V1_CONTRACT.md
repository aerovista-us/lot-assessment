# Roof overhang extension v1 — geometry authority contract

Status: SPECIFICATION / NOT YET AUTHORIZED FOR CUSTOMER RENDERING

## Boundary

The existing LotScope roof SOT is the source of truth for clipped 3D roof faces, valleys, ridges, and plate edges. The existing fascia contract accepts zero overhang. **Never simulate nonzero projection by translating existing edges in an SVG.**

Nonzero eaves and rakes must first produce a new, independently validated **extended roof mesh** in world coordinates. Until then, the consumer receives `WITHHELD` and no fascia/eave edge.

## Inputs

- Locked owner polygon, current owner geometry key, validated roof zones, original solved 3D surface faces and junction segments
- Per-owner, traceably authored `eaveProjectionFt`, `rakeProjectionFt`, `fasciaDepthFt`, `fasciaThicknessFt`, and drainage/edge policy
- Owner topology signature, roof zone IDs, pitch/plane equations, and an explicit solver revision
- Source authority (architect-approved design or documented project design decision); no renderer defaults

## Required solver sequence

1. Reconfirm current locked roof geometry and canonical world-coordinate plane equations.
2. Identify external roof boundary half-edges and classify each as eave, rake, valley, ridge, or internal seam. Match by topology and geometric tolerance; forbid segments shared by more than two faces.
3. Extend eave support lines outward in plan by the approved distance **on the same original roof plane**. Extend rake end boundaries along the ridge direction according to the approved rake distance. A nonzero projection changes the actual 3D polygon, not merely its outline.
4. Intersect adjacent extended roof planes/halfspaces to solve corners. For cross-gables, recompute the intersection of extended roof planes and clip valley segments to the new visible roof envelope. Preserve continuous elevations to tolerance.
5. Clip and tessellate the resulting visible roof surface faces with deterministic IDs and winding. Calculate exact outside edges, fascia faces, and soffit boundary geometry from those newly solved vertices.
6. Check manifold topology, non-self-intersection, non-negative surface area, zero unintended holes, exact plane residuals, continuity across valleys, and source SOT dependency hash. The solved extension must fully enclose the original roof envelope without displacing any original ridge/valley geometry unless the explicit junction solution mathematically requires new intersections.
7. Publish `AUTHORITATIVE` only after all checks pass. On any failure publish `WITHHELD` plus diagnostics, **never** the original roof outline decorated with a fake offset.

## Acceptance fixtures

- Rectangular single gable: zero, small and unequal eave/rake projections; section and axon projected from the same extended vertices
- Rotated gable (including mirrored owner): world-normal projection without stale owner locks
- Home B two-gable T junction: extended plane intersections produce continuous, watertight, valley-correct mesh
- Boundary degeneracies: concave corner, near-zero edge, negative / NaN dimension, oversize projection, nonmanifold and duplicate faces must fail closed
- Owner edit and rotation must invalidate all prior extended roof locks
- Exactly matched 3D edge coordinates in elevations, sections, axon, and exported customer report
- Comparative golden-image browser QA at 1440, 1024, 768, and 390 pixels; no raster-only/hand-drawn roof edges

## Proposed schema

```ts
type RoofExtensionRequest = {
  source: string;
  ownerGeometryKey: string;
  sourceRoofMeshHash: string;
  eaveProjectionFt: number;
  rakeProjectionFt: number;
  fasciaDepthFt: number;
  fasciaThicknessFt: number;
};
type RoofExtensionResult =
  | { status: 'AUTHORITATIVE'; extendedFaces: RoofSurfaceFace[];
      junctions: RoofJunctionSolution[]; fasciaFaces: Polygon3[];
      soffitFaces: Polygon3[]; sourceRoofMeshHash: string; solverRev: string; }
  | { status: 'WITHHELD'; errors: string[]; };
```

## Phased release

- Phase A: create canonical half-edge boundary/edge classification with unit tests and read-only diagnostics, maintain zero-overhang contract.
- Phase B: solve rectangular one-gable extensions and fully validate their mesh.
- Phase C: solve cross-gable extension/valley intersections, including Home B.
- Phase D: publish extended mesh through roof SOT, update all view projectors from the same geometry, run rendered QA, then allow customer promotion.

No phase may be marked complete without passing its tests.