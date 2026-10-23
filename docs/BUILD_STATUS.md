# LotScope — Build Status

## Draft customer-journey checkpoint — October 22, 2026

PR [#131](https://github.com/aerovista-us/lot-assessment/pull/131) adds supported rectangular/L-shaped room alternatives, explicit saved-layout selection, doorway/circulation evidence, and the three-level readiness vocabulary. The latest enhancement pass adds responsive navigation and controls, confirmed browser saves, replacement comparison without deleting the saved design, an in-app saved-report preview/download, exact geometry records and a separate design digest. See [current acceptance record](CUSTOMER_JOURNEY_ACCEPTANCE_2026-10-22.md).

**Source status, not production acceptance:** automated fixture checks cover non-top Save → Reload → Report fidelity. Browser access is restored, but the exact-head hosted preview still needs an authenticated session and the Design 4 round trip in [#132](https://github.com/aerovista-us/lot-assessment/issues/132). PR #131 remains draft. Physical construction approval is a separate professional/jurisdictional process; missing software fidelity evidence remains a release gate.

The October 12 and September entries below are historical deployment checkpoints.

## Current checkpoint — October 12, 2026 (supersedes the September baseline below)

**RUNNING:** Public LotScope, authenticated Workbench, candidate library, source-bound private customer HTML builder, shared DesignDocument editor (PR #97) and common floor/roof model solver (PR #98). PR #98 merged as `79ffc2776000d527921d0c045e808f59b2a5643f`; exact matching Vercel production READY was verified October 12. The independently hosted roof-visibility gate and three hosted QA jobs passed the PR head; independent long benchmark was in progress when merged, not asserted complete.

**NEW MODELED CAPABILITIES:** shared room/circulation polygons and common walls; width-checked doors on shared walls; ground/upper stair XY stack checking; explicitly authored gable pitch/plate Z/ridge direction; a supported cross-gable two-envelope solver with real model valley segments; zero-overhang explicitly specified fascia previews; actual roof-surface section cuts; 22-category customer concept HTML. Source edits invalidate attachments. Drafts stay browser-local with portable candidate export.

**NOT DELIVERED:** automated interior room packing, door swing/egress, structural/framing walls, real 3D stair geometry/headroom, arbitrary >2-zone roof topology, nonzero roof overhang extension, full floor/wall/foundation section set, deterministic scaled native PDF, automatic generic Pondy sheet adapter, server-authoritative multiuser design revisions and client publishing, physical print acceptance and AHJ/professional signoff. Latest geometry is `MODEL_PREVIEW`, **not locked architecture**; all customer outputs remain **CONCEPT ONLY**. See [master](UNIVERSAL_DESIGN_ENGINE_MASTER.md), [user guide](WORKBENCH_DESIGN_TO_REPORT_GUIDE.md), [solver Phase 1](UNIVERSAL_DESIGN_SOLVER_PHASE1.md) and [issue #94](https://github.com/aerovista-us/lot-assessment/issues/94).

---

*The status details and commit SHAs below are retained as the historical September 18 checkpoint. They are not the present runtime state.*


Updated: 2026-09-18

## Status

**ACTIVE BUILD · PUBLIC V2 LIVE · CANDIDATE SEARCH/LIFECYCLE SHIPPED · INTERVENTION EDITOR SHIPPED · AUTHORITATIVE INTERVENTION REVALIDATION NEXT**

## Canonical surfaces

- Public: `https://lotscope.aerovista.us`
- Vercel fallback: `https://lotscope.vercel.app`
- Internal Workbench: `/workbench`
- Pondy project workspace: `/workbench/projects/pondy-lot2`
- Candidate exploration: `/workbench/projects/pondy-lot2/explore`
- Candidate library: `/workbench/projects/pondy-lot2/candidates`
- Candidate compare: `/workbench/projects/pondy-lot2/compare`
- Proven public examples: `/proven-patterns`
- GitHub source of truth: `aerovista-us/lot-assessment`
- Durable benchmark evidence: `benchmark-results` branch

## Runtime implementation baseline

The runtime implementation baseline completed before the documentation-only handoff is:

- runtime merge: `507a9be9cef487dc1e9b72c32c8ab09b28cecd96`
- runtime tree: `b394c1700bcfbc7a13b397216b27ef7150b999d6`
- PR #30: candidate lifecycle workspace — merged
- PR #31: constrained intervention editor — merged
- PR #32: direct intervention manipulation — merged
- PR #33: lifecycle/intervention documentation handoff — merged

Use the repository's current `main` ref for the latest docs-only merge SHA; the runtime tree above is the code baseline described by this status.
## Working now

### Public LotScope v2

- Guided Assessment with grouped Lot / Rules / Project / Access inputs
- Quick Rectangle and explicit Custom Lot Facts approximation modes
- Deterministic feasibility engine
- Separate feasibility and information-confidence results
- Confirmed / user-supplied / assumed / unknown input states
- Explicit assumptions and next-verification guidance
- Public-safe authority boundary: no invented zoning/legal certainty

### Workbench solver + candidate search

- Exact irregular parcel and segment-specific setback handling
- Parameterized topology generation and ranked search
- Placement containment and compound/L-shaped residential massing
- Full-size SUV swept-path validation and bounded repair
- Program/capacity and site-efficiency screening
- Candidate Search & Triage converts ranked solver output into distinct staff-facing representatives
- Concept deduplication prevents raw solver-state noise from becoming staff workload
- Machine triage separates Recommended, Acceptable for Intervention, and History
- Staff cannot manually set PASS or PROMOTION_READY

### Candidate lifecycle

- Save solver/exploration candidates into a browser-local draft workspace
- Automatic lineage across parent, variant, new-design, and import-copy relationships
- Recoverable checkpoints and checkpoint restore
- Branch Variant and New Design From This
- `.lotscope.json` export/import round-trip
- Import modes: copy, variant, or new design
- Imported/restored/branched geometry requires revalidation before promotion
- Side-by-side candidate comparison with component and gate deltas
### Intervention Editor

- **Create Intervention** protects the source candidate and creates a child variant with a baseline checkpoint
- Direct manipulation for movable homes and garages
- Garage rotation handle with modeled stall movement preserved
- Drag-editable driveway/route control points
- Drag-editable pavement vertices
- Drag-editable garage-opening position
- Optional precision controls for exact dimensions/coordinates
- Every geometry edit creates a recovery checkpoint and marks previous evidence STALE
- **Evaluate exact edit** runs intervention screening on the exact edited geometry
- **Explore around edit** generates bounded nearby alternatives around the selected component
- Screening includes parcel, structure, parking, route curvature/body sweep and pavement checks
- No editor action can manufacture PASS while authoritative outbound proof remains open

## Pondy candidate truth

The checked-in Design 4 and Design 4B records remain **ACCEPTABLE_FOR_INTERVENTION**, not circulation PASS.

- Design 4: four inbound stall paths are demonstrated; independent outbound remains open; B-South is tight.
- Design 4B: rotated Garage B materially improves local clearance; independent outbound remains open; rotated accessory setback still requires recertification/professional review.
- Intervention screening is intentionally narrower than the authoritative mobility pipeline.
- A favorable intervention screen is evidence for further testing, not permit/buildability approval and not an authoritative circulation PASS.

## Persistence boundary

Lifecycle v1 uses browser `localStorage` for staff draft candidates/checkpoints. Checked-in registry records remain protected. `.lotscope.json` is the portable handoff format until shared/account-backed persistence is connected.

## Validation baseline

Current `main` passed:

- TypeScript/lint
- canonical regression
- room-packing regression
- candidate lifecycle regression
- intervention regression
- production Next build
- `git diff --check`
- Candidate Library / D4 / D4B / Compare / Explore / Registry / export smoke checks
- intervention evaluate API smoke
- intervention explore API smoke with five bounded suggestions
- headless direct-manipulation interaction QA on the merged editor work

## Next implementation milestone

### Authoritative intervention revalidation

Connect an edited intervention child back into the full machine-owned mobility/circulation pipeline so **Evaluate authoritative** can prove or reject the complete stall-to-Pennsylvania path for that exact revision.
Required next work:

1. Adapt lifecycle child geometry into the authoritative mobility input model without weakening hard gates.
2. Run independent outbound proof from every modeled stall to Pennsylvania for the exact intervention revision.
3. Persist the resulting authoritative evaluation against that revision and refresh machine classification.
4. Only allow PASS/PROMOTION_READY when the authoritative pipeline actually earns it.
5. Add an explicit UI distinction between **Screening evaluation** and **Authoritative evaluation**.
6. After this gate is stable, consider shared/account-backed candidate persistence so staff drafts are not browser-specific.

## Product / authority boundary

What Workbench can prove today:

- site-fit geometry under the modeled parcel/rule assumptions
- selected setback-envelope containment where that envelope is authoritative enough to model
- full-body vehicle screening and ranked access concepts
- program/capacity screening
- candidate lineage, intervention history and reproducible geometry changes
- intervention-local screening against hard geometric checks

What it still does **not** by itself prove:

- permit approval
- final zoning/AHJ interpretation
- construction feasibility or engineering adequacy
- final detailed architectural quality
- authoritative outbound circulation for a newly edited intervention until the full mobility pipeline is rerun

If an authoritative rule is unavailable, stale, ambiguous or conflicting, output **Needs Verification** rather than silently choosing a convenient interpretation.
