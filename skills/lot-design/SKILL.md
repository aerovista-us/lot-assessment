# Lot Design Skill

Purpose: orchestrate LotScope's deterministic site-planning pipeline. The skill chooses what to run and interprets results; geometry truth belongs to the engine.

## Core rule

Never invent zoning, survey, setback, access, parking, fire, structural, or dimensional facts. Every hard constraint must originate in ProjectSpec with source/confidence metadata. If a required fact is unknown, return NEEDS VERIFICATION rather than silently assuming it.

## Source-preservation rule

PondyFlats is a regression/source project, not a library to destructively refactor in place. When extracting reusable capability:

- **copy only** from `aerovista-us/PondyFlats`;
- never move, rename, rewrite, or delete the Pondy originals as part of LotScope extraction;
- keep exact imported reference bytes under `packages/pondy-engine-reference/` with source commit + SHA256 manifest;
- generic LotScope implementations live in separate packages and may evolve independently;
- compare generalized behavior back to Pondy fixtures before replacing any proven rule.

## Implemented deterministic surfaces

These are now real code, not aspirational commands:

- `packages/pondy-engine-reference/` — copied Pondy geometry/circulation/search references with provenance and checksums.
- `packages/geometry/` — reusable polygon area, containment, boundary distance, segment-specific polygon inset, rectangle, convex SAT intersection, translate/rotate helpers.
- `packages/circulation/` — reusable vehicle model, rear-axle body polygon, radius filleting, swept-path sampling, parcel containment, collision detection and clearance reporting.

Do not bypass these functions with prose estimates when their inputs are available.

## Required pipeline

1. Load and validate ProjectSpec.
2. Compile parcel polygon, frontage, setbacks, exclusions and program constraints.
3. Generate multiple topology families before exact placement.
4. Solve coordinates within hard constraints.
5. Run circulation on every candidate: inbound/outbound, swept body, turn radius, staging, clearance and independence.
6. Run bounded repair on near-passes before rejecting a topology. Prefer driveway/path changes before architecture when allowed.
7. Run program feasibility early. Reject candidates that leave implausible home plates or cannot meet required living-area/room constraints.
8. Rank diverse survivors with transparent scores. Do not return one opaque winner.
9. Present the strongest materially different options and their tradeoffs.
10. Refine only selected candidates, with bounded changes.
11. Freeze canonical geometry once all named gates pass.
12. Generate site, plans, elevations, sections and render views from the same canonical model.
13. Run cross-document consistency gates before calling a design complete.

## Movement priority for access conflicts

When a candidate is close to passing circulation and movement is permitted, test in this order:

1. driveway centerline/control-point shift
2. local driveway flare/widening
3. apron/staging adjustment
4. garage-door position/orientation
5. garage micro-shift
6. building micro-shift/resize
7. topology change only after bounded repair fails

Never move a LOCKED element. Never change an acceptance rule to match a candidate.

## Candidate states

- FEASIBLE — clears all currently applicable hard gates.
- NEAR_PASS — fails a movable geometric constraint and has a bounded repair path.
- REJECTED — hard conflict remains after allowed repair search, or program quality is unacceptable.
- NEEDS_VERIFICATION — authoritative input required before a defensible disposition.

## Agent behavior

The agent should use engine/CLI functions rather than simulating CAD by prose or manually inventing coordinates. UI interactions are for inspection and human adjustment, not the source of geometric truth.

For every rejection, distinguish:

- immutable hard failure;
- movable geometric failure;
- near-pass with a bounded repair opportunity;
- program-quality failure;
- missing authoritative fact.

A small collision against a movable driveway/building element is not an automatic topology death. Run the allowed repair search first.

## Intended command contract

```bash
lotscope compile <project>
lotscope generate <project> --count 250
lotscope solve <project> --refine
lotscope rank <project> --diverse 12
lotscope inspect <candidate>
lotscope refine <candidate>
lotscope freeze <candidate>
lotscope render <candidate>
lotscope deliver <candidate>
```

These commands remain the target interface; do not claim an unimplemented command is operational. The deterministic package APIs above are the current executable foundation.

## Pondy benchmark

Pondy Lot 2 is the first regression fixture. The benchmark is not to reproduce R5.1e. Starting from ProjectSpec, the pipeline should independently produce multiple feasible duplex options and expose whether any materially outperform the historical design on circulation, architecture, yard/open space, simplicity, and program compliance.
