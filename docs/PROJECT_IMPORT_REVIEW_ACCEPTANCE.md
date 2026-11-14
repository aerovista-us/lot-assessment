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
