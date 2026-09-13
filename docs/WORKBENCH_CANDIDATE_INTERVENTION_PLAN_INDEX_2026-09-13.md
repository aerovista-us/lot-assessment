# Workbench Candidate Intervention Plan — Index

Date: 2026-09-13
Branch: `feature/workbench-candidate-intervention-plan`

This planning set captures the approved direction for evolving LotScope Workbench while preserving automation-first search and hard-gate validation.

## Read in this order

1. `WORKBENCH_CANDIDATE_INTERVENTION_ARCHITECTURE_2026-09-13.md`
   - product/architecture contract;
   - Project -> Lot -> Design -> Revision -> Evaluation model;
   - automation-first exploration;
   - acceptable-for-intervention state;
   - component model;
   - human intervention and Explore Around My Edit;
   - lineage/import/export/evidence rules.

2. `WORKBENCH_STAFF_ACCESS_UI_UX_2026-09-13.md`
   - staff-facing workspace behavior;
   - operational home screen;
   - lot workflow ribbon;
   - Candidate Library;
   - Candidate Workspace and Intervention Editor;
   - comparison, import/export and freeze UX.

3. `WORKBENCH_IMPLEMENTATION_ROADMAP_CANDIDATE_INTERVENTION_2026-09-13.md`
   - phased engineering order;
   - candidate registry before graphical editing;
   - branching/checkpoints/import-export before intervention;
   - exact evaluation and Explore Around My Edit milestones;
   - regression/acceptance cases.

4. `WORKBENCH_RESTORE_POINT_2026-09-13.md`
   - exact local pre-redesign restore commit/branch/tag;
   - remote main checkpoint;
   - recovery commands and guardrails.

## Locked product principles

- Workbench explores many options first and finds/ranks the best fit.
- Staff intervention is available only after useful candidates have been surfaced.
- Staff can alter design geometry and intent but cannot mark a gate PASS.
- Any edit makes prior evidence stale until the current pipeline reruns it.
- Failed and partial candidates remain documented and recoverable.
- Major topology changes become new designs; bounded changes become revisions/variants.
- Human edits can seed bounded automated search via **Explore around my edit**.
- Editable import/export and checkpoints are foundational, not late-stage conveniences.
- Promotion/freeze always points to exact machine evidence and engine/rules versions.

## Pondy reference cases

- Design 4: current shared-driveway baseline.
- Design 4B: rotated Garage B family / bounded concept variation.
- Design 5: materially different topology, including different access relationship rather than the same shared driveway.

These are acceptance examples for the workflow, not hard-coded product behavior.
