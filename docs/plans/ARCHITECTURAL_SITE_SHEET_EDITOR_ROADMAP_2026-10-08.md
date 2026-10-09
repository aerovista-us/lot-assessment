# LotScope — Architectural Site Sheet & Design Editor Roadmap
Date: 2026-10-08
Status: Proposed; architecture and acceptance plan, not geometry approval.

## Outcome
Provide PondyFlats (and future LotScope projects) with site sheets comparable to detailed architectural presentation drawings: accurate survey geometry, measured footprints, dimension strings, setbacks, garage openings, driveway envelopes, north/street context, legends, title block, and source-attributed notes. Longer term, evolve the LotScope Workbench toward an AI-assisted editable 2D/3D home/site design experience inspired by Punch! and SmartDraw.

## Source-of-truth / safety
- Reuse LotScope geometry, survey polygon, roof authority, garage/circulation gates, and candidate registry. NEVER infer dimensions from a screenshot, decorative SVG, or pixel location.
- Source records carry coordinates, units, datum, revision/hash, project/design ID, geometry owner, confidence/authority, and legal/engineering status.
- Separate geometry layers from annotations and decorative/landscape layers. Every measurement is computed from canonical geometry or explicitly labeled not verified.
- Pennsylvania Street remains the only assumed access origin; preserve the irregular southern lot boundary. Vehicle proof requires inbound AND outbound.
- Constrained / withheld / unapproved geometry remains visible as unresolved or is suppressed. No permit or engineering sign-off implied.
- Do not change customer-facing roof or fascia claims without accepted upstream geometry authority. No AI-generated image may masquerade as a measured plan.

## Target stack and reuse
1. **LotScope / Workbench:** authoritative plan geometry, polygon operations, acceptance gates, 3D handoffs, project versions and roles. Keep this as the single geometry source.
2. **SVG drawing-sheet renderer (initial):** deterministic world-to-paper transform, true-to-scale page viewBox, per-layer groups, automatic dimensions and leaders, collision-managed labels, lineweight/typography system.
3. **Maker.js (evaluate, Apache-2.0):** line/arc/path modeling plus SVG, DXF and PDF export, for drafting primitives. Prototype only; check actual text/dimension support and fidelity before adopting.
4. **ezdxf (evaluate, MIT):** server/offline DXF interoperability, not the interactive editor.
5. **React + custom handles/snapping layer:** introduce constrained editing after the locked-viewer milestone; preview edits are proposals, never silently replace approved source.
6. **3D visualization:** reuse current 3D geometry and renderer; optional JSCAD geometry modules for parametric experiments. Avoid migrating the primary engine without demonstrated benefit.
7. **react-planner (MIT) & Sweet Home 3D (GPL):** feature/UI research only initially; react-planner older Redux/Immutable integration needs proof of maintainability. Sweet Home 3D GPL/codebase integration merits separate legal and compatibility review. Do not copy code or assets by default.

## Product benchmarks
- **SmartDraw:** scaled drawings, editable dimensions, symbol libraries, PDF/image underlays, layer controls, share/export, data attached to shapes.
- **Punch! Home & Landscape Design Professional:** coordinate-entry site planner and terrain, dimensioned sheet layouts, 2D/3D switching, plan-detail tools, landscaping and object catalogs.
- These are *capability references*, not code/API dependencies; avoid assuming proprietary apps can be embedded.

## Phases / release gates
### Phase 0 — Geometry/data contract audit
Inventory authoritative survey, each design footprint, garages, openings, parking, setbacks, walls, driveway, roof constraints, units, and revision provenance. Build source-to-display matrix per Design 1–4. Include missing/conditional items explicitly. Acceptance: provenance and authority recorded for every rendered annotation.

### Phase 1 — Detailed site sheet v1 (top priority)
Generate matched A-001 customer sheets for Designs 1–4 at one declared scale and common page size, using the same compass orientation, plotting convention, title block, legend, symbol styles, and annotation format. Dimension exterior survey runs, buildings, garages, drives and established setbacks ONLY when numerically supported. Distinguish conditional setback overlay vs surveyed property. Retain existing Design 1 source drawing as baseline, not a source of truth for other designs. Provide both clean presentation and detailed technical sheet modes from identical geometry. Acceptance: dimension assertions against source coordinates; same world geometry on all modes; zero invented dimension labels.

### Phase 2 — Sheet engine & exports
Introduce testable renderer API: SiteSheetDocument -> layers -> dimensions -> SVG -> print PDF; optional DXF interoperability after prototype. Automated label collision resolution and view-fit without changing the geometry's metric scale. Print viewport and page layout QA. Acceptance: reproducible hashes, clean print output, visual snapshot regression at 1440/1024/768/390 and letter/ARCH-sheet mock layouts.

