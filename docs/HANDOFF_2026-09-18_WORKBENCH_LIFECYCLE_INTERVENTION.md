# LotScope Workbench — Lifecycle + Intervention Handoff

Date: 2026-09-18
Repository: `aerovista-us/lot-assessment`
Canonical branch: `main`

## Executive status

The Candidate Search/Triage, Candidate Lifecycle, constrained Intervention Editor, and direct-manipulation work are merged into `main` and deployed through Vercel.

Current pre-documentation baseline:

- `main`: `507a9be9cef487dc1e9b72c32c8ab09b28cecd96`
- tree: `b394c1700bcfbc7a13b397216b27ef7150b999d6`
- PR #30 — Candidate lifecycle workspace — merged
- PR #31 — Constrained intervention editor — merged
- PR #32 — Direct intervention manipulation — merged
- Vercel status: SUCCESS

The two checked-in Pondy intervention records, Design 4 and Design 4B, are now actionable through a protected staff workflow. They remain **ACCEPTABLE_FOR_INTERVENTION**, not authoritative outbound circulation PASS.

## Product truth that must not regress

- Staff can never manually set PASS or PROMOTION_READY.
- Any geometry edit invalidates the prior current evaluation for that exact revision.
- Source registry/solver candidates are protected; intervention begins on a child revision.
- Import, restore, branch and direct edit all require revalidation.
- Intervention Editor evaluation is a screening layer, not the final authoritative mobility pipeline.
- Independent stall-to-Pennsylvania outbound proof remains a hard unresolved gate for the current Pondy intervention records.
- Permit approval, final zoning interpretation, engineering adequacy and construction feasibility remain outside LotScope's authority.
## Staff workflow now supported

1. Open Pondy Lot 2 and run **Exploration**.
2. Review deduplicated representatives in Recommended / Acceptable for Intervention / History.
3. Save a solver result that deserves continued work.
4. Open an intervention-worthy candidate and choose **Create Intervention**.
5. Workbench creates a protected child variant and baseline checkpoint.
6. Manipulate supported geometry directly on the plan or use precision controls.
7. Every committed change creates a recovery checkpoint and marks evidence STALE.
8. Run **Evaluate exact edit** for intervention screening.
9. Run **Explore around edit** to generate bounded neighboring alternatives.
10. Compare parent, child and alternatives; restore checkpoints as needed.
11. Export/import `.lotscope.json` when a portable handoff is needed.
12. Before promotion, rerun the exact intervention through the authoritative mobility/circulation pipeline.

## Lifecycle implementation

Primary files:

- `packages/candidates/workspace.ts`
- `components/workbench/useCandidateWorkspace.ts`
- `components/workbench/CandidateLibraryWorkspace.tsx`
- `components/workbench/CandidateWorkspaceClient.tsx`
- `components/workbench/CandidateCompareWorkspace.tsx`
- `app/workbench/projects/pondy-lot2/compare/page.tsx`
- `scripts/test-candidate-workspace.mjs`

Lifecycle behavior:

- browser-local draft persistence via `localStorage`;
- merge of checked-in registry records with local draft candidates;
- save/update candidate from exploration;
- checkpoint creation and recovery;
- branch variant without mutating parent;
- new-design branch with new design identity/topology-pending state;
- import as copy / variant / new design;
- historical evidence preserved on import but marked non-current;
- component-level comparison between revisions;
- storage failures fall back safely rather than blocking checked-in candidates;
- checkpoint IDs preserve enough timestamp precision to avoid same-second collisions.
## Intervention Editor implementation

Primary files:

- `components/workbench/InterventionEditor.tsx`
- `components/workbench/DirectManipulationPlan.tsx`
- `packages/candidates/intervention.ts`
- `packages/candidates/intervention-evaluation.ts`
- `app/api/workbench/pondy-intervention/route.ts`
- `scripts/test-intervention-editor.mjs`

Supported direct manipulation:

- move homes;
- move garages;
- rotate garages;
- move editable driveway/route control points;
- reshape pavement by moving vertices;
- move garage-opening position;
- optional precision controls for coordinates, dimensions, rotation and opening settings.

Important behavior:

