# Purpose-aware draft packing — staged geometry slice

Base: universal editor PR #100, not LotScope main. One shared engine for every candidate, no design-specific exceptions.

## Implemented
- Replaces equal-area, world-axis rectangles with candidate-local, first-edge-aligned strips and source-bound clipping.
- Supports rotated rectangular plates and a subset of convex/concave polygons where valid single connected slices can be proved.
- Interprets room labels conservatively for draft sizing and ordering: utility/laundry near an available garage-side edge; living/kitchen/dining adjacent in a public group; primary suite adjacent to primary bath; other beds and shared baths grouped more privately.
- Preserves exact polygon area (within tolerance), validates shape geometry, source containment and revision, refuses tiny/invalid/disconnected slices, and refuses overwriting existing interior design.
- Does not add doors, connect garage openings, allocate corridor/stair clearances, assert daylight/egress, or certify suitability. All output remains DRAFT_UNVERIFIED.

## Why this is not full automatic architectural planning
Weighted strip layouts are **seed proposals only**. They do not prove that a mudroom connects to the garage or kitchen, that a primary suite has actual internal access to its bath, that travel paths work without going through bedrooms, or that an open-plan kitchen/living arrangement includes its required clearances. These relationships must be measured from shared walls, authored openings and a graph of traversable circulation before any household-use PASS verdict.

## Next acceptance phase
1. Add typed program briefs rather than guessing meaning from free-form labels. User-defined room counts, target area ranges, accessibility, household lifecycle, parking-to-grocery route, privacy, acoustics and daylight needs.
2. Use polygon subdivision with branching/beam search; generate multiple candidates, reserve corridors/stairs and external openings, and optimize actual traversable adjacency graph.
3. Hard constraints: entry connected to circulation, kitchen accessible from service entry, primary bath accessed from primary suite when requested, all habitable rooms have feasible doors and route to exit, no overlaps/holes; check plumbing wet-wall grouping and garage separation as a code/pro review item.
4. Soft score: wasted hallway area, family common-area connectivity, daylight frontage, plumbing runs, privacy buffers, storage, furniture clearances, adaptability and normalized circulation distance; display explainable tradeoffs and allow pinned zones.
5. Regression across Design 1–4, arbitrary nonrectangular/reoriented plates, layouts with inaccessible rooms and adversarial geometry. Exact-head CI, hosted browser acceptance, project persistence/reload, report provenance.

## Authority
No architectural, structural, egress, fire, roof or AHJ acceptance from automatic packing. Existing roof publication and physical print gates remain unaffected.
