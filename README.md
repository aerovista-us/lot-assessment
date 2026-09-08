# LotScope / Lot Assessment

**Can I Build That Here?** — an AeroVista Local early-feasibility utility backed by the same deterministic geometry stack used by the internal Workbench.

## Two surfaces, one engine

- `/` — **Public LotScope v2 Guided Assessment**: grouped LOT / RULES / PROJECT / ACCESS facts, Quick Rectangle or honest Custom Lot Facts approximation, separate feasibility and information-confidence results, and explicit assumptions to verify.
- `/workbench` — **LotScope Workbench**: internal solver/agent surface for ProjectSpec, topology search, legalization, FS-SUV swept paths, bounded repair, program feasibility, site-efficiency ranking and solver-derived site models.

**Promotion rule:** Public may package capabilities already proven in Workbench/shared code; Public is not the experimental geometry surface.

## Current Pondy benchmark capability

The old seed-only description is obsolete. Pondy Lot 2 now exercises reusable packages for:

- exact irregular parcel + segment-specific setback envelope;
- six parameterized topology families;
- deterministic full-grid sampling;
- explicit placement containment and intentional integration groups;
- integrated garages with residual home walls preserved as circulation obstacles;
- compound/L-shaped home massing using declared grouped components;
- full-size SUV swept-path validation;
- near-pass-only bounded repair;
- fast program feasibility with garage area removed from conditioned capacity;
- pavement-in-buildable-land ranking;
- historical R5.1e control with partial-comparability labeling;
- auditable benchmark JSON / manifest / HTML comparison artifacts in GitHub Actions.

The current discovery cycle has produced solver-backed baseline candidates that pass physical and program gates. Promotion is intentionally stricter than technical PASS and currently requires at least 1 ft clearance from non-access parcel edges plus net geometric capacity around the 1,800 SF/unit target with an 8% planning margin. Detailed room packing is still a later gate, not something the current benchmark claims to prove.

See `docs/EXECUTION_2026-08-27.md` and `docs/PONDY_CAPABILITY_ROADMAP.md`.

## Public v2.0

Public remains manual-facts-first: it does not invent zoning rules.

Inputs are grouped into:
- **Lot** — quick rectangle dimensions or custom-lot fact approximations;
- **Rules** — setbacks / coverage;
- **Project** — units, living target, stories, garages;
- **Access** — driveway/access assumptions.

Each important fact can carry an information state such as Confirmed, User supplied, Assumed or Unknown. The result intentionally separates:

1. **Feasibility** — what the entered geometry appears to support; and
2. **Information confidence** — how trustworthy the inputs supporting that conclusion are.

## Product direction

The user-facing promise remains **Can I Build That Here?** while `lot-assessment` is the broader product/repository concept.

Planned/promotion layers:
1. guided manual dimensional feasibility — **working**
2. information-confidence / provenance states — **working**
3. reusable irregular-lot geometry — **working in Workbench**
4. driveway / garage / vehicle-turning analysis — **working in Workbench**
5. topology generation, legalization, bounded repair and ranking — **working in Workbench**
6. lightweight solver-derived site comparisons — **working in Workbench/benchmark reports**
7. official parcel/jurisdiction/code retrieval and citations — future
8. detailed architectural room packing — next finalist gate
9. canonical geometry freeze and downstream documents — after finalist selection

## Stack

- Next.js 16.3.2
- React 19.2.8
- TypeScript
- GitHub Actions benchmark validation
- AeroVista Local analytics/branding pattern

## Local development

```bash
npm install
npm run dev
```

Public: `http://localhost:3000/`  
Workbench: `http://localhost:3000/workbench`

```bash
npm run lint
npm run build
```

## Deployment discipline

Solver iteration is validated with GitHub Actions and a local production server. Vercel is reserved for coordinated release QA / production rather than every geometry experiment. The target is one production deployment for the combined Public v2 + Workbench sprint once the human candidate-review gate is satisfied.

## Safety / authority boundary

LotScope is an early planning aid, not a permit decision, survey, legal opinion, engineering analysis, architectural construction set, or guarantee of buildability. Automated code/zoning data must retain source links, verification dates, jurisdiction/effective-date context and explicit uncertainty states.