### Phase 3 — Interactive 2D review
Pan/zoom, layer toggles, inspect-to-measure, selection, compare synchronized viewpoints, inspection-only geometry provenance. Public report read-only. Acceptance: displayed length/area stays consistent when zooming; ability to inspect locked state; no unauthorized edits.

### Phase 4 — Controlled 2D editing
Snap-to-grid, endpoints, constrained drag handles, dimension input, object palettes (structures, paving, landscape zones), undo/redo, save draft. All changes pass geometry, setbacks and access validation and create a versioned proposal with diffs; do not mutate locked source. Role/capability boundaries via Identity/App Adapter for founder/staff/editor/client. Acceptance: invalid edits fail closed and no publication occurs without deliberate promotion.

### Phase 5 — Parametric 3D / landscape
Linked 2D/3D walls, roofs, terrain and landscaping objects, scenario generation, material/view studies, validated elevations/sections; keep graphical realism distinct from construction accuracy. Export client packages. Acceptance: surfaces generated from identical versioned geometry and roof authority, 3D screenshots trace to model IDs.


## Six-obstacle resolution program — required work, not optional advice

All six risks are tracked as release-blocking controls. Each control must have a named accountable role at implementation time, evidence artifacts linked to the release, a test, and an explicit pass/fail gate. A failed or missing gate blocks promotion; it must never be hidden behind a visually convincing drawing.

| ID | Obstacle | Primary owner (role) | Resolution deliverable | Verification and blocking gate | Phase |
|---|---|---|---|---|---|
| R1 | Fragmented/contradictory geometry sources | Geometry/SOT maintainer | Source registry and normalized SiteSheetDocument geometry references; Design 1–4 source-to-display matrix | Reject missing source hash, duplicate competing owner, incompatible units/datums or unexpected geometry revision; reconcile by documented owner decision, never silent overwrite | 0, 1 |
| R2 | Plausible but incorrect measurements | Geometry/QA maintainer | Typed dimension anchors with units, geometry object IDs, dimension kind (clearance, setback, span, etc.), tolerance and authority | Independently recompute measurements from world coordinates; property-based tests for rotations, units, negative/missing values and near-zero edges; zero unverifiable numeric callouts | 0–2 |
| R3 | Overcrowded/ambiguous sheet labels | Drawing/UX maintainer | Layer priority matrix, label-placement rules, reserved dimension bands and reproducible manual annotation overrides | Collision/legibility snapshots at approved print scales and mobile/desktop viewports; no cropped leaders, obscured numeric strings or moved source geometry | 1–3 |
| R4 | Concept evidence mistaken for approved/legal design | Technical authority and release reviewer | Mandatory evidence classes: SURVEYED, MODELLED, CONDITIONAL, WITHHELD, APPROVED_BY_AUTHORITY; visible authority legend and disclaimers | Snapshot/assert every conditional setback, pending outbound result, roof/fascia authority; no approval icon/word without independent accepted evidence; reviewer signoff | All |
| R5 | Differences between website, standalone exports and PDF/DXF | Rendering/build maintainer | Single renderer + export manifest carrying model hash, sheet revision, assets/styles and output artifacts | Same document ID / model hash across outputs, snapshot equivalence of geometry and annotations, zero missing asset requests, PDF/print dimensions calibrated | 1–3 |
| R6 | Editor changes invalidate locked geometry or permissions | Workbench/Identity security maintainer | Draft/proposal/version workflow, scoped capabilities, undo/redo, validation, approved promotion API and immutable audit trail | Attempt illegal drags, stale revisions, role bypass, bad setbacks, broken ingress/egress, roof-lock invalidation, rollback; all fail closed and published baseline unchanged | 3–5 |

### Phase-specific prevention and recovery steps
**Phase 0 (before any drawing):** Freeze a provenance manifest per design. Record source owner, spatial datum, units, source SHA, confidence, locks and model state for survey, structures, garages, driveways, setbacks, roofs and access. Compare legacy Design 1 annotations to canonical measured values; discrepancies become open decisions, not auto-corrections. Build golden-coordinate fixtures for all four designs. Owners: geometry lead and technical reviewer. Exit gate: R1 and R2 baseline green; R4 authority taxonomy defined.

**Phase 1 (Design 4 detailed prototype):** Construct dimension endpoints from model object/feature IDs, never SVG pixels. Separate fixed drawing layers from conditional evidence and decorative background. Generate technical and presentation variants from the same source manifest. Add north/Pennsylvania orientation, scale declaration, titleblock, source revision, layer key and explicit pending approval note. Keep Design 4 alone behind preview until numerical assertions and review pass. Owners: geometry, drawing, technical authority. Exit: R1–R4 green, and no geometric diff from source.

