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
6. Wire the Case Compare UI to load/save these endpoints with conflict handling and visible unsaved status; retain portable JSON export. Until then the UI remains browser-local.
7. Verify end-to-end persistence across devices under a real authenticated founder account and test a non-founder role.

## Limits
This first API slice is **not** production-ready without preview deployment, migration, authorization acceptance, and UI wiring. This route intentionally does not implement explicit acceptance, collaboration, deletion, or public intake.
