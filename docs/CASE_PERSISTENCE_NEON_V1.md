# Case comparison persistence — implementation gate

## Authority and boundary
LotScope owns case documents. AVCC App Adapter / Identity Gateway authorizes the principal using the existing Workbench capability. The browser does not connect to Neon. Case rows are partitioned by the authenticated `identityId` and case ID. V1 does not expose cross-user collaboration or case sharing.

## Operations
- `GET /api/workbench/cases?id=HZ-001` returns the latest case for the authenticated owner, otherwise 404.
- `PUT /api/workbench/cases` accepts `{ "expectedRevision": 0, "project": { ... } }` for first create, then passes the last server revision for subsequent writes.
- A conflicting revision returns 409 rather than silently replacing another saved revision.
- Each successful insert/update is automatically recorded in the immutable revision table.
- The endpoint clears `acceptedAt`; evidence readiness does not constitute approval.
- Missing identity, capability or database configuration fails closed.

## Operational steps
1. Apply `db/migrations/001_case_comparison.sql` to the intended **Preview** Neon branch first, with a privileged migration role; capture the migration receipt. Never run DDL in a user request.
2. Verify the Vercel Neon integration only injects sensitive connection variables into the LotScope project; Preview must use its own branch.
3. Deploy preview and test: unauthenticated 401, unauthorized capability 401, create 200, reread 200, wrong owner 404, stale write 409, invalid evidence 422, revision history, missing DB 503.
4. Confirm production backups/restore procedures **before** applying migration to Production.
5. Apply the production migration separately with explicit approval and a rollback plan.
6. Case Compare has explicit Load cloud / Save cloud controls with conflict handling and local JSON export. Confirm authenticated end-to-end behavior against the migrated Preview database. Browser storage remains the default local draft until a cloud operation succeeds.
7. Verify end-to-end persistence across devices under a real authenticated founder account and test a non-founder role.

## Limits
This first API slice is **not** production-ready without a Neon Preview migration, authenticated API acceptance, and production recovery evidence. The application UI is wired but cloud persistence is not yet verified against Neon.

The case decision remains conditional while any required evidence is missing, an assumption or constraint remains unresolved, a risk remains open, or no working layout is saved. A case can be "evidence-ready" only for coordination; it is **not** construction approval. Server writes clear `acceptedAt`, and the local acceptance action is disabled pending an authorized revision-specific sign-off.

Imports require the exact `horizon.lotscope.case-package.v1` schema, pass the full case validator, and cannot silently overwrite malformed saved browser drafts. Imports retain the active case ID but reset cloud revision state; the next cloud save conflicts if that ID is already stored remotely.

This release intentionally does not implement explicit acceptance, cross-user collaboration, case deletion, or public intake. The case API is only for the authenticated owner; do not present other users' cases as shared.
