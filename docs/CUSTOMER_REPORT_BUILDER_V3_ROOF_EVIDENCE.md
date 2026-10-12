# Customer Report Builder v3 · Source-bound roof evidence

Date: 2026-10-12. Scope: existing **Create Customer Report** button in LotScope Workbench's Candidate Library and individual saved-candidate pages. The report is still private, browser-generated HTML with **Print / Save PDF**; it is not public customer publishing or a construction sheet.

## Real improvement over v2

Where a candidate has ALL roof owners locked, safe, and current to their matching footprint, the downloadable report now adds a **real roof source gallery**:

- Each owner gets exact source roof surface-plan face polygons and **five analytic camera views** (model NORTH/SOUTH/EAST/WEST and one axon).
- Screen-space roof edge intervals are derived by the existing **planar verified-interval solver**, never drawn by loosely tracing a screenshot or assigning fake roof slopes. Visible = solid; hidden = dashed gray; unresolved = dashed orange.
- Each camera has its own result, edge counts, edge-on and collapsed counts, source face/edge IDs, and `INTERVAL_VERIFIED`, `REVIEW_REQUIRED`, or `WITHHELD` status.
- For actual solved valleys, perpendicular source section cuts intersect real roof face geometry. If two faces do not meet at the locked junction, the corresponding section is marked `REVIEW_REQUIRED` and cannot be drawn as a verified section.
- The full source roof owner gallery fails closed if **any** roof owner is missing its lock, has stale geometry, or fails the drawing handoff. The simpler schematic axon and four horizontal-span studies stay labeled ILLUSTRATIVE and retain a no-invented-vertical-geometry disclosure.
- The overall roof-source status `MODEL_VERIFIED` describes locked model geometry only. A model camera view can still be `REVIEW_REQUIRED`; it must never be represented as architectural hidden-line certification.
- Source parcel +X right / +Y down, buildings, routes, source SHA and 22-category report coverage from earlier releases remain unchanged.

## Acceptance and precise test cases

- Canonical Design 4: all 4 roof owners, 20 independent camera views; Home B 4 cardinal projections `REVIEW_REQUIRED` with unresolved segments, while its axon interval classification is `INTERVAL_VERIFIED`.
- Two real Home B modeled valley-section intersections are present, with authentic source face IDs and the **construction/structural/drainage approval explicitly open**.
- Rotated Design 4 derivative with stale roof owners: zero published source roof SVG projections.
- Candidate with no roof component: explicitly withheld; zero roof edge projection SVGs.
- Movement of source owner after roof locking: all roof projections withheld.
- Existing candidate report test: all 22 features, source SHA, no reflection of lot jog, rendered footprints, schema security escaping.
- Hosted exact-head Workbench QA runs the new geometry test and clean Next build. Visual desktop/mobile/print acceptance additionally checks legibility and no overflow.

## Remaining work

- New `adaptive-front-l` candidate currently lacks candidate-owned, source-authoritative roof components, building heights, actual wall/room/opening records, and model-approved building sections. The report cannot invent them. **Build Full Design Package** issue #94 remains the P1 architecture/geometry project.
- Browser PDF printing is available, but a separately generated, reproducible architectural-scale PDF drawing package is not yet implemented in Workbench.
- No guarantee of structural / snow / roof drainage, easement, surveyed orientation, permit, or AHJ acceptance.