- pointer-up commits one geometry change;
- a recovery checkpoint is created before the committed edit;
- garage move/rotation carries modeled stall positions with the garage;
- parcel and derived-envelope objects remain protected;
- unsaved precision-field changes block Evaluate/Explore until saved;
- request-in-flight state prevents a stale evaluation response from overwriting a newer edit;
- bounded Explore Around Edit returns screening suggestions, never PASS declarations.

## Intervention screening

`POST /api/workbench/pondy-intervention`

Modes:

- `evaluate` — screens the exact supplied candidate revision;
- `explore` — generates bounded neighboring alternatives around one editable component.

The screening layer checks modeled parcel/structure/program/access conditions, full-body route screening and pavement-related conditions that are available in the intervention model. It explicitly returns `screeningOnly: true` and `authoritativeOutboundProven: false`.

This separation is intentional. Do not rename intervention screening to authoritative validation until the complete independent outbound pipeline is actually connected.
## Pondy candidate truth at handoff

### Design 4

- checked-in registry candidate;
- status: `ACCEPTABLE_FOR_INTERVENTION`;
- four inbound stall paths demonstrated in the recorded evidence;
- independent outbound circulation remains open;
- B-South remains locally tight;
- appropriate repair classes include route reshaping, garage translation/rotation, pavement flare and opening adjustment.

### Design 4B

- child intervention of Design 4;
- status: `ACCEPTABLE_FOR_INTERVENTION`;
- Garage B is rotated and local B-South clearance is materially improved;
- independent outbound circulation remains open;
- rotated accessory setback interpretation/recertification remains unresolved;
- it is a useful intervention branch, not a promoted final.

## Current validation baseline

Fresh validation on merged `main` passed on 2026-09-18:

- `npm run lint`
- `npm run test:canonical`
- `npm run test:room-packing`
- `npm run test:workspace`
- `npm run test:intervention`
- `npm run build`
- `git diff --check`

Production-mode smoke checks passed for Candidate Library, D4, D4B, Compare, Explore, Registry and candidate export. The intervention API returned HTTP 200 for both exact evaluation and neighborhood exploration, with five bounded suggestions in the exercised Garage B path.

PR #32 also recorded headless browser interaction QA for home drag, garage drag, garage rotation, route-point drag, pavement-corner drag and garage-opening drag, with recovery checkpoints and STALE evidence preserved.
## Recommended next milestone

### Authoritative intervention revalidation

Goal: make a staff-edited intervention child capable of earning or failing a true machine-owned circulation result for that exact geometry.

Recommended implementation order:

1. Build an adapter from `CandidateRecord` intervention geometry into the authoritative mobility input model.
2. Preserve exact parcel, structures, stalls, garage openings, pavement and route intent without silently normalizing away staff edits.
3. Run the full independent outbound proof for every modeled stall through the authoritative pipeline.
4. Persist that authoritative evaluation against the exact candidate revision.
5. Refresh candidate classification from the authoritative result.
6. Add a clearly separate **Evaluate authoritative** UI action next to screening controls.
7. Keep **Evaluate exact edit** labeled as screening until the full-pipeline action exists.
8. Add regression fixtures proving an edited child cannot inherit a parent's PASS and cannot promote while outbound remains unproven.

After authoritative revalidation is stable, the next operational improvement should be shared/account-backed draft persistence so staff candidates and checkpoints are not tied to one browser profile.

## Safe continuation rules

Before changing lifecycle/intervention behavior:

- start from current `main` and a new feature branch;
- keep source candidates immutable;
- preserve checkpoint/lineage history;
- do not weaken parcel, setback, collision, curvature, door-crossing, final-parking or program gates;
- do not promote a screening result to authoritative status;
- run all five current validation commands plus production build;
- remove generated `tsconfig.json` / `next-env.d.ts` noise after build if Next rewrites them;
- run `git diff --check` and inspect final diff before commit;
- use a PR and verify Vercel before merge.

## Deployment notes

The merged runtime implementation is on `main` and Vercel reported SUCCESS before this handoff was prepared. The documentation handoff was merged through PR #33 (`7c0b54d51bf4726e5aa084b060a38ce1ca56a1b5`). Documentation-only merges still trigger the normal Vercel flow and should be checked like any other protected-branch change.
