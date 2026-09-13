# LotScope Workbench — Candidate Intervention Implementation Roadmap

Date: 2026-09-13
Status: phased engineering plan
Repository: `aerovista-us/lot-assessment`

## Goal

Evolve Workbench from a solver-centric collection of tools into a persistent staff operating system for lot exploration, candidate review, controlled intervention, validation, comparison and freeze — without weakening the existing ability to search many options and find the best fit automatically.

The order matters: build the candidate/state backbone first, then the graphical editor.

## Phase 0 — Protect current state

Before implementation work:

- preserve current Workbench code in a restore branch/tag;
- record current main SHA and local feature SHA;
- keep Design 4 repair evidence untouched as historical evidence;
- do not overwrite existing candidate/evidence files while introducing new schema.

Acceptance:

- exact current local Workbench state can be restored;
- a remote main checkpoint exists;
- documentation of the restore point is committed.

## Phase 1 — Candidate registry and persistent model

Introduce versioned types/storage for:

- Project;
- Lot;
- Design;
- Revision/Candidate;
- Component;
- Evaluation;
- CandidateLineage;
- Checkpoint.

Candidate components must support at minimum parcel, envelope, home, garage, stall, opening, pavement, driveway/route and annotation types.

Key requirements:

- immutable evaluation records;
- stable component IDs;
- parent/child candidate lineage;
- engine/rules/schema version on every evaluation;
- evidence status becomes stale when candidate geometry changes.

Acceptance:

- existing Pondy candidates can be represented without flattening geometry;
- a candidate can be serialized and reconstructed exactly;
- history is append-oriented.

## Phase 2 — Automated classification, ranking and deduplication

Keep broad automated search as the first workflow step.

Add a post-search layer that:

- clusters near-duplicate solutions;
- identifies meaningfully different topology/design families;
- preserves scoring/ranking;
- classifies candidates into Recommended, Acceptable for Intervention and Rejected/History.

`ACCEPTABLE_FOR_INTERVENTION` must be rule-driven. Initial heuristic should require sound core parcel/program/topology value with localized repair classes rather than fundamental infeasibility.

Acceptance:

- staff receives a small meaningful candidate set instead of a raw solver flood;
- classification reason is explainable and stored;
- no human control can set PASS or acceptable status directly.

## Phase 3 — Staff Home, Lot Workspace and Candidate Library

Replace developer-tool-first navigation with operations-first staff UX while preserving advanced engineering access.

Build:

- Staff Home;
- project/lot list;
- progress ribbon;
- automated exploration summary;
- Candidate Library with Recommended / Intervention / Rejected sections;
- candidate cards with thumbnail, lineage, key gates and blocker summary.

Existing solver/automation/evidence pages can remain under an Advanced/Engineering area during migration.

Acceptance:

- staff can understand what needs attention without reading raw JSON;
- every candidate can be opened from the library;
- every blocker shown in summary links to its evidence.

## Phase 4 — Branching, lineage, checkpoints, import/export

Implement before direct component editing so experimentation is recoverable from day one.

Build:

- Duplicate candidate;
- Branch variant;
- New design from this;
- Save checkpoint;
- lineage tree/timeline;
- editable export `*.lotscope.json`;
- optional `*.lotscope.zip` bundle contract;
- import as copy / variant / new design;
- `REVALIDATION_REQUIRED` behavior for imported evidence.

Acceptance:

- Design 4 can be exported, branched to 4B, restored/imported, then used to create Design 5;
- no import silently inherits current PASS;
- exact design lineage remains visible.

## Phase 5 — Component-based renderer

Refactor candidate rendering so plans are assembled from selectable components rather than one flattened render.

Initial selectable types:

- parcel;
- setbacks/buildable envelope;
- homes;
- garages;
- garage openings;
- stalls;
- pavement/aprons;
- route/drive controls;
- annotations.

Inspector should expose exact properties and relevant evidence for the selected component.

Acceptance:

- selecting Garage B identifies only Garage B;
- rendering uses the same serialized component model used for evaluation/export;
- rotated polygons render accurately.

## Phase 6 — Intervention editor v1

Build only the high-value operations:

- move;
- resize/re-proportion;
- rotate;
- edit opening;
- edit pavement vertices/size;
- edit route control points;
- lock/unlock allowed parameters;
- annotate.

Entering edit mode must branch the candidate first. Any edit marks current evidence stale.

