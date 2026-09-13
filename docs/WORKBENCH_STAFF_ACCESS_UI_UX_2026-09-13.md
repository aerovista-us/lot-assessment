# LotScope Workbench — Staff Access UI/UX Plan

Date: 2026-09-13
Status: product/UI direction
Repository: `aerovista-us/lot-assessment`

## UX principle

The internal staff surface should feel like an operating workspace, not a developer console. Staff should always be able to answer two questions:

1. What should I do next?
2. What is preventing this lot/design from advancing?

The solver remains underneath the experience, but the UI organizes work around lot progress, candidate review, controlled intervention, evidence and presentation.

## Entry surface

Current internal entry route: `/workbench`.

The Staff Home should prioritize operational tasks rather than technical tools. Primary cards:

- **New Lot** — begin intake.
- **Active Lots** — continue in-progress work.
- **Intervention Queue** — machine-classified acceptable candidates that may benefit from staff adjustment.
- **Needs Information** — blocked by missing survey/rules/program facts.
- **Ready for Decision** — multiple valid candidates awaiting human preference selection.
- **Ready to Present** — frozen candidates needing report/package work.

Advanced solver and engineering tools remain available under an Advanced/Engineering area rather than dominating the landing page.

## Proposed route model

These are target routes, not claims that they already exist:

- `/workbench` — staff home.
- `/workbench/projects` — project/lot list.
- `/workbench/projects/[projectId]` — lot workspace.
- `/workbench/projects/[projectId]/explore` — automated search and run history.
- `/workbench/projects/[projectId]/candidates` — candidate library.
- `/workbench/projects/[projectId]/candidates/[candidateId]` — candidate workspace.
- `/workbench/projects/[projectId]/candidates/[candidateId]/edit` — intervention editor.
- `/workbench/projects/[projectId]/compare` — side-by-side comparison.
- `/workbench/projects/[projectId]/evidence` — evidence history.
- `/workbench/projects/[projectId]/present` — freeze/package/presentation.

Existing specialized pages can remain during migration and gradually route into this model.

## Lot workspace

Every lot should show a persistent progress ribbon:

`Intake -> Rules -> Program -> Explore -> Review -> Intervention -> Validate -> Select -> Freeze -> Present`

Each stage shows one of:

- complete;
- active;
- blocked;
- not required;
- stale/revalidation required.

The workspace should surface blocking facts directly. Example:

> Intervention required — Design 4 has acceptable site/program geometry, but full outbound circulation is not yet proven.

Staff should not have to interpret raw JSON to understand why a lot cannot advance.

## Intake / facts panel

New-lot intake should gather:

- customer/project identifier;
- street address and parcel/APN when known;
- jurisdiction;
- survey/parcel polygon and frontage;
- source/provenance for dimensional facts;
- setbacks and other known rules;
- requested unit count;
- living-area target;
- stories;
- garage/stall requirements;
- design vehicle and special access needs;
- easement/slope/site notes;
- assumptions and unknowns.

Every important fact should carry a provenance/information state such as Confirmed, User supplied, Assumed or Unknown.

## Exploration screen

The initial staff action is **Run Exploration**.

The screen should show:

- active topology families;
- number of raw candidates evaluated;
- number surviving hard gates;
- number of distinct clustered candidates;
- current run stage;
- major reason categories for rejection;
- top recommended and acceptable candidates as they become available.

Staff should not be required to inspect the entire raw candidate grid.

## Candidate Library

The Candidate Library is the central review surface after exploration.

Default sections:

### Recommended
Passing candidates ranked highly by the current evidence/ranking policy.

### Acceptable for Intervention
Promising partial failures with localized/repairable blockers.

### Rejected / History
Retained evaluations that are not recommended for normal human repair effort.

Candidate cards should include:

- plan thumbnail;
- design/revision label;
- topology/family;
- parent lineage;
- machine status;
- key pass/fail chips;
- strongest margin/blocker;
- short reason for current classification;
- last evaluated engine/rules version.

Useful filters:

- machine status;
- topology;
- design family;
- intervention type;
- garage/access strategy;
- circulation result;
- setback result;
- program result;
- staff-created versus automation-generated.

## Candidate Workspace

Opening a candidate shows a component-based plan with an inspector panel.

### Plan area

Selectable elements include parcel, setback envelope, homes, garages, stalls, doors, driveway, pavement, route/control paths and annotations.

### Inspector

The inspector shows exact component properties and current evidence relevant to that component.

Garage example:

```text
Garage B
22 x 22 ft
Rotation: 35 deg
Door face: southeast/east local wall
Position: X/Y
Structure separation: 2.3 ft
Current evidence: STALE / PASS / FAIL
```

