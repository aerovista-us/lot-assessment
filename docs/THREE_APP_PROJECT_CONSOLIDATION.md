# LotScope product and project consolidation contract

Status: proposed / implementation pending. Date: 2026-11-13.

## Product taxonomy: exactly three applications
1. **LotScope** — customer guided site intake, feasibility, information confidence, secure submission.
2. **LotScope Advanced** — more detailed site/program/design analysis using the same shared engine and project IDs. This is a named application surface/product tier, not a new independent geometry authority. Its runtime/route requires a separately verified implementation decision.
3. **LotScope Workbench** — authenticated staff project/case comparison, refinement, evidence, validation, drawings and release preparation.

No first-class applications called PondyFlats, Ponte Flats, Pondy Flats or BStreet. Those labels are **projects**, not tools, app modules or app adapters. Existing repositories and Pages sites remain preserved as source/history or transitional client deliverables until parity and access checks are met; do not delete or publish them automatically.

## Canonical projects and source repositories
| Project display name | Canonical proposed project key | Source repository | Project nature |
| --- | --- | --- | --- |
| Pondy Flats — Lot 2 | `pondy-flats-lot-2` | `aerovista-us/PondyFlats` | design alternatives, site geometry, drawing packages and customer-report evidence |
| B Street — 1011 N B St | `b-street-1011` | `aerovista-us/bstreet` | property feasibility, frontage/owner decision strategy, research and owner-facing deliverables |

Project keys are **proposed** and must be reconciled with existing AVCC identity/project IDs before persisting; never create duplicate project identities. The spelling aliases PondyFlats / Pondy Flats / Ponte Flats should resolve to one project after owner confirmation, with source titles preserved.

## Single shared project data contract
Each record references `projectId`, `caseId`, `revision`, `sourceSystem`, `sourceRef`, `importVersion`, `contentHash`, `createdAt`, `createdBy`, `evidenceState`, `visibility`, and `provenance`. Distinguish immutable imported source artifacts from editable Workbench-derived revisions. Keep source IDs, units, coordinate frames, transform and handedness, source signatures, report manifests, customer consent and allowed audiences. Import is explicit, idempotent, versioned and reversible; never implicitly overwrite a saved layout.

Project record groupings:
- Intake/lot geometry, rules, assumptions, confidence and open checks.
- Programs, constraints, strategy templates, layout/candidate lineage and verification gates.
- Imported evidence, images, survey/reference files, source docs, case notes and report artifacts.
- Client-facing packages and controlled publication state.

## Import lanes (bounded)
- **Pondy Flats -> Workbench**: candidate/design package import, source-bound geometry and design documents, A-series sheet manifest, comparison alternatives, customer reports, source signatures and unresolved gates. Existing frozen Design 1/2/3 records and later intervention candidates must not be promoted to PASS merely by import.
- **B Street -> LotScope / Workbench**: parcel/intake facts, due-diligence and zoning assumptions, frontage/split hypotheses, source register, homeowner decision records and owner report/document kit. Unsupported survey/title/city/lender conclusions remain CONDITIONAL or WITHHELD.
- **Both -> Advanced**: advanced analysis may consume an existing project revision, but it may not invent physical validation or become a second canonical source.

## Customer deliverables
Each project has `Project > Reports > Customer-facing` separate from internal case notes. Generate project-specific report views from a shared evidence/provenance manifest; include version, date, source links, assumptions, findings, unknowns, pending professional checks, and explicit `CONCEPT ONLY — NOT FOR CONSTRUCTION` where relevant. Print/PDF and HTML must use the same reviewed content. Private drafts and browser-local files must not silently publish to public Pages.

Pondy Flats retains the 22-slot customer report standard, appropriate design-specific sheets, orientation and model-preview vs locked/verified distinctions. B Street retains the homeowner dashboard, strategies, playbooks, document kit and written professional gates. They share infrastructure, not identical presentation content.

## UI/registry cleanup
- Horizon app launcher and AVCC app registry: allow only the three applications above.
- Remove PondyFlats and BStreet *app* cards, app adapters and tool labels only after checking routes, grants, bookmarks and dependencies.
- Relocate links to `Projects > Pondy Flats` and `Projects > B Street`; include `Open in LotScope`, `Open in Advanced`, and `Open in Workbench` according to access/feature support.
- Replace "LotScope, PondyFlats, BStreet and the underlying design Workbench remain the source tools" with: "**LotScope, LotScope Advanced and LotScope Workbench are the three applications. Pondy Flats and B Street are projects whose source records, imports and customer reports are managed through those applications.**"

## Release gates
1. Inventory actual app registry, routes, grants, existing project IDs, repo/deploy links and client URLs.
2. Choose single canonical project IDs and ingestion/migration mapping; dry-run idempotent import.
3. Validate geometry and metadata mappings against existing project regression fixtures.
4. Validate access control and project/report audiences; protect owner data.
5. Validate HTML/print/PDF report parity and no publication side-effects.
6. Preserve original repositories and frozen deliverables; switch navigation with rollback.
7. Run authenticated staging E2E and only then approve production change.

Do not claim any app or project migration is completed based on this design contract.
