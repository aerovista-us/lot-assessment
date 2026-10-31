# LotScope / Workbench / Pondy Flats — customer report accountability
**As of 2026-10-31; source inventory and automated checks, NOT a construction signoff.**

## Scope and authoritative sources

- **LotScope report source:** `packages/candidates/customer-report.ts` and saved-design attachment `design-report-attachment.ts`; reports are built from candidate ID, source revision, geometry and optional saved design. An authenticated Advanced GET/POST report reads the **latest broker-stored** candidate/document, never a newly generated best-ranked alternative.
- **Workbench:** alternatives, user selection and browser-local saved design; explicit Workbench export is currently required before importing into the Advanced account project. No automatic cross-origin transfer has been shown.
- **Pondy Flats:** independent `aerovista-us/PondyFlats` report standard `js/customer-report-standard.js` and `docs/REPORT_ORIENTATION_CONTRACT.md`. Same 22 feature IDs, but its manifest/HTML/PDF, geometry/frame and evidence-ref gates are *not yet proven* end-to-end for arbitrary new customer designs.
- **Provenance:** browser-generated reports are marked `BROWSER_LOCAL`; reports fetched from protected Advanced project routes are marked `ACCOUNT_SAVED`. Both preserve candidate/design hashes. The context is explicit; generating a report does not itself grant an entitlement, upload an unrelated file, or publish a private project.
- **Physical limits:** `MODEL_VERIFIED` refers only to model checks. No report is equivalent to surveyed site acceptance, structural design, code approval, fire separation, roof drainage approval, verified stair/headroom/equipment clearances, permitted architecture, or construction signoff.

## The complete 22-feature reporting inventory

Status below reflects **available generator authority** rather than claiming every candidate has the same geometry. Missing inputs must remain `WITHHELD` or `REVIEW_REQUIRED`; illustrative drawings are never authoritative construction sheets.

| # | Registry ID | Report component | Typical authority / open issue |
|--:|---|---|---|
| 01 | `executiveHero` | Visual summary and decision gate | SOURCE_BOUND candidate overview; not a photorealistic signed visualization |
| 02 | `drawingGuide` | Reading guide and orientation | SOURCE_BOUND model +X right / +Y down; compass bearings not inferred |
| 03 | `sitePlan` | Source-aligned parcel/house/drive site plan | SOURCE_BOUND parcel and footprint vertices; site survey and municipal acceptance open |
| 04 | `siteAssumptions` | Parcel setbacks, street, constraints | REVIEW_REQUIRED until survey, easements, setbacks and geodetic evidence confirmed |
| 05 | `groundPlan` | Ground floor, garage, authored rooms | REVIEW_REQUIRED with shells; saved draft room polygons attached when authored; physical room and door approval open |
| 06 | `upperPlan` | Upper story and vertical connections | WITHHELD unless upper-story geometry is authored; then REVIEW_REQUIRED; real stair/headroom evidence open |
| 07 | `bubbleDiagram` | Room adjacency and relationships | WITHHELD unless rooms authored; then REVIEW_REQUIRED; room graph alone does not prove egress |
| 08 | `areaSchedule` | Building/garage/room area table | SOURCE_BOUND footprint gross areas when owners exist; overlap and net areas disclosed |
| 09 | `elevations` | Four model-direction projections | ILLUSTRATIVE only; normalized vertical dimensions are not true roof/wall heights |
| 10 | `materials` | Elevation appearance/material intent | WITHHELD without source-approved finishes, glazing, foundations |
| 11 | `sections` | Longitudinal and transverse cuts | WITHHELD pending actual Z datums and validated intersections; separate model previews may exist |
| 12 | `roof` | Roof zones/ridges/junctions/fascia | MODEL_VERIFIED only for complete locked source-current roof geometry; otherwise REVIEW_REQUIRED/WITHHELD |
| 13 | `axon` | Architectural/illustrative 3D massing | ILLUSTRATIVE footprint wireframe; not roof-accurate complete 3D architecture |
| 14 | `circulation` | Vehicular approach/garage clearance | REVIEW_REQUIRED with route centerlines; full swept-path/outbound acceptance open |
| 15 | `pedestrianAccess` | Foot/accessible/service routes | WITHHELD pending explicit source and compliance checks |
| 16 | `dimensions` | Witness lines, scale, source dimensioning | REVIEW_REQUIRED; consistent source XY exists, full paper-scale QA not complete |
| 17 | `comparison` | Comparative alternate layouts/designs | WITHHELD without revision-paired comparable metrics and same source parcel |
| 18 | `fieldNotes` | Contractor/utility/drainage coordination | REVIEW_REQUIRED; task/evidence guidance is not contractor approval |
| 19 | `evaluation` | Machine evaluation, blockers | SOURCE_BOUND only when active evidence current; otherwise REVIEW_REQUIRED |
| 20 | `sheetIndex` | Sheet manifest + deliverable statuses | SOURCE_BOUND registry, but entries intentionally flag missing sheets |
| 21 | `sourceProvenance` | Candidate revision, geometry and hashes | SOURCE_BOUND; `BROWSER_LOCAL` vs `ACCOUNT_SAVED` identified |
| 22 | `nextSteps` | Decision sequence and approvals outstanding | SOURCE_BOUND guidance, must not imply approval |

