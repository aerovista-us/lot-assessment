# Golden Journey: New Lot → Complete Customer Report

**Product acceptance contract — 2026-10-17**

## Mission / scope
One first-time user, without a pre-authored Pondy candidate, begins by drawing/importing a new irregular lot, states what the household needs, receives credible options, refines a chosen home design in Workbench, and exports a complete Pondy-quality report. **Design 4 is a comparison benchmark, not the source of the new candidate.** Validate the same flow on Designs 1–4 and an unrelated arbitrary lot after the first genuine end-to-end pass.

## Golden journey states and gates
| Step | User-facing outcome | System contract | Evidence needed |
|---|---|---|---|
| 01 Lot | User draws polygon, jogs and access/frontage edge, enters setbacks, north, goals | Lot-intake schema, closure/self-intersection/area checks; source input status and boundary provenance | Save/reload, orientation + scale proof, invalid polygon rejection |
| 02 Household | User defines household size/lifecycle, floor count, room program, garages, accessibility, open-plan preferences, budget priorities | Versioned typed design brief; mandatory vs optional relationships; no silent assumptions | Stored brief, user-visible confirmation, reproducible edit |
| 03 Feasibility | System returns buildable envelope and explainable constraints | Site/placement solver uses **this user's** parcel geometry, not Pondy fixtures; setback + access + circulation data source-bound | Different input lot yields different candidate results; failed envelopes explained |
| 04 Alternatives | >=3 meaningfully different layout/massing candidates or a justified infeasibility result | Typed graph and objective scoring; source-bound geometry and candidate revisions; no fake routes/doors | Score rationale, constraint trace, distinct geometry hashes, reject invalid alternatives |
| 05 Workbench | Select, rotate/flip, drag vertices/walls, assign rooms, place doors/stairs, preserve garage/entry utility relationship | Revisioned DesignDocument and durable save/reload/undo; solve adjacency + traversable door/circulation paths; invalidate stale roof locks | Desktop + phone, persisted data, role/auth negative cases, verified access paths |
| 06 Whole-building | Recompute room, circulation, building envelope, roof ridges/slopes/valleys, eaves, site + sections; no geometry drift | Solver and drawings consume identical exact candidate/shape rev and roof authority, invalid geometry fails closed | Checks for garages/homes, all 4 elevations, roof plan, sections and axon; withheld states accurate |
| 07 Compare | User sees pros/cons and can choose or revise | Candidate comparison based on livability, land use, circulation, cost proxies and approval risk, explaining tradeoffs | Selected vs rejected alternatives and reasons recoverable |
| 08 Build report | One click generates full customer report and export | Shared report document; site, cover, data, rooms, floor plans, dimensions, elevations, sections, roof, axon, comparison, risks, gate/status, sources and decision explanations near every relevant drawing | 22 feature categories (or superseding versioned schema), complete images, links, downloadable HTML/PDF print QA, phone QA |
| 09 Reopen | User returns to the same project and report | Stable candidate ID, lot and brief provenance, immutable report snapshot and visible superseded revisions | New session reload; no data loss; source hash and report regenerated after edit |

## Mandatory report reasoning
Every major decision owns a typed rationale: `objectId`, `candidateRevision`, `whyChosen`, `userGoal`, `alternatives`, `geometryEvidence`, `benefit`, `tradeoff`, `validation`, `confidence`, `sourceHash`. Place it at its drawing and in the executive comparison. Garage-side utility, open-plan kitchen/living and primary-suite bathroom proximity are **preferences only** until actual path/opening constraints are validated. Never represent shared walls as evidence of a connecting door.

## Current capability mapping (not yet an end-to-end PASS)
- **Present in Design 5 feature**: `packages/lot-intake/index.ts` + `scripts/test-new-lot-intake.mjs` check irregular parcel geometry; `packages/candidates/design-document.ts` and Workbench provide source-bound design revisions; report builder in `packages/candidates/customer-report.ts` produces 22 report features for existing registry candidates.
- **Prototype only**: PR #114 purpose-weighted multi-concept ranking uses adjacency proxies, not door/path solver acceptance.
- **Unproven / blocking**: no verified first-time-lot → household brief → site candidate → edited room-access design → persistent report path using the **same exact user input**, independent of the static Pondy candidate registry. No real-user UI/browser, physical-scale print, and professional/AHJ signoff.
- **Do not claim PASS** merely because unrelated unit/regression tests for lot intake, existing candidate solver and existing candidate report pass independently.

## Execution order / release controls
1. Add golden-journey ID and source-bound state machine; preserve source lot/brief revisions with human-verifiable summary.
2. Implement `new-lot -> candidate` adapter with actual parcel/buildable envelope/massing solver, not registry fixture substitution. Regression against different irregular input lots and infeasible lots.
3. Add household graph, door/circulation proof and multi-candidate tradeoff scoring; allow user pin/override and explain constraints.
4. Integrate Workbench save/reload with immutable report snapshot and a single Build Full Report action, including no-fake roof and section gates.
5. Run automated golden path and adversarial path; browser desktop/phone, literal page output, physical print and auth; then exact-head production candidate.
6. Repeat the identical pipeline for Designs 1–4 (as regression fixtures) and a previously unseen irregular lot. Ship only after the full evidence ledger has passed.

## Completion definition
Success is a **single identifiable new lot** and its household brief flowing through generated alternatives, user-edited source-bound design, solver outputs and a report with complete provenance and explicit held gates. Any substituted handpicked candidate, non-reopenable layout, fabricated geometry, or missing report chapters fails the end-to-end milestone.
