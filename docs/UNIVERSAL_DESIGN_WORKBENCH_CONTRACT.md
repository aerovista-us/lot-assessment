# Universal Design Engine and Report Authoring Contract (v1)
Date: 2026-10-12 · LotScope / PondyFlats

## One engine, not an engine per design

Design 1, 2, 3, 4, 5 and future user-built arbitrary candidates must all be represented by **the same contracts and editors**. Differences among designs are data, not a fork in program logic.

\`\`\`
Any saved LotScope candidate (immutable source revision, geometry + parcel)
     │
     ├─ Existing Workbench Intervention Editor (shape / component geometry)
     │
     └─ Universal Design Document (draft shapes, owner IDs, source signature)
            ├─ shared floor authoring → level/room/wall/stair constraints
            ├─ shared roof authoring → roof zones/ridges/junction solver and locks
            ├─ source-/dependency-specific validation, review and stale detection
            └─ one shared architectural sheet/report compiler
                    ├─ A-001 parcel/site/shell + dimensions
                    ├─ A-101/A-102 floor plans and schedules
                    ├─ A-201–204 verified elevations
                    ├─ A-301+ roof plans and sections
                    ├─ A-401/402 axon and massing
                    └─ A-501 access, clearance and circulation
                                  ↓
             Customer HTML/PDF + 22 required evidence categories
\`\`\`

### Implemented v1 foundation

- \`packages/candidates/design-document.ts\` defines a generic \`DesignDocument\` for **any candidate or owner**. Shape records have IDs, a source building owner, polygon vertices, floor level or roof concept type, and mandatory \`DRAFT_UNVERIFIED\` state. Supported types: floor plate, garage area, room, circulation, stair zone, roof zone, gable zone.
- Drafts are bound to the **exact candidate ID, project, revision label and component-array signature**. A moved or mirrored building, parcel or roof record invalidates downstream attachment. Geometry validation checks finite/non-self-crossing polygons, owner containment (including concave owner boundary edge exits), and shared unique IDs. The source footprint is not modified when adding a draft shape.
- \`components/workbench/UniversalDesignEditor.tsx\` is an owner-selectable, reusable editor on every candidate detail: add an exact owner-footprint shape or a custom point-polygon; choose floor/roof usage; remove; visualize the overlays. Initial controls use model coordinate input and are **not yet the planned graphical drag-and-snap editor**.
- Draft documents are saved alongside browser-local candidate workspace state, with **historical source versions preserved** after source geometry edits. Exporting a \`.lotscope.json\` package includes only the source-matching active design document; importing makes a fresh, source-bound **draft**, never inheriting old architectural/roof approval.
- A **Build / Edit Design Shapes** action in Candidate Library and candidate detail jumps to the shared editor. The existing **Create Customer Report** action incorporates a source-bound design-attachment gallery (ground/upper/roof concept layers, source owner labels and draft statuses) into the same 22-feature concept report. Those proposals never enter the authoritative roof surface renderer just by appearing in the report.
- Source footprint handling in report/site/massing is standardized to \`placementPolygon\` so polygon rotation semantics match the LotScope roof solver and design editor.

### Ground rules

1. Never create a separate roof/floor engine for a single Design ID or floor plan shape. New geometries should be handled by generic polygons, owner relationships, edit operations and bounded topology/solver capabilities.
2. The **report is a view of the design document and its validation evidence**, not a hidden source of different geometry. The same revision drives plans, elevations, axon, schedules and exports. Edit in the Workbench → revalidate dependencies → regenerate reports.
3. A draft **GABLE_ZONE** polygon is a roof-authoring proposal, not a solved ridge or certified roof. Actual roofs must pass the existing LotScope candidate-specific \`validateCandidateRoofs\`, current owner geometry keys, junction solver and analytic drawing authority checks. Unsupported topologies remain REVIEW REQUIRED/WITHHELD.
4. A draft **ROOM** polygon is not an architecturally resolved floor plan. Internal partitions, wall thicknesses, doors, stair headroom, means of egress, program, and measured room areas need separate real validation before any authoritative floor-plan claim.
5. Model +X right and +Y down stays unchanged through site and shape reports; world +Z up is converted only at elevation/SVG display time. No arbitrary reflection for page aesthetics.
6. Prior design revisions remain recoverable, but a shape from an earlier geometry signature must never be attached to the current report or exported as current evidence.
7. All outputs retain \`CONCEPT ONLY — NOT FOR CONSTRUCTION\` until appropriate physical measurement, architecture, structure, roof drainage, snow loading, code/AHJ and permit reviews.

### Automated acceptance

\`npm run test:universal-design\` runs via Workbench Identity QA on changes to the model, UI, report attachment and package/workspace. Covers at least two different registered candidate geometries, full/upper roof proposals, exact owner shape orientation, cross-branch private export/import, candidate movement staleness, archive-and-reissue, noncontained geometry rejection, false authority and 22-feature report consistency. Existing roof and customer-report regression suites remain in place.

### Future reusable engines — not yet implemented

- Interactive, direct on-canvas wall/vertex editing with snap, drag, dimension updates, room adjacency and coherent story grids.
- Constraint-based room/door/window/stair planning and room-packing with solved access/egress and area schedules.
- General roof-zone authoring, surface/junction topology assembly and authoritative locking for arbitrary acceptable candidates; no Design 4 geometry transplant.
- Full cross-repo sheet-document/compiler adapter with dependency invalidation, print scales and professional visual QA, deterministic PDF and customer account publishing.
- Source-authoritative cloud document storage, collaboration, undo/redo design transactions, per-project permissions and revision/collaboration conflicts. Current drafts are browser-local and should be exported regularly.

This first delivery is the **universal shared shape and report attachment foundation**, not a claim that a newly added room or roof proposal is fully designed.