## Sheet and drawing mapping (not all are complete architectural deliverables)

| Sheet / artifact | Current representation | Release-grade gap |
|---|---|---|
| A-001 — site/parcel | Source-bound polygon and model XY, no silent reflection | Survey bearing, setbacks, plot scale and regulatory evidence |
| A-101 — building shells/garage | Source coordinates and overlap disclosed | True finished room/wall/opening plans and circulation |
| A-102 — room/floor | Selected authored draft zones and doors if saved | Full functional, safety, acoustic, service, code and circulation review |
| A-201–204 — elevations | Four source-horizontal-span projection studies | Real Z, facade/opening/roof geometry and verified occlusion |
| A-301 — roof | Locked source-owner roof faces/junction gallery when eligible | Roof-face visibility edge exceptions, drainage/structure/eaves |
| A-302 — longitudinal/transverse sections | Withheld as architectural sections | Source-built floors, elevations, stair geometry, roof cuts |
| A-401 — axon | Schematic footprint extrusion | Full building+roof mesh and true heights |
| A-501 — vehicle circulation | Recorded centerlines and source route context | Obstacle, outbound, garage maneuver, pedestrian access proof |
| Full PDF technical sheets | Browser Print / Save PDF of concept HTML | Deterministic scale, plot QA, production sheet package |
| Save → Reload → Report | Broker + account UI, source fingerprint and report equality tests | Live paid, authenticated browser/deployed private network acceptance |

## Legacy design comparison — not silently upgraded

| Reference | Previously demonstrated strengths | Status for arbitrary new candidates |
|---|---|---|
| Pondy Design 1 | Site, distinct floor plans, sections, elevations, massing | Reference-quality features; no generic source proof of all |
| Pondy Design 2 | How-to-read guidance, contiguous sheets, garage legend | Reference-quality UX; not a universal solver |
| Pondy Design 3 | Room zoning, bubble/area schedule, closure evidence | Reference-quality design; must use a new customer's own room source |
| Pondy Design 4 | Roof/junction evidence, views, dimensions and operational gates | Specific source-locked geometry; cannot be copied onto unrelated parcels |

Pondy Flats `main` maintains `docs/UNIFIED_CUSTOMER_REPORT_STANDARD.md` and `docs/REPORT_ORIENTATION_CONTRACT.md`. Open Pondy Flats presentation PR #39 is **draft and conflicting**, not a completed universal report release. Existing D1–D4 static reports should not be rewritten as newly approved geometry.

## Accepted checks and evidence

- Prior exact-merge release gate on NXCore: **12/12 PASS**, `gate-20261031T080011Z.txt`; AVCC **589/589** tests passed at the then-merged release head. It explicitly **excludes live Square, private Gateway/broker and authenticated browser proof**.
- Provenance correction branch: `npm run test:customer-report-provenance` — 22 unique categories, source hashes, local/account evidence, negative missing-document case.
- Additional report acceptance: `node --import tsx scripts/test-candidate-customer-report.mjs` — two geometry families, four model views, SHA, correct handedness, 0.001-unit vertex tolerance, false roofs withheld.
- Roof gallery acceptance: `node --import tsx scripts/test-customer-report-roof-gallery.mjs` — 20 camera intervals, two validated source valley cuts, unresolved directions disclosed, stale/missing roof refused.
- `npm run test:advanced-persistence`, `npm run test:advanced-account-ui`, `npm run test:universal-design`, `npm run lint` — passed with the provenance correction before merging.
- Browser-DOM tests use simulated server responses: they are **not** a full live payment/cookie/network acceptance.

## Release and ownership ledger

| Gate | Current disposition | Required owner/evidence |
|---|---|---|
| ACOS checkout and entitlement source | Merged to nonproduction branch | AVCC owner; exact-head CI and release approval |
| LotScope private-project UI and report source | Merged to nonproduction branch | LotScope owner; report and browser QA |
| Square export tokens | Catalog preflight drafted as ACOS PR #164 | Payments owner; actual Square Catalog API read in selected merchant/environment |
| Square Sandbox paid/refunded invoice | **NOT PROVEN** | Payments owner; hosted Sandbox receipt, signed event, AVCC ledger |
| Gateway `lotscope_advanced` service identity | **NOT ACTIVE** | Identity operator; protected credential, registration and service-level negative tests |
| Private broker HTTPS transport | **NOT LIVE** | NXCore operator; TLS, restricted DB role, no public access |
| Authenticated customer project journey | **NOT PROVEN** | Customer QA; actual cookie/handoff, non-top layout save, refresh, report SHA and screenshot |
| Pondy Flats arbitrary-candidate full report parity | **NOT PROVEN** | Report engine team; HTML/PDF manifest, orientation, sheet/source conformance |
| GitHub Actions | **BLOCKED BY BILLING** | Repo admin; resolve billing and rerun exact heads |
| Production publication | **HOLD** | Release approver only after all mandatory gates pass |

**Publication rule:** green code tests or a complete 22-slot registry are necessary, not sufficient. Production storefront remains checkout-disabled until a genuine Sandbox payment and the saved-revision report complete their authenticated, private, deployed acceptance tests.
