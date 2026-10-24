# Workbench UI and UX — October 23, 2026

## Customer experience

- A branded navigation bar identifies the workspace and active section. Phone and tablet navigation uses an explicit menu; Escape closes it and returns keyboard focus to its toggle.
- The home page leads to the active project, layout studio and report rather than advertising an unimplemented new-lot intake action. Registry counts are labeled as registry counts, not personal saved-work totals.
- The design library supports text search, source-check/refinement/local-draft filters, result counts and clear recovery from an empty result set. Imports remain available as a secondary action.
- The layout studio places the saved floor plan beside the room generator, with building and floor context, room labels, hallway/door legend and proposed doorway markers. Comparing alternatives does not replace the saved plan.
- Manual creation, wall/vertex editing, doors, roofs and shape management are expandable tools. Existing mutation handlers and all geometry, storage and report contracts are retained.
- Candidate actions distinguish layout/report work from version and backup tools. Local section navigation links directly to the studio, report, site arrangement and validation.
- Comparisons use a semantic table with persistent column labels and contained horizontal scrolling. They identify whether a saved room layout exists; the site arrangement is not presented as an interior floor plan.

## Validation

`node scripts/test-customer-journey-ui.mjs` exercises actual production components, with only router/download transports doubled. It retains the non-top layout save/reload/report and stale-download checks, and adds reachable advanced tools, mobile menu open/close, design search, no-results recovery and local-draft filtering.

`Workbench responsive UI QA` runs an isolated production-component fixture at 390, 768 and 1440 pixels. It covers the home page, library, studio and comparison, checks document overflow and keyboard menu behavior, and repeats non-top save/reload/exact-report fidelity. Screenshots and machine-readable evidence are uploaded for visual review. This does not establish hosted authentication, physical-device behavior or construction acceptance.

The local container lacks the private App Adapter package, so full TypeScript/build acceptance belongs to authenticated CI. The existing saved design schema, storage key, source binding and approval boundaries are unchanged.

## Release

Release requires green exact-head CI, screenshot review and production build verification. The live Design 4 non-top round trip and responsive visual evidence remain tracked in issue #132 until explicitly demonstrated. The previously published baseline smoke test is documented in `CUSTOMER_JOURNEY_ACCEPTANCE_2026-10-22.md`.

## Workflow follow-up

The next usability pass resumes the most recently updated local candidate or current saved design from Home, instead of sending every customer to a fixed registry example. Browser storage errors require retry and cannot silently turn the resume action into a different design.

The room generator initializes from the saved room names for the selected building/floor and restores them when returning to that context. Inspecting a room is separate from choosing a floor plate for generation, so selecting an existing room does not invalidate comparisons or accidentally become a floor seed.

Rooms can be selected directly on the plan or from the room key. The selected room exposes existing wall/vertex controls and snap size beside the canvas; Escape returns focus to the plan. Zoom and Fit are display operations and do not update saved geometry. A full-page report link uses the same current report as preview/download and is removed when the report becomes stale.

Component regressions cover saved-program restoration, context switching, direct selection, keyboard focus recovery, display-only zoom, saved-work resume/storage recovery and stale full-report links. The responsive browser workflow additionally opens the real blob report in a separate page and compares its complete saved design with the selected revision at phone, tablet and desktop widths. These are isolated component checks, not authenticated live Design 4 acceptance.
