# Saved candidate → Customer Concept Report (2026-10-12)

## Workbench workflow

After selecting or saving an exploration result, open LotScope Workbench → Pondy Lot 2 → Candidate Library. Every candidate card has **Create Customer Report**; the **Open candidate** detail page has the same button. This compiles the **currently selected** record and downloads a private standalone HTML file. Open in a browser or use Print → Save as PDF. No local candidate is uploaded to a server or published to PondyFlats.

The resulting report is strictly **CONCEPT ONLY — NOT FOR CONSTRUCTION**, not a completed architectural set. All 22 feature categories from the PondyFlats best-of-Designs-1–4 standard have visible evidence statuses; unavailable architectural sheets are explicitly WITHHELD or REVIEW REQUIRED.

## Truth and provenance guards

- Model +X right, +Y down, same as Workbench; no mirror or invented surveyed compass direction.
- Site SVG comes from original parcel, envelope, home, garage, pavement and route component vertices, not traced preview images.
- SHA-256 of selected candidate JSON, candidate ID and revision are recorded. User labels are HTML escaped; invalid parcel polygons and nonfinite vertex geometry fail closed.
- Roof-plan ridge/junction lines appear ONLY if candidate-specific roof objects are present and ALL pass the authoritative owner binding and roof geometry solver. Stale/invalid roof owner gets REVIEW_REQUIRED, absent roof gets WITHHELD.
- Actual room plans, four elevations, sections, axon and scaled construction sheets are WITHHELD without source floors, heights, openings and roof geometry.
- Rank/promotion evidence is not a permit, zoning, structural, drainage or circulation approval. The report does not modify privileges or access boundaries.

## Remaining milestones

This is the first wired Workbench report button. It does **not** magically author the missing roof, room layout, elevations or building sections; and it is not the custom Design 5 v4 PDF.

The next phase is an immutable candidate-bound **Build Design Package** job: floor/program authoring, wall/floor heights and openings; roof zone definition and junction/authority locks; source-bound architectural sheets; HTML and PDF from the same 22-feature manifest; exact revision comparison; client permissions/publication consent; rendered QA; independent professional signoff.

## Tests

- TypeScript and clean Next.js build.
- scripts/test-candidate-customer-report.mjs verifies 22 categories, SHA binding, source parcel orientation and original jog; roof verified when actually locked (D4), withheld when absent, downgraded when stale; escaping user labels and rejecting nonfinite geometry.
- Ephemeral local-only browser fixture confirmed pressing the actual button at 1440 and 390px generates 22-category HTML without page errors or horizontal overflow. That route must be removed before shipping; public access is not enabled.