Home/pavement/route components expose equivalent type-specific properties.

### Candidate summary

Always visible:

- parent design;
- machine status;
- what passed;
- what failed;
- why it is or is not intervention-worthy;
- current evidence timestamp/version;
- notes/intent.

## Entering intervention mode

Staff selects **Create Intervention**. Workbench creates a child revision before the first edit.

The parent remains immutable.

Intervention mode should make it visually obvious that the user is changing a branch rather than altering the original evidence.

Initial direct-manipulation tools:

- Select;
- Move;
- Resize/re-proportion;
- Rotate;
- Edit opening;
- Edit pavement;
- Edit route hint/control points;
- Lock/unlock allowed parameters;
- Annotate.

No manual PASS/FAIL control is exposed.

## Live editing feedback

Live feedback is advisory and should use language such as:

- likely conflict;
- estimated separation;
- prior evidence stale;
- needs pipeline rerun;
- outside current known envelope;
- topology changed — consider new design.

Do not show stale green PASS badges after geometry changes.

A compact live property card can show, for example:

```text
Garage B
22 x 22 ft
Rotation 34.7 deg
Garage A separation ~2.3 ft
Parcel/setback: needs rerun
Circulation evidence: STALE
```

## Save choices

When the staff member saves, Workbench offers context-sensitive actions:

- **Save checkpoint** — same draft branch, lightweight recovery point.
- **Save revision** — bounded geometry variation of the same design.
- **Save as new design** — materially different topology/access/massing concept.
- **Discard changes**.

The system should suggest `Save as new design` when access topology, primary structure relationships or other major conceptual elements change.

## Evaluation actions

Two prominent actions are required:

### Evaluate this edit
Runs the exact staff geometry through the current validation pipeline.

### Explore around my edit
Allows the employee to define or accept bounded search ranges around selected changes, then returns a new ranked descendant set.

Example range UI:

```text
Garage B rotation: 30–40 deg
Garage B move: +/-3 ft
Pavement expansion: 0–8 ft
Route controls: movable
Garage size: locked 22 x 22
```

The staff edit supplies search intent; the solver still finds and ranks the best-fit descendants.

## Comparison screen

Comparison should support parent vs staff edit vs solver-refined descendants.

Show both plan views and evidence metrics. Example columns:

- Design 4 baseline;
- Design 4B staff edit;
- Design 4B.2 solver-refined result.

Example rows:

- door clearance;
- minimum obstacle clearance;
- inbound result;
- outbound result;
- pavement containment;
- setback result;
- program result;
- structure separation;
- overall status;
- unresolved professional/AHJ items.

Staff can select a preferred candidate only from the evidence presented; selection does not alter machine validation status.

## Candidate lineage UI

Provide a compact tree/timeline:

```text
Design 4
|- D4 route repair
|- Design 4B — rotated garage
|  |- 4B.1
|  `- 4B.2
`- Design 5 — new topology
```

Clicking any node restores its component/evidence snapshot for review or branching.

## Import/export UI

Candidate toolbar:

`Save checkpoint | Duplicate | Branch variant | New design from this | Import | Export | Compare`

### Editable export

Export a portable `*.lotscope.json` or asset-bearing `*.lotscope.zip` package.

### Presentation export

Separate actions for PDF/SVG/PNG/report material.

### Import behavior

Import asks:

- Open as copy;
- Create variant;
- Create new design.

Imported evidence is historical only. The active candidate displays `REVALIDATION REQUIRED` until current pipeline evaluation completes.

## Staff-owned versus machine-owned decisions

### Staff owns

- customer intent;
- which acceptable candidate deserves intervention;
- geometric/design adjustments;
- which search area to explore around an edit;
- preference among passing/promotable candidates;
- notes and presentation intent.

### Workbench owns

- PASS/FAIL status;
- acceptable-for-intervention classification rules;
- hard-gate evidence;
- current/stale evidence determination;
- promotion readiness;
- validation trace.

## Presentation / freeze

Once a staff member chooses among passing candidates, **Freeze** records:

- exact component geometry;
- lot/rules snapshot;
- current evaluation IDs;
- engine/schema version;
- unresolved professional/AHJ conditions;
- selected design/revision lineage.

Only then should customer-facing package/render/report workflows treat the design as canonical.

## UX success test

A staff member unfamiliar with the underlying solver should be able to take a new lot from intake through automated exploration, understand the strongest options and blockers, modify a promising partial failure without overwriting it, rerun or explore around the edit, compare evidence, and advance a passing preferred solution without ever being given a button that fabricates a PASS.
