# Universal Floor, Roof and Section Solver · Phase 1

**Release:** PR [#98](https://github.com/aerovista-us/lot-assessment/pull/98) merged into LotScope main at `79ffc2776000d527921d0c045e808f59b2a5643f`, production READY confirmed. This is *model preview authority only*, not source-roof locks, automatic room-layout generation or full construction sections. Read [master architecture](UNIVERSAL_DESIGN_ENGINE_MASTER.md) and [user workflow](WORKBENCH_DESIGN_TO_REPORT_GUIDE.md) for current entry points.

2026-10-12 — LotScope Workbench

## Decision: one reusable engine

The geometry computation is in `packages/candidates/design-solving.ts` and consumes **any** versioned `DesignDocument` from `packages/candidates/design-document.ts`. No conditional paths use Design 1/2/3/4/5 names; differences in size, rotation, plan outline, and roof topology are supplied by the candidate and its source-bound shapes. Every report uses the same design-model revision and `sourceSignature`. Editing source geometry makes older solution inputs stale.

## Implemented capabilities and safety boundaries

| Topic | Supported model geometry | Explicit limits |
|---|---|---|
| Room relationships | From authored ROOM/CIRCULATION polygon edges: shared wall spans, exact intersection length, adjacency IDs, overlap and disconnected-area warnings | **Not** an automatically furnished room plan, structural wall schedule, accessibility or fire/egress approval |
| Walls | Real XY wall interfaces between drafted rooms, rendered and identified in the customer report | No wall thickness, wall type, framing, materials or load paths; external source footprint walls are unchanged |
| Doors | User chooses a shared wall and supplies width. Generated center point and boundary clearances validated against model wall length; report marks status | No door swing, handing, hardware, egress capacity, code or accessibility approval |
| Stairs | Ground/upper reservations with matching model XY footprint are tested for plan alignment | No tread/riser geometry, landings, headroom, stair slopes or code acceptance; isolated/mismatched stack = REVIEW_REQUIRED |
| Roof pitches | **Explicit input required**: plateZ, rise/run per GABLE_ZONE, ridge axis long or short, optional overhang/fascia | Missing values or unsupported roof type = REVIEW_REQUIRED |
| Ridges | From an oriented rectangular zone. Reuses `validateRoofComponent` with exact source owner key. Computes ridge points, ridge Z and pitch without moving source walls | Only rectangular centered-gable zones are supported for verified model previews; no invented ridge for nonrectangular zones |
| Valleys | For exactly two overlapping supported rectangular zones, the existing `PLANE_ENVELOPE` solver validates face envelope and derives valley segments. Zone union must match irregular owner footprint | Wrong ridge direction, unsafe topology, discontinuity, >2 zones or unknown valley = REVIEW_REQUIRED |
| Eaves/fascia | Draft overhang stored with zone; when **overhang = 0** and actual depth/thickness supplied, reused `solveEaveFascia` derives solved model fascia edges | Nonzero overhangs need authoritative roof-surface extension solver; no guessed fascia. Structural, drainage, weatherproofing still open |
| Sections | Intersections of solved temporary preview roof faces against two true XY cut lines, Z shown upward and identified by source face ID | Roof surface profiles only, **not complete building wall/floor/foundation sections** or architectural QA |
| Customer report | Ground-level room adjacency/door graphic, supported ridge/junction preview and actual model roof-face section graphic, fascia preview status, 22 legacy coverage categories | **MODEL PREVIEW** is not `RoofComponent LOCKED`; existing authoritative roof gallery remains separately bound and unchanged |

The temporary roof preview builds an in-memory RoofComponent for the existing checked solver. It is never persisted to the candidate's RoofComponent collection or treated as construction authority. It cannot override an absent/stale actual roof. A previously saved candidate or report only carries proposals until deliberately validated and locked upstream.

## Repeatable acceptance

`npm run test:universal-design-solving`: tests two differently arranged source candidates (plus unsupported polygon alterations), wall graph and door center/width, overlap and stair alignment, exact owner-source revision and movement invalidation, one-zone gable pitch/ridge/Z, source roof sections, Home B's two generic overlapping zones in one shared `PLANE_ENVELOPE` solver with two derived valleys, wrong short-/long-axis input suppression, zero-overhang fascia edges, nonzero-overhang withholding, all-22-section customer report parity.

`npm run test:universal-design` preserves export/import and candidate source binding. Existing candidate report/roof authority regression tests remain required. Clean TypeScript/Next build and 1440/390px Chromium Workbench/Create Report acceptance (browser-local save/reload, 22 sections, no horizontal overflow) precede release. Hidden roof-edge classification remains under its existing separate accuracy gate.

## Next reusable engine milestones

1. **Graphical floor constraint editor:** direct wall/vertex drag, snapping and dimensions; polygon subdivision and automatic room topology for arbitrary shapes; editable door swings and dimensional scheduling; stair rise, run, landing and headroom solving.
2. **Roof-topology authoring:** split any irregular owner into parameterized supported roof zones; search/rank roof ridge directions and compatible pitches, create stable ridge/valley shape identities; extend beyond two-zone supported envelope and full roof drainage/low-seam checks. Fail closed for unsupported shapes, not speculative gables.
3. **Nonzero overhang surface extension and fascia:** boundary offset and roof intersection at extended surfaces, manufacturing-ready fascia/eave/drip/soffit profiles, exact source-geometry authority.
4. **Full building sections:** real floors, wall height/elevations, openings, stairs, foundations and roofs in one 3D graph; checked cut locations, architectural line hierarchies, and no unresolved intersections.
5. **Complete report publishing:** consume authorized model from shared engine into PondyFlats A-001 onward; consistent responsive interactive HTML and deterministic paper-scale PDF, visual QA, authenticated customer entitlement, explicit professional signoffs.

**No construction, architectural, structural, roof drainage, snow-load, AHJ or fire/access acceptance is claimed by this Phase 1 model solver.**
