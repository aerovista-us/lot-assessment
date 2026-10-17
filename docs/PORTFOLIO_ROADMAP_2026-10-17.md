# LotScope / Workbench / Pondy Flats — portfolio status and completion roadmap

**Baseline:** 2026-10-17. **Authority:** operational planning summary only; not engineering, permit, structural or AHJ signoff.

## Executive status
| Surface | Estimated scoped MVP readiness | Evidence | Open gaps |
|---|---:|---|---|
| LotScope core | ~75% | `aerovista-us/lot-assessment` main `50d120e`, established site/candidate geometry, room feasibility and source-bound roof gates | General arbitrary-room planner, polished universal solver and rollout, real-world validation |
| Workbench | ~65% | PR #100 universal editor, PR #110 guarded V2 release candidate, PR #114 draft multi-concept packing | Founder exact-origin browser acceptance, access/session, real circulation/door optimization, persistence/provenance, phone/print acceptance |
| Pondy Flats reports | ~75% | Deployed customer-facing report history and open report PRs #24, #29, #36, #39 | Consistent all-design content, final render QA, report reasoning/provenance, open circulation and professional gates |

Percentages are subjective scoped product-planning estimates, **not** measured progress or evidence of deployment. Scope includes a consumer-grade planning/report workflow, not permit-ready engineered construction documents.

