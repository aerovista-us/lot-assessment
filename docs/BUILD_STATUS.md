# LotScope — Build Status

Updated: 2026-09-08

## Status

**ACTIVE BUILD · PUBLIC V2 SHIPPED · WORKBENCH DIVERSITY PROVEN · FINALIST REFINEMENT NEXT**

## Canonical surfaces

- Public: `https://lotscope.aerovista.us`
- Vercel fallback: `https://lotscope.vercel.app`
- Workbench route: `/workbench`
- Proven public examples: `/proven-patterns`
- GitHub source of truth: `aerovista-us/lot-assessment`
- Durable solver evidence: `benchmark-results` branch

## Working now

### Public LotScope v2

- Guided Assessment with grouped Lot / Rules / Project / Access inputs
- Quick Rectangle and explicit Custom Lot Facts approximation modes
- Deterministic feasibility engine
- Separate feasibility and information-confidence results
- Confirmed / user-supplied / assumed / unknown input states
- Explicit assumptions and next-verification guidance
- Public-safe authority boundary: no invented zoning/legal certainty

### Workbench / shared engine

- Exact irregular parcel + segment-specific setback handling
- Parameterized topology generation
- Placement containment and intentional integration groups
- Compound / L-shaped residential massing
- Full-size SUV swept-path validation
- Near-pass-only bounded repair
- Fast program-feasibility and net living-capacity checks
- Pavement / buildable-land efficiency ranking
- Promotion gate requiring physical PASS + program PASS + 1,800 SF target with 8% capacity reserve + >=1 ft non-access boundary clearance
- Solver-derived SVG/comparison evidence
- GitHub Actions benchmark artifacts and durable benchmark-results history

## Pondy proof — current result

The original Workbench proof objective is now achieved without one-off Pondy logic replacing the general engine.

Diversity Run 48 / strict regression gate:

- 11 search families
- 110 retained/evaluated candidates
- 89 physical passes
- 86 combined physical + program passes
- 49 promotion-ready candidates
- **5 materially distinct promotion-ready concept groups**

Current promotion-ready concept groups:

1. Compact Front Block
2. Front L / Rear Standard
3. Balanced Twin Blocks
4. Edge / Staggered Spine control family
5. Deep Narrow Rear

The owner-selected **Accessory Rear Garage Stack / connected L-duplex** remains a separately proven active refinement family. Diversity ranking is evidence; it does not silently override the selected design direction.

## Current design boundary

What the Workbench proves today:

- site-fit geometry
- selected setback-envelope containment under labeled assumptions
- vehicle access / circulation against the benchmark design vehicle
- coarse program capacity
- comparable candidate scoring and promotion readiness

What it does **not** yet prove:

- permit approval
- verified final zoning interpretation
- detailed room-by-room floor-plan quality
- structural / civil / architectural construction feasibility
- final legal status of alternate access or accessory-building assumptions

## Next implementation milestone

### Finalist refinement + canonical freeze

1. Extend program feasibility into room-level packing and architectural-quality checks (issue #3).
2. Select/freeze finalist geometry instead of continuing uncontrolled topology movement.
3. Implement canonical candidate schema + stable geometry IDs + ProjectSpec/candidate/solver freeze hash (issue #9).
4. Derive plans, elevations, sections and customer packages from frozen geometry only.
5. Complete open-source strategy/licensing documentation before importing any third-party implementation code (issue #6).

## Later product layer

Parcel/jurisdiction/code retrieval remains future work. When added, every automatic rule must preserve source URL, jurisdiction, effective/verification date and explicit uncertainty/conflict handling. Manual override mode remains required.

## Product rule

If an authoritative rule is unavailable, stale, ambiguous or conflicts with another source, output **Needs Verification** and show the conflict. Never silently select the most convenient zoning interpretation.
