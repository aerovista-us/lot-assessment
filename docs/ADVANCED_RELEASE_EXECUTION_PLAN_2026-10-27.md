# LotScope Advanced — execution and release plan

**State: release gated, no production promotion.** Owner: LotScope/AVCC integration. Updated 2026-10-27.

## Product boundaries

- LotScope: free public property assessment.
- LotScope Advanced: paid customer login, own-project alternatives, saved revisions and generated reports.
- LotScope Workspace: authorized internal engineering, interventions, provisioning and review.
- Pondy Flats: one client, one lot, one dedicated repository — never a central destination for other client reports.

## Ordered delivery gates

### P0-A — identity and billing authority (ACOS PR #151)

1. Repair GitHub Actions billing/spending-limit restriction. Run 40471009138 was rejected by GitHub before jobs started; use fresh **exact-head** workflow runs after account correction.
2. Provision `lotscope_advanced` with a separate service secret, allowed broker identity, callback origin and own cookie. Confirm paid-client login, founder-only Workbench denial for clients, revoked/replayed sessions and unavailable Gateway fail-closed behavior. Never reuse the founder Workbench credential.
3. Reuse existing AVCC Square account-purchase entitlement workflow, prove sandbox paid/refund/expiration/duplicate events. The Square service was previously `configured:false`; keep checkout unavailable until evidence exists. A browser redirect cannot grant access.
4. Enforce an active `lotscope.advanced.access` entitlement **AND** a scoped `lotscope.project.read` or `.edit` grant per project. Negative tests include different customer and unowned candidate identifiers.

### P0-B — trusted project storage and source (LotScope PRs #146–#149 and successor)

1. Reuse NXCore PostgreSQL 16 only if capacity and backup ownership reviewed; create an isolated LotScope DB and least-privileged DB role. Existing PostgreSQL has TLS disabled, so do not expose it to hosted Vercel or relax the Next.js client's SSL settings.
2. Implement a private NXCore persistence broker with authenticated server-to-server requests and live Identity Gateway authorization. Its PostgreSQL credentials never leave NXCore. Rate-limit writes and cap payload sizes; no client-provided identity, project grant or proof may be trusted.
3. Staff-provision an immutable authoritative project source. Compare the candidate against canonical parcel, orientation and all locked source constraints, not only the document's self-declared source signature. The draft canonical parcel check is a partial gate, not a completed project registry.
4. Save append-only exact candidate/design-document revisions; idempotent duplicate PUT, HTTP 409 on conflicting revision, verified digest and a latest-revision read. Reject report generation unless it matches the **latest server-stored** revision. Preserve prior revision and original browser storage.
5. Test the real API against a disposable database: parallel saves, restart/fresh process, read-back, cross-tenant denial, canonical source mismatch, backed-up restoration and service outage. Keep all source and authority references on the server.

### P1-C — customer journey

1. Separate customer routes from staff-only engineering APIs before promoting #141/#142; customer reporting must use the paid project endpoints.
2. Add explicit, consented local-to-account save and restore with local-only vs account-saved state. Do not silently overwrite drafts or lose source provenance.
3. Authenticated exact-head browser run: login → own project → Generate → Compare → choose **non-top** option → Save → fresh authenticated browser/device → Reload → report. Compare project, candidate, revision, source orientation, room/door/circulation polygons and all IDs to 0.001 model-unit tolerance.
4. Test keyboard, mobile/tablet/desktop, UI error states and clear digital-only vs structural/code/AHJ approval disclaimers.
5. Per-client private repository and export provisioning follows its own access/rollback checks; Pondy unchanged.

### Release and rollback

Require green exact-head CI and review in ACOS and LotScope; verified deployment SHA, signed brokerage and entitlement denial, completed browser screenshots/network logs, non-top exact-report proof and safe rollback. Stage the changes first. Promote only if every P0 test and customer journey passes. Otherwise keep PRs draft and production unchanged. Never state digital acceptance is physical approval.

## State at this checkpoint

- LotScope main remained at `63e1dee9`; Advanced PRs #146, #147, #148, #149 were draft.
- This successor PR hardens POST reports to compare the requested revision with the latest **server-stored** candidate/document digest, and renders from the server-stored copy; adds regression protection.
- ACOS #151 introduced the separate relying party and a Square-confirmed entitlement bridge, with previously passed nine local authorization tests, but Actions billing prevented its hosted jobs starting.
- Running infrastructure must be separately verified at execution time; an online host alone is not evidence of a live authorized service or finished migration.
