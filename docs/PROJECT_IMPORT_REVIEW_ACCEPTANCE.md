# Project import review — implementation and operator acceptance

Status: implemented in draft PR #171; not deployed, not a persisted import system.

## Routes
- `GET /api/workbench/project-imports?projectId=pondy-lot2` or `b-street-1011`: authenticated, no-store preview of pinned manifest.
- `POST /api/workbench/project-imports`: authenticated manifest preflight and read-only source verification against the pinned Git commit using the GitHub Contents API; JSON body only, 128 KiB limit.
- Project page `/workbench/projects/pondy-lot2` and `/workbench/projects/b-street-1011`: **Verify source files** triggers the read-only POST and displays per-file statuses.
- The endpoint has no create/update/delete/publish behavior; a successful source-file check is not architectural or professional validation.

## Validation completed in isolated checkout
- `npm run test:project-imports` — passed including invalid manifests, source missing, unavailable, non-file, and refusal to auto-approve or publish.
- `npm run lint` — TypeScript passed.
- `npm run build` — Next.js build passed. Local build used a copied, already built AVCC `@aerovista-us/app-adapter@0.4.0` in the disposable test checkout because GitHub Packages authentication for npm install returned 401. The committed dependency remains unchanged.
- Build-generated modifications to `next-env.d.ts` and `tsconfig.json` in the isolated checkout were not committed.

## Not yet implemented / acceptance gates
1. Canonical AVCC project ID and identity binding: must not create duplicates or allow unauthorized cross-project access.
2. Source content hashing/copying into persistent versioned artifact storage; the API currently checks source **existence**, not independent authenticity/quality of its content.
3. Durable import transaction, idempotency database, source audit trail, revision lifecycle and rollback.
4. Separate reviewer approval, project-scoped customer permission, report manifest rendering and controlled release.
5. AVCC/Horizon app registry and navigation changes after cross-system dependency audit.
6. Authenticated staging browser test, Vercel preview checks and production acceptance.

Existing Pondy Flats and B Street GitHub Pages are transitional project-source deliverables, **not** newly authorized outputs. Keep customer/public visibility unchanged until explicit review. Neither project is a first-class application.

## Cross-system staging review submission (source complete; not activated)
- A button appears on both project pages **only** when the server is a Vercel preview and `LOTSCOPE_IMPORT_REVIEW_ENABLED=true`. Source preflight must succeed before the button becomes available.
- `POST /api/workbench/project-imports/submit-review` requires an authenticated Workbench session, same-origin request, JSON, allowlisted project, configured HTTPS gateway URL, and the workbench's IDGW HMAC secret. It forwards the session token with a bounded source manifest over signed service HMAC, rather than submitting an impersonable reviewer ID.
- Identity Gateway's staging-only broker resolves the session via AVCC and forwards canonical identity to an internal AVCC HMAC endpoint. AVCC revalidates active founder/admin authority and re-verifies the source files before creating review-only ledger rows in an explicitly migrated staging SQLite database.
- All three tiers fail closed when the feature is disabled. Source files and current customer deliverables are unchanged; there is no approval/release endpoint.
- LotScope source import tests, TypeScript and Next.js build passed on isolated checkout; Gateway 6 broker tests and AVCC 5 ledger/service tests passed on isolated checkout.
- **Not yet accepted**: actual cross-service authenticated staging call through deployed networking, configured secrets, readback against canonical project IDs, and staged migration backup/rollback. Do not merge/enable as production feature before these gates.