## Verified GitHub snapshot
- LotScope current main `50d120e` (Oct 17): deferred external acceptance on Design 4 review/reports (#113).
- LotScope open PR #100: universal floor/roof shape editor, source-bound solver, drag, vertices, stairs/doors preview; founder browser and exact-head review are outstanding.
- LotScope open PR #110: editor V2 controlled release candidate; flag is not authorization; canary, server founder gating and rollout acceptance pending.
- LotScope open PR #114: purpose-aware room seed and ranked proximity concepts, **draft only**. Tests passed on local feature branch; graph does not prove usable access, circulation, garage connectivity, daylight or code compliance.
- LotScope open PR #101: worktree lifecycle documentation and cleanup.
- Pondy open PRs #13/#14: circulation evidence (4/4 inbound; 0/4 outbound proven within 180,000 search states; NOT PROVEN, not impossible); #24: align Designs 1–3 presentation; #29: exact roof rendering polish; #36: report entry and evidence clarity; #39: image-first hierarchy and gate verdict. These are not counted as merged or published.

## Scope and deliverables
### LotScope
1. Site facts, irregular boundary intake, envelopes, setbacks, parking/access/pavement, candidate generation, multi-design constraints; preserve source/revision and deterministic regression.
2. Unified design document and shape topology for every candidate; no design-ID-specific engine. Support rotated and concave plates; arbitrary combinations must fail visibly where unsupported.
3. Reusable rooms, walls, doors, stairs, roof junction/slope/ridge/valley/eave/sections with fail-closed authority and no phantom approvals.
4. Formal release pipeline, tests, access, immutable evidence and documented rollback.

### Workbench
1. Source-bound editing: translate/rotate/mirror, add/remove vertices, wall drag, split, save/reload and undo/cancel.
2. Household brief: intended occupants, bedrooms, accessibility, common-space priority, storage and garage connectivity.
3. Multi-candidate planning with actual adjacency/door/corridor graph, usable routes, stairs/landings, wet-core efficiency, daylight, furniture envelopes, tradeoff explanations, and user-pinned constraints.
4. Side-by-side alternatives; persist rationale and chosen candidate with schema/revision/solver version. Browser and phone review mandatory.

### Pondy Flats
1. Always regenerate site, plans, elevations, sections, roof and axon only from validated exact source geometry; report each source and gate clearly.
2. Align Design 1–4 drawing quality, widths, report navigation, comparisons and visibility of conditional/failed checks.
3. Report explanations throughout sections: intent, chosen placement, alternatives, benefits, limitations and remaining approval checks. Never copy draft proximity scoring as proof of access.
4. Professionally meaningful dimensioned sheets/physical print acceptance and responsive phone UX; no permit-ready claim until authorized.

## Priority and acceptance sequence
| Gate | Duration estimate* | Definition of done |
|---|---|---|
| A. Stabilize candidate/editor releases | 1–2 weeks | Review #100/#110/#114 dependency chain; exact-head TS/build/CI; founder server auth; preview login/logout; desktop and phone save/reload/cancel; preserve main |
| B. Functional household planning | 2–4 weeks | Explicit program graph, door/circulation reachable paths, service entry and ensuite checks; generate and explain >=3 distinct feasible candidates; reject invalid layouts |
| C. Geometry/roof/sheet integration | 2–3 weeks | All four regression designs plus rotated/irregular candidate, roof and valley SOT, no stale roof lock, real dimension/section sourcing; fail closed where not solved |
| D. Reports and polished UX | 2–3 weeks | Complete regenerated 22-category report plus site/plans/elevations/section/axon, clear rationales and comparisons, verified desktop/phone rendering and physical print |
| E. Production rollout and monitored beta | 1–2 weeks | Controlled canary, security/auth, observability, rollback, data round-trip and customer approval boundaries |

*Estimates are **effort windows and may overlap**. Planning targets: internal integrated MVP about 3–5 weeks, customer-facing beta about 6–9 weeks, software production v1 about 10–14 weeks from 2026-10-17, subject to staff and acceptance capacity. None is a guaranteed release date. Professional/AHJ and construction approval are external and unbounded by this schedule.

## Blocking evidence / gate owners
- Human phone QA and physical printing measurements cannot be manufactured by automated renders.
- Responsible architect/engineer and AHJ decisions, structural/snow load, drainage, fire/egress and building permit acceptance remain outside tool authority.
- Design 4 independent outbound remains unproven in latest checked bounded search; don't describe it as solved.
- Customer roof publication must follow current authoritative source and explicitly preserve deferred gates.
- Preview authentication and production role separation must be shown with real founder and negative-role browser tests.

## Release discipline and report rationale contract
1. Identify candidate ID, source SHA/revision, selected layout, source geometry, solver version and applicable gates.
2. Carry typed rationale entries (`decision`, `objective`, `evidence`, `benefits`, `tradeoffs`, `alternativesConsidered`, `confidence`, `unverifiedClaims`) alongside proposal data.
3. Surface the relevant reasoning **where** the plan, roof, site, circulation or room is displayed, and synthesize it in the comparison and executive summary.
4. Keep DRAFT/REVIEW/PASS/professional acceptance separate. Never infer a garage door or primary-suite passage from coincident wall segments.
5. Keep report and drawings deterministic. Exact-head PR reviews, rendered browser/print QA and proof of deployment precede a published-complete statement.

## Immediate next actions
- Finish PR #114 exact-head type/build and browser tests; improve its proxy scoring to a navigable room graph, then test on irregular and adversarial footprints.
- Resolve editor #100/#110 authentication, replay, revision/persistence and founder exact-origin preview acceptance without merging draft results as authoritative.
- Reconcile Pondy PR #24/#29/#36/#39 for consumer-report alignment, consistent cross-design comparisons and evidentiary labels.
- Regenerate D4 circulation and roof source evidence and record physical/phone/professional dispositions separately.
- Maintain this document with PR links, checks, deployed URLs and timestamps at each gate.

## Golden journey acceptance update
The release sequence begins with a first-time user drawing a lot and ends with a full Pondy-quality customer report. A preset Design 4 export does **not** qualify as an end-to-end acceptance test. See [`LOT_TO_REPORT_GOLDEN_JOURNEY.md`](LOT_TO_REPORT_GOLDEN_JOURNEY.md) for the nine source-bound checkpoints, household decision rationale, persistent report handoff, adversarial tests and cross-design regression. Lot-intake validation and fixed-registry report rendering are individually available in the Design 5 feature branch, but their live end-to-end connection is **not yet proven**. This becomes the highest-priority product gate above isolated enhancements.
