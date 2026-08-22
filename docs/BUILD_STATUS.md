# Lot Assessment — Build Status

Updated: 2026-08-22

## Status

**ACTIVE BUILD · MVP SLICE 1 IN SOURCE**

## Working now

- Next.js 16 / React 19 / TypeScript foundation
- AeroVista Local branding and separate Umami-ready analytics foundation
- Manual lot/project input workflow
- Deterministic assessment engine
- Rectangular buildable-envelope calculation
- Lot area, setback envelope and lot-coverage capacity
- Estimated project footprint from living area / stories / garage assumptions
- Access-width check
- Multi-unit / enclosed-parking constraint flags
- `POSSIBLE`, `CONSTRAINED`, `LIKELY NOT FEASIBLE`, `NEEDS VERIFICATION`
- Plain-English positive findings, concerns and next checks
- Shareable assessment summary
- Explicit authority/safety boundary
- 1200×630 OpenGraph image
- Production-domain environment contract
- Future Pondy-derived capability layer documented

## Important current limitation

The app does **not** automatically know zoning or parcel facts yet. The user supplies setbacks, coverage and access assumptions. This is deliberate: v1 would rather ask for a fact than fabricate a code answer.

## Next slice

**Parcel + jurisdiction foundation**

1. Add optional address/parcel input without sending the address to analytics.
2. Resolve governing jurisdiction separately from the deterministic geometry engine.
3. Define a normalized rule model for use/unit count, setbacks, coverage, height, frontage and parking.
4. Require source URL + verified/effective date on every automatic rule.
5. Preserve manual override mode for unusual cases and source conflicts.
6. Add rectangular site-plan visualization with front/street orientation.

## Pondy follow-on

Do not prematurely hard-code the unresolved project. Once Pondy has a defensible final solution, convert its lessons into generic geometry tests and fixtures. See `PONDY_CAPABILITY_ROADMAP.md`.

## Launch blockers

- Type/build verification in deployment environment
- Dedicated Umami website ID
- Vercel project + custom domain
- Mobile QA
- Meta Sharing Debugger
- Decide first supported jurisdiction(s) for automatic rule lookup

## Product rule

If an authoritative rule is unavailable, stale, ambiguous or conflicts with another source, output **Needs Verification** and show the conflict. Never silently select the most convenient zoning interpretation.
