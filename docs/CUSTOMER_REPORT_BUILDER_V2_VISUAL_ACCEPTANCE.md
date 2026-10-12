# Saved-candidate customer report builder v2 — visual presentation and authority

Date: 2026-10-12. This extends the existing private client-side **Create Customer Report** action in Pondy Lot 2 Candidate Library and each candidate detail.

## What is actually generated

- Large source-bound **A-001 site plan**, with parcel jog/handedness unchanged in model +X-right, +Y-down coordinates, no inferred geodetic bearing.
- Separate **A-101 building shell and integrated garage plan**, drawn from the same placed/rotated source polygon data. Garage footprints overlap their shell; home and garage areas must never be added twice without approved net schedules.
- **A-401 transparent wireframe massing**: XY plan footprints source-bound; graphical Z height is deliberately constant and dimensionless. Dashed caps are explicitly *not* a roof. This is an **ILLUSTRATIVE**, not model-verified architectural axon.
- **A-201 through A-204 four model-direction projection studies**: horizontal spans reflect source footprints; vertical graphic height is intentionally dimensionless. No actual plate, floor, facade, openings, ridge, pitch or construction datum is asserted.
- **A-501 access/route study**, displaying the actual saved vehicle approach centerlines. Drive paths are not evidence of inbound or outbound swept-path acceptance.
- Real model roof-plan linework only when ALL source roof owners pass the existing authoritative roof lock/geometry solver; otherwise roof is WITHHELD or REVIEW_REQUIRED.
- Full **22-feature coverage**, evaluation, source hash/revision, report sheet index, print/save-PDF control and risk explanations.

## Release gates

This phase is a truthful customer **concept report** builder, not a completed set of architectural drawings or an automatic roof designer. Four building study projections and the illustrative massing are present, but their categories are explicitly **ILLUSTRATIVE**. Actual architectural elevations/roof/sections/upper floor remain unavailable until source vertical and roof authoring is done.

Accepted two distinct, real repository candidate layouts: locked Design 4 and its rotated derivative, plus no-roof/stale-owner/invalid-vertex fixtures. Validates preserved parcel boundary jog, 22 distinct categories, seven new SVG studies, source footprint identifiers, exact source hash, and refusal to reuse stale roof. Clean local TypeScript and production Next build. Chromium visual test at desktop/mobile, print media style/overflow; protected user session must be separately checked after deployment.

The independent full Design Package (actual Home A/B/garage roof authoring, floors, sections and certified drawing parity) is tracked in issue #94. No private candidate contents are published here.
