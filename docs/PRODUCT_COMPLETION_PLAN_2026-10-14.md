# LotScope / Pondy Flats — Product Completion and Release Plan
**Checkpoint: 2026-10-14.** This is an evidence-aware roadmap, not a claim that the experimental Design 5 branch is deployed or accepted. Source review: LotScope `main` README / BUILD_STATUS / UNIVERSAL_DESIGN_ENGINE_MASTER; feature PR [#100](https://github.com/aerovista-us/lot-assessment/pull/100); browser gate [#103](https://github.com/aerovista-us/lot-assessment/issues/103); new-lot gate [#104](https://github.com/aerovista-us/lot-assessment/issues/104); Pondy customer-release gate [#53](https://github.com/aerovista-us/PondyFlats/issues/53).

## 1. Outcome / service contract
A user enters **any supported new lot** with measured polygon, coordinate orientation, frontage, rules and source confidence, and a project program. The **same parameterized engines** produce multiple distinct feasible or explicitly infeasible site alternatives; a user can branch and edit one without corrupting history. Shared floor/room/door/stair/roof/section/sheet solvers produce source-bound results, with unsupported geometry blocked. The service presents a clear decision, comparison, limitations, provenance and useful concept package. Approved customer publication must never outrun model authority.

**Do not build one engine per design.** Designs 1–4 are regression/reference candidates and presentations; “Design 5” is a shared editor/new revision workflow, not a special fifth solver. Pondy Flats is a benchmark/customer case, not the product's fixed coordinate system or hard-coded zoning policy.

Two service surfaces: public guided **Can I Build That Here?** assessment (honest feasibility + information confidence); protected Workbench (source-bound generation, editing, gates and reports). Separate **concept** from structural, fire, civil, code, AHJ and permit authority.

## 2. Verified inventory and maturity
| Capability | Status | Evidence / limit |
| --- | --- | --- |
| Public guided lot/rules/program/access feasibility | Working on production baseline | Manual facts; no authoritative parcel/code lookup |
| Irregular parcel/envelope, topology search, dedup/ranking | Working for Pondy benchmark | New-lot Workbench pipeline not yet connected |
| Vehicle sweep, circulation, intervention and bounded repair | Working as machine screening | Edited child still needs full authoritative revalidation |
| Candidate lineage, checkpoints, compare, JSON export | Working browser-local | No account-backed multiuser project persistence |
| Shared DesignDocument/editor, room/door/stair and roof model previews | Baseline merged; enhanced Design 5 branch in PR #100 | Not universal permit-grade solving |
| Customer concept HTML / 22 feature categories | Private generator exists | Completeness and exact-source rendering must be revalidated; public Pondy adapter not generic |
| New-lot draft UI + polygon validation + JSON export | In **unmerged PR #100** | Browser-only draft; no server persistence or candidate generation |
| Protected Design 5 handoff | Previously deployed on earlier branch SHA | Current head and founder browser acceptance **not verified** |
| Pondy customer homepage Design 5 preview link | Merged to Pondy main as `31d6d390` | Live Pages delivery not independently verified |
| D4 roof / valley / ridge / occlusion / rotated-garage authority | Open | Do not publish withheld/unsupported roof views as locked |
| Full architectural sheet/dimension system and accurate complete sections | Partial / future | Paper scales, collisions, section depth and visual QA remain gates |
| New lot to generated customer report | **Not yet proven** | Primary product completion test |

## 3. Exact-head release checkpoint (PR #100)
- Previously tested head `9836a2f0ce6ab63cd315102d87e1ebccc528e8aa`: **five** GitHub workflow conclusions SUCCESS (Workbench Identity QA, Intervention Editor QA, Authoritative Circulation QA, Roof Edge Visibility QA, Pondy Solver Benchmark).
- Current feature head at review: `b0cabd62656136abe623e57e5ed955cfdbfc69fe`. The newer commits add mandatory new-lot intake regression to CI and protected preview deployment. **No GitHub Actions workflow runs were returned for this exact head** when checked; previous green runs cannot be transferred.
- GitHub commit status reported Vercel SUCCESS for the exact head, but **this is not proof** of the governed founder-preview alias, correct branch-scoped secrets, browser authentication, or new-lot UI behavior. The Vercel team API returned 403 to the available connector, so no authorized deployment inspection was possible.
- PR #100 remains **draft / not merged**. Governed `design5-preview-deploy.yml` is `workflow_dispatch` only; do not bypass its branch/environment controls.
- Release acceptance sequence: (1) obtain five exact-head green workflows including `test:new-lot-intake`; (2) run protected preview workflow for that SHA, capture run ID, deployment ID, branch/commit and alias; (3) verify legitimate founder auth/session/logout, deny wrong origin/nonfounder; (4) desktop/mobile edit, cancellation, invalid geometry, persistence/reload, source hash, no mirroring, report coverage; (5) review release and rollback, only then promote safe subsets.
- If workflow runs remain absent, diagnose PR workflow event/path/Actions policy with repo admin; **do not substitute** a Vercel success badge or rerun a prior SHA. If Vercel 403 persists, use an authorized operator/team token; never change scope to a different project.

## 4. Delivery phases (in priority order)

### P0 — Release and trust foundation (gate before production promotion)
1. Finish exact-head CI and governed preview acceptance above; preserve immutable source and screenshots for #103.
2. Fix all new-lot form accessibility/validation bugs found in browser, add negative and mobile cases, run clean build.
3. Add a machine-readable, versioned **source/release manifest**: project/lot/candidate IDs, source geometry signature, solver/rules versions, input confidence, gate verdicts, allowed/blocked views, timestamp, approval and deployment SHA.
4. Reconcile Pondy D4 roof status with LotScope authority; fail closed for unsupported Home B valley, rotated garage locks, off-footprint ridges, visibility depth/occlusion.
**Exit:** verified preview + rollback; no unsupported roof authority; all statuses derive from manifest. No public D5 release.

### P1 — New-lot account-backed intake and persistence (highest service ROI)
1. Versioned schema for lot boundary vertices (feet + coordinate reference), segment IDs/frontage, north, easements/no-build areas, setbacks by actual boundary segment, rules jurisdiction, source/confidence, program and vehicle.
2. Server-side auth/role checks, schema + polygon validity, optimistic revision control, immutable history, audit trail; use app adapter / AVCC account authority, no browser-only source of truth.
3. Save/reload, project list, import/export, recovery; verify no cross-user data exposure or Pondy mutation.
4. Show measured-vs-assumed input and actionable unknowns; reject silent defaults or geometry mirroring.
**Exit:** independent irregular lot survives login, reload, export/import, device switch and a rejected invalid update.

### P2 — One generic generation / intervention / evaluation pipeline
1. Bind intake LotSpec to shared envelope and topology search; remove Pondy hardcoded lot/program/access assumptions.
2. Produce 3+ meaningfully distinct options when feasible, or documented infeasibility/insufficient data; rank using transparent hard gates and weighted preferences.
3. Re-run authoritative circulation/parking/program checks on *every edited child*; invalidate stale roof, sheet and report evidence.
4. Regression matrix: Pondy D1–D4, synthetic rectangle, angled 6+ vertex jogged lot, narrow access, two-frontage lot, impossible lot, mirrored-orientation trap.
**Exit:** same engine produces independently reproducible alternatives for two unrelated lots and correct blockers for infeasible input.

### P3 — Reusable architectural geometry solvers
1. Room graph: area, adjacency, wall joins/thickness, circulation and no-overlap, user-authored constraints.
2. Doors/windows/openings: ownership, dimensions, wall fit, clearance/swing and stated code-review gaps.
3. Stairs: real 3D rise/run, landings, headroom, stacked levels; not only XY reservation.
4. Roof: plane intersections, multiple zones/valleys/hips/gables, eave/fascia extensions, drainage implications, geometry locks, ridge-footprint validation and view-depth sorting.
5. Sections: cut real coordinated floor, walls, stairs, roof, foundation placeholders and height datums; fail closed on missing components.
**Exit:** D1–D4 and independent new-lot test show geometrically consistent plans/elevations/sections/axon; all unsupported states explicitly withheld.

### P4 — Universal architectural sheet/report compiler
1. One `SheetDocument` / paper-coordinate engine with drawing references, dimension witness lines/ticks, annotation collision avoidance, reproducible scale/units and north/orientation invariants.
2. Generate complete 22-feature concept package with cover decision/gate status, A-001 site, A-101/102 floors, elevations, sections, roof, axon, dimensions, schedules, assumptions, comparison and contractor-relevant explanations.
3. No blank/silent missing report sections: source-verified view or visible blocked explanation. No false roof visualizations.
4. Print PDF/HTML QA at desktop/tablet/mobile and architectural paper scales; verify actual exported bytes and visual regressions.
**Exit:** same source document compiles two unrelated lots into complete, internally consistent concept packages with provenance and readable limitations.

### P5 — Customer release and commercial service
1. Approved report manifest + founder/staff review → gated customer publish; avoid direct static-file bypass for protected content.
2. Account/workspace access, role separation, client project history, review comments, revision diffs, paid entitlements only after identity/security proof.
3. User journey: enter lot → get triage → compare → request/perform edit → get report → professional review; clear confidence and decision cost/time.
4. Monitor errors, drop-off, solver time, report completeness, provenance failures; rollback any inaccurate release.
**Exit:** non-Pondy pilot completes the entire service and receives a validated, appropriately caveated concept report.

## 5. Test, authority and quality contract
Every stage must assert: same immutable lot polygon and orientation (jog stays on correct side); source ID/signature follows every generated element; geometry edits invalidate dependent authority; PASS comes from a current deterministic engine evaluation; report never presents a blocked view as authoritative; no hidden omission; previous candidates remain recoverable. Security requires legitimate founder/staff permissions and denial tests. Architectural concept is **not** zoning/legal/structural/permit approval.

## 6. Prioritization and release slicing
**Now:** exact-head CI/preview/browser; source-bound manifest; new-lot server persistence; generic generator adapter. These unblock measurable customer value.

**Then:** authoritative edited-child revalidation and the roof/section geometry needed for believable reports. Do not polish illustration styles ahead of solving wrong roof planes.

**Then:** universal sheet compiler and multi-lot proof; publication and account-backed client service. Feature-flag unreleased capabilities; keep public guided assessment and D1–D4 usable throughout.

Suggested checkpoints (relative, not promises): **Sprint A** exact-head release and new-lot persistence schema; **Sprint B** new-lot saved workflow + candidate generation; **Sprint C** edited-child full revalidation + roof junction closure; **Sprint D** universal sheet/report compiler and non-Pondy pilot. Re-estimate after each exit gate, not by elapsed calendar alone.

## 7. Measurable definition of done
- **Portability:** one code path, zero design-number branches for solvers; two unrelated real/synthetic irregular lots and D1–D4 fixtures.
- **Integrity:** 100% generated views reference a current source signature; 0 silently missing required report categories; 0 orientation flips; 0 stale PASS after edits.
- **Feasibility:** each candidate has explainable gates and verified source assumptions; infeasible input gets reasons, not fabricated layouts.
- **Experience:** founder can create, edit, save, reload, compare and export on desktop and mobile with screenshots/evidence.
- **Release:** exact SHA + CI + authorized preview + browser evidence + rollback + approval for each customer-visible version.

## 8. Ownership and references
- **LotScope** owns lot/candidate/source document, geometry, solver verdicts and preview compiler: [PR #100](https://github.com/aerovista-us/lot-assessment/pull/100), [#103](https://github.com/aerovista-us/lot-assessment/issues/103), [#104](https://github.com/aerovista-us/lot-assessment/issues/104), shared-solver [#94](https://github.com/aerovista-us/lot-assessment/issues/94).
- **Pondy Flats** owns customer Pages/report consumption, not geometry authority: [#53](https://github.com/aerovista-us/PondyFlats/issues/53).
- **ACOS / AVCC** owns authenticated role/handoff/entitlements; preview origin registry tracked in [ACOS PR #128](https://github.com/aerovista-us/ACOS/pull/128).
- Source docs: [Universal engine master](UNIVERSAL_DESIGN_ENGINE_MASTER.md), [Build status](BUILD_STATUS.md), [Pondy capability roadmap](PONDY_CAPABILITY_ROADMAP.md), [Workbench guide](WORKBENCH_DESIGN_TO_REPORT_GUIDE.md).
