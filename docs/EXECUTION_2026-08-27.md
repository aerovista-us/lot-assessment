# LotScope Execution Gate — 2026-08-27

Status: APPROVED / ACTIVE
Branch: `byte/pondy-discovery-public-v2`

## Governing promotion rule

**Workbench proves capability first. Public LotScope only exposes capabilities already working in Workbench/shared packages.**

Do not create public-only geometry, circulation, solver, placement, or smart-alternative capability during this cycle. Public may improve presentation, guidance, confidence/provenance, and usability around proven capability.

## Combined execution order

0. Persist Pondy benchmark outputs and provenance so successful runs leave auditable results.
1. Separate site facts, regulatory assumptions, project requirements, and optimization preferences in the shared truth model.
2. Upgrade public `/` to v2.0 Guided Assessment using existing capabilities only: grouped LOT / RULES / PROJECT / ACCESS inputs; Quick Rectangle / Custom Lot entry; real information-confidence states; assumptions-to-verify; preserve existing feasibility behavior and analytics.
3. Update Pondy ProjectSpec to current survey/access/setback assumptions.
4. Improve Pondy ranking, especially pavement occupying otherwise-buildable land, plus lightweight architectural sanity gates.
5. Reset baseline topology discovery to six families: Side Spine, Staggered Spine, Split Front, E2-R, G1-R, V2-R. Historical E2/G1/V2 preserve topology/design DNA but discard old placement coordinates. R5.1e is the benchmark control, not a search family.
6. Run baseline discovery under one zoning scenario, persist outputs, inspect failures, apply bounded repair, and rerun toward 3–5 credible candidates.
7. Keep rear-25/accessory-garage rules as a separate zoning scenario so candidates never silently use different regulatory assumptions.
8. Human-review technical survivors before deeper architecture.
9. Defer detailed room packing and full canonical freeze until finalists exist.
10. QA Public + Workbench together before production deployment; conserve Vercel deploys.

## Hard facts vs preferences

Hard constraints should contain only established facts/program gates: exact survey polygon, Pennsylvania baseline street access, selected zoning scenario/setbacks, two dwelling units, FS-SUV comparable test assumptions, and functional garage/parking requirements.

Optimization preferences must remain preferences rather than false laws. Strongly reward efficient use of setback land for circulation, reduced pavement inside buildable land, compact garage access, balanced residential capacity, and useful open space. Do not require the driveway to occupy the 10-foot setback, require garages to be front-loaded, require a straight driveway, or universally require 22×22 garages unless a named program gate explicitly does so.

## Public v2.0 gate

Public v2.0 is a guided-assessment release, not the Concept Canvas release. Confidence should be real rather than decorative: important inputs may be CONFIRMED, USER_SUPPLIED, ASSUMED, or UNKNOWN. Results should separate FEASIBILITY from INFORMATION CONFIDENCE and identify assumptions that should be verified.

If true Draw Lot/custom polygon interaction is not already proven in Workbench/shared code, do not invent it for public v2.0. Present a truthful Custom Lot path/state and promote interactive drawing only after the underlying capability has been proven.

## Definition of this cycle's success

- Public LotScope is materially clearer and more trustworthy without becoming an experimental surface.
- Pondy benchmark runs are reproducible and preserved.
- The solver searches current rules rather than stale placements.
- E2/G1/V2 are reconsidered as topology seeds.
- R5.1e provides a known control.
- Baseline discovery produces a visual, auditable shortlist or actionable failure evidence.
- Production deployment occurs only after combined QA.