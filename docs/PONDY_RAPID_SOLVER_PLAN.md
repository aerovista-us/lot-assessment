# Pondy Rapid Solver Plan

## Goal

Use the new LotScope Workbench and deterministic engine to produce several genuinely viable Pondy Lot 2 options quickly, rather than hand-developing one concept at a time.

Success for this sprint is not a permit set. Success is **at least 3 materially different Pondy candidates that pass geometry/circulation and basic program feasibility**, with clear tradeoffs and truthful site thumbnails.

## Strategy borrowed from open-source patterns

We are borrowing architecture and workflow ideas, not third-party code unless license/provenance is explicitly verified.

1. **Topology before geometry** — generate relationship families first, then assign coordinates.
2. **Global placement -> legalization -> detailed refinement** — coarse integer-foot search first, legalize against hard constraints, then refine 0.5 ft and 0.25 ft near promising solutions.
3. **Discrete early search** — avoid unnecessary floating-point search until a topology proves viable.
4. **Program packing after site legality but before visual development** — kill mathematically valid layouts that make bad homes.
5. **One deterministic engine for both UI and agents** — Workbench visualizes results; skills/agents invoke engine functions directly.
6. **Canonical model -> derived views** — site thumbnails, later plans/elevations/sections all derive from the same candidate geometry.

## Hard Pondy constraints for the benchmark

- Parcel polygon remains immutable.
- Pennsylvania Street is the only vehicle access side.
- Working setbacks remain 20 / 25 / 5 / 10 until professionally validated.
- Two dwelling units.
- Living target 1,600-1,900 SF each.
- Maximum unit-area difference 120 SF.
- Two stories.
- Two enclosed parking spaces per unit unless ownership explicitly changes the program.
- Full-size SUV/pickup design vehicle remains the circulation test.
- Acceptance rules do not move to make a candidate pass.

## End-to-end pipeline

### Phase 0 — Compile

Input: `projects/pondy-lot2/project.json`

Output:
- normalized ProjectSpec;
- parcel polygon;
- segment-specific setback/buildable envelope;
- provenance/confidence states;
- solver version + source revision.

### Phase 1 — Topology generation

Generate at least these families in parallel:

- staggered homes / shared Penn spine;
- front-rear split;
- attached duplex / offset garages;
- dual Penn-facing garage strategy;
- courtyard / mid-lot parking;
- detached Z-offset;
- optional garage-under/undercroft family if program rules allow.

Each family defines variables and ranges, not one hand-picked coordinate set.

### Phase 2 — Global placement

- 1 ft integer grid.
- Fast containment and overlap pruning first.
- Stop obviously impossible branches before circulation.
- Keep a diverse candidate pool; do not keep 30 nearly identical coordinate variants.

### Phase 3 — Legalization

For every coarse survivor:

- inside buildable envelope;
- minimum structure separation where required;
- garages/parking contained;
- Pennsylvania access preserved;
- no immutable-rule conflicts.

Classify failures before repair.

### Phase 4 — Circulation + bounded repair

Run full FS-SUV swept-path tests.

Repair order:
1. driveway control point/centerline;
2. local driveway flare/widening;
3. apron/staging adjustment;
4. garage-door face/location;
5. garage micro-shift;
6. building micro-shift/resize;
7. topology rejection only after bounded repair is exhausted.

Refinement sequence: 1 ft -> 0.5 ft -> 0.25 ft.

Every result records:
- exact conflict;
- smallest tested repair;
- remaining clearance;
- number of states tested.

### Phase 5 — Program feasibility

Fast architectural gate, not finished plans.

For each site survivor test:
- both units can reach 1,600-1,900 SF;
- delta <=120 SF;
- plausible stair zone;
- usable entry;
- living/kitchen zone;
- bedroom/bath allocation;
- mechanical/storage allowance;
- garage relationship;
- penalties for narrow ribbons, leftover slivers, weak internal circulation, or implausible room dimensions.

### Phase 6 — Ranking

Keep Pareto-diverse survivors across:
- circulation;
- program/architecture;
- yard/open space;
- paving burden;
- construction simplicity;
- parking convenience;
- unit balance.

Target output: 5-10 materially different survivors, then shortlist 3-5 for ownership review.

### Phase 7 — Fast visualization

Generate truthful SVG site thumbnails directly from candidate geometry:
- parcel;
- setback envelope;
- home/garage footprints;
- driveway;
- vehicle path/conflict or clearance;
- critical dimensions;
- scores/status.

No photoreal and no independent drawing geometry at this stage.

### Phase 8 — Select + freeze

Ownership/agent selects strongest candidate(s).

Freeze:
- ProjectSpec hash;
- candidate geometry hash;
- solver version;
- provenance snapshot.

Only after freeze do we develop plans/elevations/sections.

## Parallel agent workstreams

The GitHub issues are intentionally separable so agents can work concurrently:

- #1 topology families + global placement
- #2 legalization + circulation repair
- #3 program packing + architectural quality
- #4 ranking + Workbench result cards
- #5 provenance + validation guardrails
- #6 open-source strategy/licensing notes
- #7 rapid benchmark runner
- #8 fast candidate thumbnails
- #9 canonical model + freeze contract

Agents should modify `lot-assessment` only. `PondyFlats` remains an untouched source/regression project except for normal independent Pondy work.

## Fast-path priority

To get visible Pondy examples as quickly as possible, prioritize dependencies in this order:

1. #1 topology families
2. #7 benchmark runner
3. #2 legalization/circulation
4. #3 program gate
5. #8 thumbnails
6. #4 ranking/Workbench

#5, #6, and #9 run in parallel because they should not block the first candidate search.

## First benchmark acceptance

A run is useful when it can report:

- candidates generated;
- legal coarse placements;
- circulation PASS;
- repaired NEAR_PASS -> PASS;
- program PASS;
- final diverse survivor count;
- elapsed time by phase.

The first public/internal review target is **3 good, materially different Pondy options with solver-backed site thumbnails**, not another completed architectural package.