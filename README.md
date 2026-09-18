# LotScope / Lot Assessment

**Can I Build That Here?** — an AeroVista Local early-feasibility utility backed by the same deterministic geometry stack used by the internal Workbench.

## Two surfaces, one engine

- `/` — **Public LotScope v2 Guided Assessment**: grouped LOT / RULES / PROJECT / ACCESS facts, Quick Rectangle or honest Custom Lot Facts approximation, separate feasibility and information-confidence results, and explicit assumptions to verify.
- `/workbench` — **LotScope Workbench**: internal solver/staff surface for ranked topology search, candidate triage, lifecycle management, constrained intervention, mobility screening, program feasibility and evidence review.

**Promotion rule:** Public may package capabilities already proven in Workbench/shared code; Public is not the experimental geometry surface.

## Current Pondy benchmark capability

Pondy Lot 2 now exercises reusable packages for:

- exact irregular parcel + segment-specific setback envelope;
- parameterized topology generation and ranked search;
- explicit placement containment and intentional integration groups;
- compound/L-shaped residential massing;
- full-size SUV swept-path validation;
- bounded geometry/access repair and site-efficiency ranking;
- fast program feasibility with garage area removed from conditioned capacity;
- solver-backed candidate triage and concept deduplication;
- persistent candidate lineage/checkpoints in the staff draft workspace;
- constrained direct manipulation of homes, garages, openings, pavement and route hints;
- machine screening of exact interventions and bounded Explore Around Edit alternatives;
- auditable benchmark JSON / manifest / comparison artifacts.
The current discovery/search stack can produce multiple distinct machine-ranked concepts. Candidate Search & Triage reduces raw solver states to representative staff options and classifies them as **Recommended**, **Acceptable for Intervention**, or **History**. Machine evidence owns PASS; staff cannot promote a candidate by judgment alone.

The checked-in Design 4 / Design 4B Pondy records remain intervention candidates, not authoritative outbound circulation passes. The Intervention Editor can screen exact edited geometry, but newly edited children must still be rerun through the full authoritative mobility pipeline before PASS/PROMOTION_READY can apply.

See:

- `docs/BUILD_STATUS.md`
- `docs/PONDY_CAPABILITY_ROADMAP.md`
- `docs/HANDOFF_2026-09-18_WORKBENCH_LIFECYCLE_INTERVENTION.md`

## Candidate staff workflow

1. Run Exploration and review machine-triaged representatives.
2. Save a candidate that deserves continued work.
3. Open **Create Intervention** to create a protected child revision and baseline checkpoint.
4. Drag/move/rotate supported components or use optional precision controls.
5. Every geometry change marks prior evidence STALE and creates a recovery checkpoint.
6. Use **Evaluate exact edit** for local intervention screening.
7. Use **Explore around edit** to generate bounded machine-screened neighbors.
8. Compare parent/child/alternatives and retain the best evidence-backed revision.
9. Rerun the authoritative mobility/circulation pipeline before treating an edited child as PASS.

Lifecycle v1 draft persistence is browser-local (`localStorage`). `.lotscope.json` import/export is the portable handoff format until shared/account-backed persistence is wired.

## Public v2.0

Public remains manual-facts-first: it does not invent zoning rules.

Inputs are grouped into Lot, Rules, Project and Access facts. Each important fact can carry an information state such as Confirmed, User supplied, Assumed or Unknown. Results intentionally separate feasibility from information confidence.
## Product direction

The user-facing promise remains **Can I Build That Here?** while `lot-assessment` is the broader product/repository concept.

Current product layers:

1. guided manual dimensional feasibility — **working**
2. information-confidence / provenance states — **working**
3. reusable irregular-lot geometry — **working in Workbench**
4. driveway / garage / vehicle-turning analysis — **working in Workbench**
5. topology generation, legalization, bounded repair and ranking — **working in Workbench**
6. candidate search/triage and deduplication — **working**
7. lifecycle/checkpoint/import/export/compare — **working**
8. constrained direct-manipulation Intervention Editor — **working**
9. authoritative revalidation of edited intervention children — **next**
10. official parcel/jurisdiction/code retrieval and citations — future
11. shared/account-backed staff candidate persistence — future

## Stack

- Next.js 16.3.2
- React 19.2.8
- TypeScript
- GitHub Actions benchmark validation
- Vercel deployment
- AeroVista Local analytics/branding pattern

## Local validation

```bash
npm install
npm run lint
npm run test:canonical
npm run test:room-packing
npm run test:workspace
npm run test:intervention
npm run build
```

Public: `http://localhost:3000/`  
Workbench: `http://localhost:3000/workbench`

## Deployment discipline

Solver/intervention iteration is validated locally and through repository checks before merge. Generated `tsconfig.json` / `next-env.d.ts` build noise must not be committed. Vercel is the release/deployment signal for merged Workbench/public changes.

## Safety / authority boundary

LotScope is an early planning aid, not a permit decision, survey, legal opinion, engineering analysis, architectural construction set, or guarantee of buildability. Automated code/zoning data must retain source links, verification dates, jurisdiction/effective-date context and explicit uncertainty states.
