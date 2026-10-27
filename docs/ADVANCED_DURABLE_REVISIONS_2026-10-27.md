# LotScope Advanced durable revisions — release contract

This branch is a **draft candidate**, not a production-ready save system. It is stacked on #146. It introduces a separately configured managed PostgreSQL backing store for immutable, client-project-scoped saved revisions. PondyFlats remains an independent single-client repository; no new client's files go into Pondy.

## API and authority

- `PUT /api/advanced/projects/{projectId}/revisions/{candidateId}` accepts `{candidate,document}` and requires a live Identity Gateway session, verified `lotscope.advanced.access`, and `lotscope.project.edit` **for that specific resource ID**. Validates candidate/document IDs, source signature, model geometry, revision number, and request size.
- `GET /api/advanced/projects/{projectId}/revisions/{candidateId}` requires paid access and `lotscope.project.read` scoped to the project. Returns only the latest verified revision.
- `GET /api/advanced/projects/{projectId}/report?candidateId=...` requires paid/project-read access. It renders from **server-stored** candidate and document, not a newly generated top layout or a browser-provided draft.
- `POST /api/advanced/projects/{projectId}/report` remains a preview of an explicit saved snapshot from #146. Production should prefer the saved server revision for a canonical report.

The store is append-only by `(project_id,candidate_id,revision)`. Duplicate identical saves are idempotent; conflicting bytes with an existing revision return HTTP 409. Source binding and payload digest are checked on retrieval. The browser's existing local-storage key is unchanged, and this branch **does not automatically synchronize it**.

## Operations and outstanding gates

1. Provision authorized managed PostgreSQL; independently review network access, backup/restore, retention, encrypted secret delivery and client isolation. Set `LOTSCOPE_ADVANCED_DATABASE_URL` **server-only**. Apply `migrations/20261027_advanced_revisions.sql` and verify permissions.
2. Register/verify `lotscope.advanced.access`, project read/edit grant semantics and a genuine Advanced sign-in that does *not* require the legacy Workbench grant. Confirm via real paid-owner, unpaid, nonowner, staff and revoked sessions.
3. Verify SQL migration and concurrent identical/conflicting writes against a **disposable database**, plus restore across process/device restarts. A source-contract test is not a DB transaction test.
4. Integrate controlled UI migration: explicitly copy/import a saved browser draft into the signed-in customer's account, confirm server read-back, and show which revision is on-device versus in the account. Do not silently overwrite older customer revisions or expose another customer's project.
5. Run exact saved non-top selection + 360-degree intervention + Save → Reload on fresh browser/device → Report SVG polygon/door/corridor identity + parcel orientation. Reject stale report and invalidate technical evidence after edits.
6. Run dependency-enabled Next.js lint/build, exact-head CI, negative API/security tests, Vercel preview browser QA and rollback. **Do not merge or deploy solely because source contract tests pass**.

## Known limitations

- `getWorkbenchSession()` currently resolves the existing Workbench-session cookie. An independent paid-login exchange and cookie must precede customer deployment; the new paid capability gate alone does not complete product separation.
- Server database and live grant provisioning remain unverified. The existing checkout cannot install `@aerovista-us/app-adapter` because GitHub Packages returned 401 without a usable package token. No credentials were changed.
- This revision store is limited to candidate and exact selected design document. Full project creation, listing, permissions lifecycle, checkpoints, migration feedback, billing and per-client repository creation remain later implementation work.
