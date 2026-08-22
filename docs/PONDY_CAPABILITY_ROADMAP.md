# Pondy → Lot Assessment Capability Roadmap

Purpose: use the eventual Pondy solution as a **learning case** to make Lot Assessment smarter without turning the product into a Pondy-specific calculator.

## Principle

Pondy is a test case, not a special-case code path.

When the project reaches a defensible solution, extract each reusable lesson into:
1. a generic data model,
2. a deterministic rule or geometry test,
3. a visual explanation,
4. a fixture/test case,
5. a confidence/source note where code interpretation is involved.

## Capability buckets to capture

### 1. Real lot geometry

Current MVP assumes a rectangle. Upgrade to support:
- polygon lot boundaries
- angled/rear lot lines
- frontage line identification
- multiple street/frontage conditions
- easement polygons
- no-build areas
- setbacks measured from actual boundary segments

### 2. Buildable-envelope geometry

Move from width × depth arithmetic to polygon operations:
- inset lot polygon by side-specific setbacks
- show resulting buildable polygon
- calculate usable area
- identify narrow necks / disconnected regions
- distinguish total buildable area from practically usable building pads

### 3. Building placement

Represent conceptual buildings as footprints with:
- width/depth
- stories
- garage position
- front-door/frontage orientation
- minimum separation between buildings
- optional rotation
- required private/open-space zones

Then test whether one or more footprints fit inside the buildable polygon.

### 4. Garage + driveway access

This is a major Pondy learning target.

Model:
- garage door width and location
- driveway centerline / polygon
- driveway throat width
- side clearances
- backing distance
- turning radius / swept path
- shared vs independent driveways
- pinch points
- minimum adjustment needed to create a viable path

The product should be able to say something like:

> Access is blocked in the current placement, but shifting the driveway/building approximately X ft or changing the garage orientation creates a continuous passable path.

That answer must come from geometry, not language-model intuition.

### 5. Circulation verdicts

Add explainable states:
- `CLEAR PASS`
- `TIGHT / VERIFY`
- `BLOCKED`
- `WORKABLE WITH ADJUSTMENT`

For an adjustment result, return:
- what conflicts
- where it conflicts
- minimum tested change
- remaining clearance after change
- assumptions used

### 6. Multi-building / multi-unit site planning

Support:
- two detached homes
- duplex / attached alternatives
- front/rear placement
- staggered placement
- mirrored layouts
- shared access
- independent access
- garage-forward vs garage-rear options

Compare schemes using a transparent scorecard rather than one opaque "best" result.

### 7. Constraint classification

One of the most useful future outputs is **what kind of problem this actually is**:
- zoning/use problem
- setback/envelope problem
- lot-coverage problem
- frontage problem
- parking problem
- driveway/circulation problem
- building-shape problem
- unresolved source/authority problem

This prevents users from abandoning a viable lot because a first layout fails.

### 8. Small-adjustment search

Build a bounded search that tests modest changes before declaring failure:
- translate building ±1–10 ft
- rotate small increments where appropriate
- shift driveway
- flip/mirror garage orientation
- alter garage-door side
- vary building depth/width while preserving approximate area

Return the **smallest meaningful adjustment** that clears the constraint.

### 9. Visual explanation

Future UI should overlay:
- lot boundary
- setback/buildable envelope
- proposed buildings
- driveway
- vehicle path
- conflict zones
- adjustment arrows
- dimensions at the actual constraint

A user should be able to understand the failure or fix without reading code language.

## Data provenance

Keep geometry facts and regulatory facts separate.

Example:
- lot polygon → survey/GIS/source
- setback → ordinance/source/date
- driveway minimum → ordinance/fire/engineering source/date
- vehicle turning assumption → documented design assumption
- building footprint → user/project input

Every generated conclusion should be traceable back to those inputs.

## Pondy capture checklist

Before closing the Pondy project, record:
- final lot geometry used
- final setbacks and their sources
- frontage determination
- final building footprints and dimensions
- garage-door positions
- driveway width/path
- exact issue that caused earlier blocked layouts
- smallest changes that fixed it
- rejected layouts and why
- any interpretation that required official confirmation
- final design rules that appear reusable elsewhere

Then turn those into generic Lot Assessment fixtures/tests.

## Do not do yet

Until Pondy is resolved:
- do not encode an assumed final driveway rule as universal
- do not encode one lot's side-yard pattern as a default zoning rule
- do not train ranking around a single preferred layout
- do not describe a currently blocked concept as impossible if geometry alternatives have not been exhausted

The goal is for Pondy to improve the engine's reasoning surface **after** the real constraint/fix relationship is known.
