# Universal Design Engine — master architecture and acceptance

**Updated 2026-10-12.** PR #97 establishes the shared DesignDocument/editor, and PR #98 establishes reusable model-space floor/roof solving. These are not separate engines for Design 1, Design 4 or Design 5.

## End-to-end source chain

```text
Saved candidate + parcel, owner components, exact revision/signature
 → source-bound DesignDocument (DRAFT_UNVERIFIED geometry)
 → one shared floor/roof solver (checked geometry or REVIEW_REQUIRED)
 → private HTML customer report (same signature, all 22 evidence categories)
 → separately authorized roof gallery only from locked source roof
 → future Pondy sheet adapter and role-gated customer publishing
```

## Code owners

| Model | Implementation |
| --- | --- |
| Candidate geometry / source | `packages/candidates` and `placementPolygon` in `packages/roof-geometry/index.ts` |
| Design shapes, draft doors and pitched roof parameters | `packages/candidates/design-document.ts` |
| Common floor relationships, door fit, stair XY, gable/junction and sections | `packages/candidates/design-solving.ts` |
| Workbench editor | `components/workbench/UniversalDesignEditor.tsx` |
| Preview graphics and report attachment | `packages/candidates/design-solution-report.ts`, `design-report-attachment.ts`, `customer-report.ts` |
| Independent locked-roof authority | `packages/roof-geometry/index.ts`, `drawing-contract.ts`, `drawing-spatial.ts`, `eave-fascia.ts` |
| Future shared sheet adapter | Pondy sheet-document schema, currently NOT wired to draft browser-local candidates |

## Status semantics

| State | Model may assert | Never infer |
| --- | --- | --- |
| `DRAFT_UNVERIFIED` | Authored shape, room/roof specification | Valid room, roof lock, construction approval |
| `GEOMETRY_CHECKED` | Limited XY shared-wall, door fit or stair-reservation relationship | Door egress or stair-code acceptance |
| `MODEL_PREVIEW` | Source-compatible temporary gable faces, ridges, valleys, profile cuts and zero-overhang fascia | Persisted/locked roof |
| `REVIEW_REQUIRED` | Missing parameters, unsupported topology or ambiguous display | PASS |
| `WITHHELD` | Insufficient model proof | Imaginary finished view |
| `ROOF_GEOMETRY_LOCKED` | Independently validated source-current roof component and solved surfaces | Structural, drainage, snow, AHJ or permit approval |

**CONCEPT ONLY — NOT FOR CONSTRUCTION** always remains on customer output. A successful model check is deliberately weaker than architectural or professional acceptance.

## Current mathematical scope

- Shared walls are positive-length collinear overlaps of user-authored ROOM/CIRCULATION edges; room overlaps are flagged. Room packing and actual wall/framing thickness are NOT automatic.
- Authored door width/center can be fit-checked on a same-owner, same-story common wall. Door swing, access and emergency egress are NOT checked.
- Ground/upper stair reservation polygons can match in model XY; actual rise/run, landings, headroom and stair-code validation are NOT implemented.
- Source-contained rectangular GABLE_ZONE polygons can solve explicit rise/run pitch, plate Z and long/short ridge orientation. A single gable or two supported overlapping zones may solve source-aligned face geometry and valleys; wider/arbitrary topology is NOT proven.
- The fascia preview works for **zero overhang** with explicit dimensions. Nonzero proposed overhangs require unsolved source-surface extensions; report must withhold them.
- Section previews cut actual solved temporary roof faces in two directions. Complete coordinated floor/wall/foundation/roof building sections are NOT implemented.
- Analytic visibility intervals and drawing-grade acceptance are camera-specific; Home B edge-on ambiguity and physical signoff can remain open despite solved roof faces.

## Source/orientation guarantees

Bind every draft, compiled image and report to candidate/project/revision and component signature. A moved/flipped or modified building invalidates current attached geometry; keep prior drafts as history, never silently re-authorize them. Maintain model +X right/+Y down, world +Z up, without unapproved page reflection or claimed surveyed bearings.

The Workbench currently saves drafts in browser-local state, with `.lotscope.json` export/import as the portable backup. `Create Customer Report` downloads a private standalone HTML artifact; it does NOT publish to Pages or produce a print-calibrated native construction PDF. Source candidate information should never be published without appropriate permission.

## Acceptance gates and next stages

Run `npm run lint`, `npm run test:universal-design`, `npm run test:universal-design-solving`, the candidate report and locked-roof gallery regressions, and `npm run build`; follow exact-head hosted Workbench/roof QA, authenticated desktop/mobile browser validation and production Vercel SHA. Two-candidate and two-valley regression fixtures demonstrate supported cases, not unlimited polygons.

**Next:** (1) graphical wall/vertex dragging, dimensional snapping, undo and floor partitions; (2) room programming, openings, stairs/headroom and accessibility/egress; (3) arbitrary multi-zone roof-topology/valley/low-seam solver; (4) true nonzero eave extension and complete building sections; (5) shared Pondy sheet compiler, scaled HTML/PDF parity, capability-gated saved projects/customer publishing and professional review. Maintain a single shared engine and fail closed for unsupported inputs.

See [Workbench guide](WORKBENCH_DESIGN_TO_REPORT_GUIDE.md), [solver Phase 1](UNIVERSAL_DESIGN_SOLVER_PHASE1.md), [roof SOT](ROOF_GEOMETRY_SOT.md), [Pondy consumer contract](https://github.com/aerovista-us/PondyFlats/blob/main/docs/LOTSCOPE_SHARED_DESIGN_CONSUMER.md), [issue #94](https://github.com/aerovista-us/lot-assessment/issues/94).