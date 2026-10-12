# LotScope documentation hub

**Current baseline: 2026-10-12.** Shared design-document PR [#97](https://github.com/aerovista-us/lot-assessment/pull/97) and reusable floor/roof solver PR [#98](https://github.com/aerovista-us/lot-assessment/pull/98) are merged. The customer product remains **CONCEPT ONLY — NOT FOR CONSTRUCTION**.

## Start here

| Reader | Current document |
| --- | --- |
| Planner or Workbench user | [Workbench design-to-report guide](WORKBENCH_DESIGN_TO_REPORT_GUIDE.md) |
| Architect/engine developer | [Universal engine master specification](UNIVERSAL_DESIGN_ENGINE_MASTER.md) |
| Release owner | [Current build status](BUILD_STATUS.md) |
| Design data owner | [Design Document contract](UNIVERSAL_DESIGN_WORKBENCH_CONTRACT.md) |
| Floor/roof solver owner | [Universal Solver Phase 1](UNIVERSAL_DESIGN_SOLVER_PHASE1.md) |
| Roof authority / surfaces / camera QA | [Roof Geometry SOT](ROOF_GEOMETRY_SOT.md), [Visibility intervals](ROOF_EDGE_INTERVAL_ACCEPTANCE.md), [Overhang proposal](ROOF_OVERHANG_EXTENSION_V1_CONTRACT.md) |
| Customer report | [Candidate-to-report workflow](CANDIDATE_CX_REPORT_WORKFLOW_2026-10-12.md), [Roof report V3](CUSTOMER_REPORT_BUILDER_V3_ROOF_EVIDENCE.md) |
| Access + broker | [Workbench identity](WORKBENCH_IDENTITY_V1.md), [Identity handoff](LOTSCOPE_WORKBENCH_IDENTITY_HANDOFF_2026-10-02.md) |
| Pondy consumer | [Pondy shared-engine consumer](https://github.com/aerovista-us/PondyFlats/blob/main/docs/LOTSCOPE_SHARED_DESIGN_CONSUMER.md) |

## Source and authority rules

1. An exact saved candidate/revision and its parcel/owner polygons are the **geometry input**. Shape drafts are browser-local and bound to that source signature.
2. **DRAFT_UNVERIFIED** denotes authored floor/roof shape proposals. **GEOMETRY_CHECKED** is a narrowly checked model relationship (e.g. door fits a wall). **MODEL_PREVIEW** is a validated temporary roof computation, **not** a locked roof.
3. Only a separately validated source-current **ROOF_GEOMETRY_LOCKED** roof component enters the authoritative roof gallery. Unsupported roof topology and ambiguous visibility remain **REVIEW_REQUIRED/WITHHELD**.
4. The report builder produces a **private HTML concept report** with the same 22 evidence slots. A browser print-to-PDF is not a calibrated, authored architectural drawing set. Browser-local drafts do **not** publish automatically to PondyFlats Pages.
5. Model +X right and +Y down, world +Z up: never mirror a parcel or invent surveyed compass bearings.
6. Legacy documents and per-design closeout logs remain historical records. Do not interpret their frozen 2026-08/09 status as the current release baseline.

## Required development checks

Run `npm run lint`, `npm run test:universal-design`, `npm run test:universal-design-solving`, the current customer-report and locked-roof-gallery regression scripts, and `npm run build`; require hosted exact-head Workbench QA and roof-visibility checks. Confirm Vercel production SHA and an authenticated browser smoke test before claiming deployment.

## Open build milestones

Graphical drag/snap and automatic room partitions; door swings and code/egress; real stairs/headroom; arbitrary multi-roof topology; nonzero overhang surface extension; coordinated whole-building sections; exact-scale PDF, role-gated server persistence and cross-repo publication. Tracked in [issue #94](https://github.com/aerovista-us/lot-assessment/issues/94).