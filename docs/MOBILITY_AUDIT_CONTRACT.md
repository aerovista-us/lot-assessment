# LotScope Workbench — Hardened Mobility Audit Contract

This contract carries the vehicle-access lessons proven on Pondy Flats Design 4 into reusable LotScope core code.

Implementation: `packages/circulation/hardened.ts`

## Why this exists

A centerline can look valid while the vehicle body clips a boundary, parked car, garage pier, or unpaved area. A sparse planner can also pass while the evidence audit misses a problem between stored poses. The Workbench therefore needs an audit that is independent of the planner/search implementation.

## Required gates

### 1. Independent pose interpolation
Stored planner poses are re-sampled at a default maximum 0.25 ft translation interval and 2° heading interval. The evidence result must not depend on the searcher's internal primitive sampling density.

### 2. Full body, not centerline
Every sample evaluates the complete vehicle polygon using the same vehicle specification used by the solver.

### 3. Parcel containment
Every non-street-transition body corner must remain inside the parcel polygon.

### 4. Fixed and parked obstacles
Buildings, garage walls, and companion parked vehicles are audited as full polygons. The result reports both collisions and minimum obstacle clearance.

### 5. Independent turning-radius check
The evidence layer derives an approximate rear-axle radius from adjacent pose translation and heading change. This is independent of the search primitive that originally generated the path.

### 6. Garage opening crossing
When a target garage opening is supplied, the audit measures the body span where it crosses the actual garage wall line. It reports the minimum opening margin, supports a hard collision/clearance floor, and supports a separate practical comfort threshold.

This distinction matters: a path can be mathematically collision-free and still be a poor daily-use result.

### 7. Final enclosed pose
When requested, the complete final vehicle body must be inside the target garage polygon.

### 8. Pavement-envelope containment
When pavement polygons are supplied, every complete in-parcel body sample must fit within pavement or explicitly allowed maneuver zones. This closes the gap between a valid centerline and a driveway that actually contains the vehicle body.

### 9. Maneuver burden
Gear changes are counted independently. More than the configured practical target produces a warning even when geometry passes.

### 10. Reverse-outbound replay
The exact validated body sequence is replayed in reverse, with gear direction flipped. No forward-turnaround claim is inferred. Direction-sensitive rules can be added to this replay later without changing the evidence contract.

## Result language

- `PASS`: geometry clears hard gates and practical targets.
- `PASS_TIGHT`: hard gates pass but fixed clearance is near the preferred threshold.
- `WATCH`: hard geometry passes but one or more practical-use targets need refinement, such as door margin or maneuver count.
- `FAIL`: one or more hard body-envelope gates fail.

A mobility `PASS` is still design-development geometry evidence. It is not civil swept-path certification, fire-access approval, zoning approval, or permit approval.

## Pondy regression intent

Design 4 is the motivating regression case. The reusable Workbench must be capable of expressing, without hiding either fact:

- a four-stall geometry result can pass; and
- an individual stall can still deserve a `WATCH` because its garage-door margin or maneuver burden is poor.

That separation is now a core LotScope concept, not a one-off Pondy note.
