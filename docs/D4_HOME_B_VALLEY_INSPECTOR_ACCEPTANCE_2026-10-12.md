# Design 4 · Home B valley-inspector visual acceptance

Date: 2026-10-12 UTC (2026-10-11 PDT). Scope: LotScope authenticated Workbench route \`/workbench/roof-drawings\`.

## Change

The former three-column read-only cards have been replaced with a **single selected roof owner** (default \`home-b\`), selectable Home B/Home A/Garage B/Garage A tabs, a large plan and analytic visibility panel, independent north/south/east/west/axon view choices, and a source edge inspector.

* The edge picker identifies each projected segment E1, E2, ... by \`faceId\`, \`edgeIndex\`, normalized parameter \`t0..t1\`, classification and explicit review reason when present. Optional ID overlay and unresolved emphasis never alter source coordinates or classifications.
* Roof geometry stays locked. The browser receives only output from the existing \`validateCandidateRoofs\` -> \`roofDrawingHandoff\` -> \`verifyRoofEdgeIntervals\` path. No new mutation, login bypass or construction authority.
* In Home B, two independent cuts use actual solved 3D junction segments \`kind=VALLEY\` at their midpoints. Each cut direction is **perpendicular to the actual plan valley vector** and the displayed profile comes exclusively from \`intersectRoofSection\` against the locked roof surface faces. Plan cut traces stop at source-section extent. Two distinct roof faces must meet at the exact midpoint Z within 0.025 ft, or the section reports \`REVIEW_REQUIRED\` rather than a source intersection pass.
* Homes/garages without solved valleys display *no synthetic valley sections*.
* \`CONCEPT ONLY — NOT FOR CONSTRUCTION\` remains visible. Fascia, drainage, snow loading, structural support and AHJ review remain separate.

## Exact-source Home B fixtures

The solver's two valley IDs come from \`home-b-roof-zone-1__home-b-roof-zone-2__valley-1\` and \`...valley-2\`.

| Cut | Midpoint world XY (ft) | Source Z midpoint (ft) | Independent face segments | Model status |
| --- | --- | --- | --- | --- |
| V1 | (89.000, 17.750) | 22.125 | 5 | SOURCE_INTERSECTION |
| V2 | (78.000, 17.750) | 22.125 | 6 | SOURCE_INTERSECTION |

The geometry gate checks original source IDs, both distinct intersecting face IDs at cut zero, source delta/residual, full roof-plan XY cut traces, and falsified/stale model errors. This is **model surface continuity evidence**, not valley drainage/roofing detail certification.

## Visual QA results

Isolated Next.js browser preview at desktop 1440 px, tablet 768 px and mobile 390 px using actual Chrome/Chromium and the same real React component:

- **3/3 responsive, interactive passes.** All open \`home-b\` by default; 4 owner selectors; V1/V2 in plan and 2 section illustrations; north still \`REVIEW_REQUIRED\`.
- Changing view to axon presents \`INTERVAL_VERIFIED\` with no unresolved segment (model-view only).
- Selecting E1 highlights the source edge ID and shows face provenance; the ID overlay appears.
- Choosing V2 changes the active valley marker without replacing source drawings.
- Selecting Home A removes valley-section drawings and shows the explicit "no solved valleys" explanation.
- No detected JS page errors or document horizontal overflow at 1440/768/390. Responsive layouts are two-up desktop and stacked mobile.
- Test screenshots on authorized NXCore device: \`/home/glyph/roof-inspector-qa-20261012/initial-{1440,768,390}.png\` and \`axon-{1440,768,390}.png\`. These are **local isolated-fixture screenshots**, not claims of production authenticated-browser acceptance. The temporary test-only route is removed from the committed code.

## Gates remaining open

1. Live authenticated founder session must view the updated route and test owner/view switching. Preserve existing role and capability enforcement.
2. Architect/structural/roofing engineer must review both **specific** valleys: runoff/drainage paths, flashing/underlayment, slopes, structural support, snow shedding, eaves/fascia and actual code/permit constraints.
3. Cardinal views still have edge-on/collapsed projected faces and unresolved intervals; this build deliberately does **not** promote the north/south/east/west geometry to drawing-grade certification.
4. After merge, verify deployed Vercel commit SHA and inspect protected live page; no public test route permitted.

Related: LotScope issues #86 and #90, design authority in packages/roof-geometry and prior customer report audit.