**Phase 2 (cross-design and exports):** Port normalized adapters Design 3, 2, then historical Design 1, preserving immutable original geometry. Introduce label-placement diagnostics and print paper-space controls. Package every asset in standalone output; no external unbundled CSS dependency. Compare browser SVG, PDF and source drawings with model-hash-aware snapshots and dimension tests. Owners: rendering, QA, technical authority. Exit: R2–R5 green across all four designs.

**Phase 3 (inspection):** Add non-mutating pan/zoom, layer filtering, source-linked measurement inspection and side-by-side viewport synchronization. Verify zoom does not alter measured values. Hide unsupported controls rather than presenting nonfunctional editing. Owners: UX, QA, permissions. Exit: R3–R5 and public read-only gate green.

**Phase 4 (editing):** All edits are prospective, isolated drafts with optimistic revision locking, feature constraints, geometry checks, role/capability checks, and explicit approve/publish steps. Lock/published revisions are immutable. Every candidate must re-run setbacks, footprint, driveway ingress/egress, roof authority and applicable drawing regeneration. Owners: Workbench, Identity/App Adapter, QA. Exit: R1–R6 green including adversarial and rollback tests.

**Phase 5 (linked 3D):** 3D geometry, elevations, sections, visualizations and sheet exports reference the same versioned model; decorative material/landscape views must carry nontechnical status as appropriate. Re-run R2/R4/R5/R6 controls on every model promotion. Exit: no cross-view geometry drift and explicit approval evidence.

### Issue workflow and evidence
- Create one tracking issue per risk R1–R6 with the acceptance criteria above, assign a real person/role when implementation begins, and link each to the implementation PR(s).
- CI produces a versioned acceptance bundle: source-manifest.json, measured-dimensions.json, dimension-assertions, collisions.json, authority-review.json, browser/print screenshots, export-integrity.json and authorization/rollback tests when relevant.
- Gate statuses: PASS / FAIL / NOT-APPLICABLE (with justification). **MISSING = FAIL** for phase-required checks. Unexpected data or authority loss causes WITHHELD / UNRESOLVED rendering, never a numeric guess.
- QA failures require a linked defect, correction and exact-head regression rerun before merge; no blanket waivers. Exceptions need written scope, bounded duration and technical authority approval, and must not relax dimensional correctness or access/roof safety.
- Release order: contract & provenance → numeric drawing verification → annotation/visual QA → export parity → permission/security (when enabled) → customer review → deliberate publication → deployed smoke test and rollback readiness.
- Definition of done: artifact evidence linked to exact commit and model SHA, acceptance checklist complete, independent technical review recorded, and no regression to locked site/roof/circulation authority.

## Near-term implementation backlog
- Write SiteSheetDocument JSON schema and provenance/authority tags.
- Implement survey and footprint dimensioning primitives using 2D world coordinates.
- Create common annotation/legend/titleblock renderer. Include north arrow left and Pennsylvania frontage right in current plot convention.
- Prototype Design 4 detailed site sheet on a separate Workbench preview with dimensions from canonical coordinates; add Design 3 then Design 2, backfill Design 1 to common sheet wrapper without rebuilding its frozen footprint.
- Add sheet-mode switch and update Pondy compare to render drawing-only exports at equivalent page framing; prevent browser iframes from including navigation.
- Test exact coordinates, 2D measurement arithmetic, orientation, print scale, visual occlusion, labels, status wording, and source revision hashes.
- Audit PR #41 standalone export styles and keep its QA gate independent of this roadmap.

## Decisions / non-goals
- Build the canonical sheet engine within LotScope, consume in Pondy; no separate competing source of truth.
- Start with SVG/HTML and optional Maker.js PoC, not a complete CAD rewrite.
- Prototype open-source packages in isolated spikes with a license/maintenance/performance assessment before production.
- No automatic zoning certification, no visual-only inference of survey measurements, no cloned proprietary UI or graphics, no implied permit documents.

## Acceptance checklist for first deliverable
- [ ] A-001 diagrams for Designs 1–4 share dimension style, layer keys, compass, road orientation, titleblock and page format.
- [ ] All numerical callouts trace to versioned geometry source.
- [ ] Design 2 vs 4 garage sizes and access differences legible without zooming excessively.
- [ ] Conditioned setbacks/garage gaps and outbound pending status cannot appear as approved.
- [ ] Readable at desktop, mobile zoom and print.
- [ ] No changed geometry, roof authority, or circulation acceptance from styling.
- [ ] Exact-head Workbench QA + Pondy regression + customer visual review before promotion.
