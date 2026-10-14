# LotScope / Pondy Flats — Execution Plan: Release Recovery → Universal Service
**Created:** 2026-10-14  
**Authority:** This plan tracks delivery and evidence; it does not approve model geometry, customer release, structural work, zoning, or permits.  
**Primary engineering PR:** [LotScope #100](https://github.com/aerovista-us/lot-assessment/pull/100) (Design 5 draft)  
**Identity PR:** [ACOS #128](https://github.com/aerovista-us/ACOS/pull/128) (founder-only reversible preview)  
**Customer-report PR:** [Pondy #55](https://github.com/aerovista-us/PondyFlats/pull/55) (source/release status)  
**Existing master strategy:** [PRODUCT_COMPLETION_PLAN_2026-10-14.md](PRODUCT_COMPLETION_PLAN_2026-10-14.md)

## Mission / definition of complete
A permitted user can enter **a new unrelated measured parcel**, create a versioned project, receive multiple independently evaluated layout candidates or explicit infeasibility, edit and revalidate a chosen candidate using **one reusable design engine**, then generate a **complete source-bound concept report**. Every plan, roof, elevation, axon, section, dimension and export must preserve true parcel orientation and reference exactly the same current source signature. Unsupported results visibly say WITHHELD / REVIEW REQUIRED. Designs 1–4 remain untouched as customer history, with Design 5 an internal workflow until separately released. **CONCEPT ONLY — NOT FOR CONSTRUCTION**; AHJ and licensed professionals retain approval authority.

## General release rules
- Never promote a previous-head CI green result to a new commit; record immutable SHA, run URLs, commit-associated deployment ID, alias and screenshot evidence.
- A GitHub connector's `fetch_commit_workflow_runs` currently lists only PR-triggered runs. To examine **all** Actions events use the approved GitHub Actions web UI or `gh run list -R aerovista-us/lot-assessment -b feat/design5-shared-architecture-contract --limit 100 --json databaseId,headSha,event,status,conclusion,workflowName` and exact-sha filtering.
- Never allow `Vercel: success` to substitute for governed preview authorization, correct alias, or browser QA.
- No force-push or feature history rewrite to resolve PR #100. Create a safety branch pointing at its current head; merge `main` into the feature and inspect both trees. Restrict production merge to explicitly accepted scope.
- Keep preview-only credentials, exact origin, role checks, and reversible ACOS overlay; do not expose credentials or enable production fallback.
- Pondy D4 currently has four `LOCKED` roof **model** records and a Home B valley, but `customerPublicationAllowed=false` is the safe customer-release authority until independent exact-source/view/print verification.
- Preserve complete rollback links, no false roof/sections PASS, no hidden missing report categories or flipped lot jog.

## P1 — Complete LotScope branch integration — FIRST
**Inputs:** `main` latest SHA; PR #100 head; exact checkout source, workflow files, QA tests and plan.

1. Inspect GitHub compare ahead/behind and changed files; read both independent preview workflow blobs. Record `main`, original feature SHA and their merge base. Back up original feature commit to a separate branch.
2. Merge current `main` **into** `feat/design5-shared-architecture-contract` without rewriting its 46-commit history. Resolve any collision explicitly; preserve one `.github/workflows/design5-preview-deploy.yml` with branch guard, preview environment, expected project ID and `npm run test:new-lot-intake`. Preserve this file and the master strategy document.
3. Assert no Workbench auth, customer Pages, or production secrets changed incidentally. Verify `docs/PRODUCT_COMPLETION_PLAN_2026-10-14.md`, this execution plan, `packages/lot-intake/index.ts`, new-lot page, `scripts/test-new-lot-intake.mjs`, `package.json`, and governed workflow are present at the resulting exact head.
4. Requery PR #100 mergeability and `main...feature` comparison. If still nonmergeable, examine the exact remaining file conflict and keep the draft open; do not merge feature into production.

**Exit evidence:** original feature backup ref, two-parent integration commit, new head SHA, compare showing feature not behind `main`, `mergeable:true` and intact files. **Gate:** release remains blocked pending P2/P3.

## P2 — Exact-head automated acceptance — SECOND
1. Obtain **unfiltered** Actions history for branch/commit, including `pull_request`, `push` and `workflow_dispatch`. Record event, run ID, SHA, status and conclusion. An empty PR-only result is not evidence of zero workflows.
2. Run and check on **the same integration SHA**: Workbench Identity QA (including `npm run test:new-lot-intake`, TypeScript/build, auth negatives), Workbench intervention editor QA, authoritative circulation engine QA, roof geometry/edge visibility fail-closed QA, and Pondy solver benchmark.
3. Confirm the independent six-vertex jogged lot and invalid/bow-tie/duplicate vertices reject as intended; verify current candidate/roof/report source signatures. Capture logs/artifacts and resolve any failure at source, then restart the five-suite exact-head gate.
4. Do not treat third-party Vercel commit status as acceptance.

**Exit evidence:** 5/5 completed success, tests and negative fixtures at exact integration SHA, links to every run. Record in [LotScope #106](https://github.com/aerovista-us/lot-assessment/issues/106) and PR #100.

## P3 — Governed preview and founder acceptance — THIRD
1. Using authorized scope, execute only `.github/workflows/design5-preview-deploy.yml` with its approved feature branch and protected `design5-preview` environment. Never deploy production or change the identity secret fallback.
2. Record approved Vercel project ID, deployment ID, READY state, immutable Git commit, exact alias, DNS/TLS, and Account → IDGW handoff origin. Check that the alias serves **the same code SHA**.
3. Founder log-in/callback/refresh/reload/logout; staff/nonfounder rejected; wrong origin, stale/replayed state and callback denied; preview hidden from normal Connected Apps. Preserve ACOS rollback.
4. Real desktop browser: create revision, wall/vertex pointer drag, snap steps, pointer-up/cancel, keyboard, invalid geometry rejection, optimistic saved revision/reload/hash, roof stale-source invalidation, undistorted east/top jog, report sections present or blocked.
5. **Physical mobile device**: touch drag/cancel, scrolling/zoom, overlays, responsive report and viewer QA; emulator does not close the physical test requirement.
6. Capture screenshot evidence, date, device/browser, exact SHA and all failures in [#103](https://github.com/aerovista-us/lot-assessment/issues/103).

**Exit evidence:** founder and denial flows pass, exact preview deployment evidence and desktop/physical-mobile screenshots. PR #100/ACOS #128 remain draft until their respective governed promotion gates pass.

## P4 — Reconcile and publish Pondy status — FOURTH
1. Confirm current static Pages deployment commit (not merely `main` SHA) and exact file revisions. Compare customer homepage, D4 overview/status, compare, elevations, sections, axon and standalone exports against model provenance.
2. Review [Pondy #55](https://github.com/aerovista-us/PondyFlats/pull/55); verify current roof owner geometry keys, Home B valley/low seam, rotated garage locks, ridge footprint/center, depth sort, eaves/fascia and report release signature. A model `LOCKED` field is not customer authority.
3. Verify `npm run gates` and `npm run export` plus exact committed client/presenter outputs; render QA at desktop/tablet/mobile, correct plan orientation and readable status across all pages. Promote PR #55 only after authorized review and passing checks.
4. Independently verify live Pages SHA after merge and downloaded export content; make every status/report surface consume a single versioned source-bound release manifest rather than drifting static labels.
5. Keep outbound mobility OPEN and roof/customer publication in REVIEW REQUIRED until genuinely accepted; no professional/AHJ approval implied.

**Exit evidence:** approved merge SHA, verified Pages deploy SHA, screenshot/print QA, no contradictory statuses, explicit withheld view reasons in [Pondy #53](https://github.com/aerovista-us/PondyFlats/issues/53).

## P5 — Complete the reusable service — FIFTH
**5A Lot intake:** authenticated server-owned projects, polygon/segment IDs, survey source confidence, frontage/access/north, setbacks, easements, zoning assumptions, revision hashes, save/reload/import/export, role isolation. Browser-local draft is not persistence. Exit: two unrelated lots survive reload and device switch, invalid update rejected.

**5B Alternatives:** one parameterized envelope/placement/circulation/topology engine, explainable gates, deduped candidates, transparent infeasibility, no Pondy-specific hardcoded shape. Exit: several meaningful options for an unrelated feasible lot, plus honest infeasible case.

**5C Editor and revalidation:** source-bound child revisions, walls/rooms/doors/stairs/roof junctions/eaves/fascia and full authoritative mobility rerun; stale evidence invalidated. Exit: edits persist and cannot retain stale PASS.

**5D Shared sheet + report compiler:** real cut geometry, four elevations and axon, scaled dimensions, A-001/A-101/sections, label collision gates and complete 22-category report with explicit blocked parts. Exit: regenerated views agree geometrically and retain true lot jog.

**5E Customer product:** approved publish manifest and account/client access, review history, report release control, audit trail and billing only after authorization proof. Exit: non-Pondy user can complete intake → alternatives → edit → validation → concept report end-to-end.

## Blocker and mitigation register
| Blocker | Immediate response | Release condition |
| --- | --- | --- |
| PR #100 diverged / nonmergeable | Preserve backup; integrate current main; check mergeability | New exact SHA, clean merge |
| Current Actions history unknown | Unfiltered Actions UI/CLI and run IDs | 5 green exact-head runs |
| NXCore offline | Restore authorized remote workstation, or use GitHub-supported reviewed integration operations | Host/browser acceptance possible |
| Vercel team access 403 | Reauthorize correct approved Vercel team/project scope | Inspector sees SHA/alias/READY |
| Founder and physical mobile QA | Complete #103 with devices and negative tests | Screenshots and sessions pass |
| Pondy Pages SHA unknown | Query Pages deployment and fetch served artifacts | Exact Pages SHA recorded |
| D4 roof authority ambiguous | Source-bound manifest plus geometry/visibility proof | Customer authorization remains false until pass |
| AHJ / zoning / structure / fire / drainage | Professional review; never infer code or permit | Concept-only until independent approval |
| ACOS registration overlay | Keep reversible overlay and rollback artifacts | Signed-off identity promotion |

## Reporting and closeout
Update this document's execution ledger, PR #100 / #55, [#106](https://github.com/aerovista-us/lot-assessment/issues/106) and [#103](https://github.com/aerovista-us/lot-assessment/issues/103) with each actual head SHA and proof. Only mark verified work complete. The acceptance chain is **source → tests → deployed exact SHA → browser evidence → explicit promotion**.

### Execution ledger (initial)
- [ ] P1 current `main` merged into Design 5 feature (record SHA)
- [ ] P2 all five hosted QA workflows on merged SHA
- [ ] P3 governed exact-SHA preview and founder/mobile acceptance
- [ ] P4 D4 status/release manifest and verified Pages rollout
- [ ] P5 unrelated-lot end-to-end customer concept
