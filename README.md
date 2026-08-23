# Lot Assessment

**Can I Build That Here?** — an AeroVista Local early-feasibility utility.

Lot Assessment turns known site/project facts into a fast, explainable screen for likely dimensional conflicts before deeper design or permitting work begins.

## Two surfaces, one engine

This repository now has two intentional product surfaces on the same `main` codebase:

- `/` — **LotScope public UI**: simple, customer-facing early feasibility.
- `/workbench` — **LotScope Workbench**: internal/agent design surface for ProjectSpec, constraint ownership, candidate generation, solver gates, ranking, bounded repair, freeze and delivery.

Do not maintain these as long-lived Git branches. They should share the same deterministic engine so customer-facing assessment and expert design tooling cannot drift apart.

The Workbench seed includes:
- `lib/workbench.ts` — ProjectSpec/pipeline/candidate model
- `projects/pondy-lot2/project.json` — first regression fixture
- `skills/lot-design/SKILL.md` — agent orchestration contract

The current Workbench candidate cards are explicitly seed/demo data. They are not solver-proven designs yet. The next engineering milestone is extracting the real Pondy polygon/circulation math into reusable packages and replacing seed candidates with generated results.

## Current MVP

The public first slice is intentionally **manual-facts mode**. It does not guess zoning rules.

Inputs:
- lot width/depth
- front/rear/side setbacks
- max lot coverage
- unit count
- living area per unit
- stories
- enclosed garage spaces
- whether garage footprint overlaps upper-floor living area
- driveway/access width and assumed minimum

Outputs:
- rectangular buildable envelope
- setback-envelope area
- coverage-cap area
- estimated project footprint
- footprint-capacity utilization
- `POSSIBLE`, `CONSTRAINED`, `LIKELY NOT FEASIBLE`, or `NEEDS VERIFICATION`
- plain-English reasons, concerns, and next checks

The engine is deterministic and source-ready. It should never invent a zoning fact.

## Product direction

The user-facing promise remains **Can I Build That Here?** while `lot-assessment` is the broader product/repository concept.

Planned layers:
1. manual dimensional feasibility
2. parcel + jurisdiction lookup
3. official zoning/use/setback/coverage/parking citations
4. irregular lot geometry and easements
5. driveway, garage-door and vehicle-turning analysis
6. multiple-building placement studies
7. visual site-fit comparisons and explainable alternatives
8. topology generation, bounded repair and diverse candidate ranking in Workbench
9. canonical-model-derived plans/elevations/sections/deliverables

## Pondy learning loop

The Pondy project is intentionally treated as a capability-development case rather than hard-coded product logic.

Capture reusable findings such as:
- irregular-lot representation
- frontage and access constraints
- small driveway adjustments that unlock circulation
- garage-door orientation and backing geometry
- shared vs independent access
- two-building placement
- side-yard asymmetry
- turning-path/pass-fail rules
- how to distinguish a zoning problem from a geometry problem
- how to show small design adjustments that move a concept from blocked to workable

Those lessons should become tested generic capabilities in Lot Assessment, not one-off Pondy exceptions.

See `docs/PONDY_CAPABILITY_ROADMAP.md`.

## Stack

- Next.js 16.3.2
- React 19.2.8
- TypeScript
- AeroVista Local analytics/branding pattern

## Local development

```bash
npm install
npm run dev
```

Public UI: `http://localhost:3000/`  
Workbench: `http://localhost:3000/workbench`

Type check:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

## Environment

Copy `.env.example` and configure a dedicated Umami website ID before production launch.

Current public hostname:

`lotscope.aerovista.us`

## Safety / authority boundary

Lot Assessment is an early planning aid, not a permit decision, survey, legal opinion, engineering analysis, or guarantee of buildability. Future automated code data must retain source links, verification dates, jurisdiction/effective-date context, and explicit uncertainty states.