Live warnings are advisory only and must not impersonate pipeline proof.

Acceptance:

- a staff member can recreate the Pondy rotated-garage idea without code;
- a staff member can create a materially different component arrangement and save it as a new design;
- original candidate is untouched.

## Phase 7 — Exact edited-candidate evaluation

Wire **Evaluate this edit** into the canonical validation pipeline.

Required hard gates include as applicable:

- parcel/buildable containment;
- setbacks;
- overlap/separation;
- garage/stall program;
- full-body vehicle path;
- minimum turning radius;
- door crossing;
- parked-mate collision;
- inbound;
- independent outbound;
- pavement containment;
- living/program capacity;
- downstream room/architecture gates.

Do not treat reverse replay as independent outbound proof.

Acceptance:

- edited candidate receives a fresh immutable evaluation;
- UI cannot retain stale PASS badges;
- machine result is the sole source of validation status.

## Phase 8 — Explore around my edit

Allow human intervention to seed bounded automated search.

The staff member selects which properties may vary and their ranges. Workbench generates descendants around that edit, evaluates them and returns another ranked/deduplicated candidate set.

Initial variable support:

- placement X/Y;
- rotation;
- width/depth where program allows;
- pavement expansion;
- movable drive/control points;
- garage opening parameters where supported.

Acceptance:

- a 35-degree staff garage rotation can seed a 30–40-degree bounded exploration;
- descendant candidates retain parent lineage;
- ranking/hard gates are identical in principle to first-pass exploration.

## Phase 9 — Compare, select, freeze and presentation handoff

Build side-by-side comparison of:

- parent;
- staff edit;
- solver-refined descendants;
- other passing candidates.

Comparison includes both plan views and evidence metrics.

Freeze records exact geometry, rules snapshot, evaluation IDs, engine/schema revisions and unresolved professional/AHJ items.

Acceptance:

- staff can choose a preferred passing/promotable design without changing its evidence status;
- freeze creates a canonical downstream source;
- reports/renders consume the frozen candidate.

## Candidate status ownership

Machine-owned:

- evaluation PASS/FAIL;
- stale/current evidence;
- acceptable-for-intervention classification;
- promotion readiness.

Staff-owned:

- design intent;
- which acceptable candidate to explore;
- component adjustments;
- search bounds around an edit;
- preference among passing candidates;
- notes/presentation selection.

This ownership boundary must be reflected in API contracts and UI permissions.

## Migration strategy

Do not rewrite the solver first.

Recommended approach:

1. adapt current solver outputs into the new candidate registry;
2. retain existing APIs as compatibility adapters;
3. migrate Workbench pages to candidate IDs gradually;
4. preserve current Pondy evidence as fixtures/regression tests;
5. only retire specialized pages after equivalent staff workflow exists.

## First implementation milestone

The first production-quality milestone should stop before freeform editing and deliver:

- persistent candidate registry;
- classification and deduplication;
- Staff Home;
- Lot Workspace shell;
- Candidate Library;
- Candidate Workspace read-only component view;
- branching/lineage;
- checkpoints;
- import/export package v1;
- immutable evaluation history.

This creates the foundation needed for intervention without risking current solver behavior.

## Second implementation milestone

Add:

- move/resize/rotate editor;
- stale evidence behavior;
- exact edit re-evaluation;
- compare view.

Use Pondy Design 4 -> 4B and Design 5 concepts as acceptance cases.

## Third implementation milestone

Add:

- Explore around my edit;
- topology-change assistance;
- richer pavement/route editing;
- candidate search-space controls;
- freeze/presentation integration.

## Regression test cases

At minimum retain automated tests for:

- current Pondy public irregular-lot behavior;
- current canonical solver normalization;
- existing room-packing checks;
- Design 4 evidence truth boundary;
- import never inheriting current PASS without revalidation;
- editing a component marks evidence stale;
- staff cannot set PASS through API/UI;
- lineage remains intact across branch/import/export;
- rotated detached-garage geometry uses oriented polygons;
- independent outbound remains a separate hard gate.

## Definition of done for this direction

The redesign is complete when Workbench can automatically search a new lot broadly, reduce the results into useful distinct candidates, identify promising partial failures, let staff safely branch and modify one of those candidates by components, rerun the edit through the canonical pipeline, optionally search around the human idea, compare descendants and freeze a preferred passing result — while keeping every prior design and evaluation reproducible.
