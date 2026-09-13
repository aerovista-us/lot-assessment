# LotScope vNext — Solve → Prove → Explain

## Goal

LotScope Public and the private Workbench must use the same reasoning/evidence system while presenting different levels of detail.

**Architecture rule:** one engine → one evidence record → two experiences.

- Public explains what appears feasible, what is tight, what is unknown, and what should happen next.
- Workbench exposes the same result with full technical metrics, provenance, and expert diagnostics.

## Implemented in this milestone

### Shared evidence schema
`packages/evidence/index.ts`

Defines:
- lifecycle states: DISCOVERED → SCREENED → AUDITED → PROMOTED → PRESENTABLE → FROZEN;
- gate states: PASS / PASS_TIGHT / WATCH / FAIL / PROFESSIONAL_REVIEW;
- metrics, findings, assumptions, professional boundaries, and exact-result traceability;
- audience filtering so public and private surfaces cannot drift into separate truths.

### Reusable audit contract
`packages/audit/index.ts`

Adds:
- reusable threshold classification;
- evidence validation;
- promotion checks;
- lifecycle advancement;
- a baseline audit contract covering geometry, access, parking, pavement, circulation, architecture, provenance, and public explanation.

### Public guided-assessment bridge
`lib/evidence-adapter.ts`

The existing public rectangle screen can now be translated into the same evidence model used by Workbench. This preserves the existing feasibility vs information-confidence split while adding formal gates and professional-review boundaries.

API:
`POST /api/assessment/guided`

Body:
```json
{
  "input": { "...": "LotAssessmentInput" },
  "confidence": { "...": "ConfidenceMap" }
}
```

### Pondy Design 4 regression fixture
`projects/pondy-design4/evidence.ts`

Ports the verified Pondy Design 4 geometry evidence into LotScope as the first cross-project evidence fixture. It intentionally preserves both the positive result and the practical warnings:
- 4/4 exact modeled vehicle paths pass geometry;
- B-North requires four gear changes;
- B-South has a 0.073 ft modeled garage-door crossing margin;
- zoning, garage separation, civil, structure/MEP, and permit readiness remain professional-review boundaries.

### Shared presentation component
`components/AssessmentResult.tsx`

The same evidence renders two ways:
- `/assessment/pondy-d4` — public decision-support presentation;
- `/workbench/assessment/pondy-d4` — private technical evidence presentation.

The Workbench view retains technical metrics and artifact SHA; public uses plain-language summaries and hides internal-only detail.

### Evidence API
`GET /api/assessment/pondy-d4?audience=public|workbench`

This makes the evidence record reusable by future UI, exports, AVCC, or reporting workflows without scraping HTML.

## Next implementation slices

1. Feed Workbench solver candidates directly into `AssessmentEvidence` rather than using page-local result types.
2. Add full-body mobility audit output as a first-class evidence producer, including interpolation, minimum curvature/radius verification, garage-door comfort margin, pavement containment, and reverse-outbound replay.
3. Add candidate promotion state to the existing Workbench UI and persist the evidence record when a candidate becomes AUDITED / PROMOTED.
4. Replace the existing public result card with the shared presentation model after the guided adapter passes regression QA.
5. Add public comparison of 2–3 promoted candidates using evidence deltas rather than independent summaries.
6. Add permanent Pondy Designs 1–4 regression fixtures, plus deliberately impossible and borderline lots.
7. Keep zoning/code/civil/structure/MEP/permit scope boundaries explicit in data, not only prose.

## Promotion rule

Public may simplify language, but it may not upgrade a technical state. A Workbench WATCH stays visible as a public watch/review item. A PROFESSIONAL_REVIEW state must never be rendered as PASS.
