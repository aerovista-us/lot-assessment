# LotScope Advanced: existing AeroVista infrastructure decision (2026-10-27)

## Verified infrastructure

- **Identity:** NXCore `identity-gateway` is healthy. AVCC already manages `lotscope.project.read`, `.edit`, `lotscope.workspace.write`, proof/admin grants, and exact-origin handoffs. ACOS PR #151 introduces a separate `lotscope_advanced` client and `lotscope.advanced.access`, leaving founder Workbench unchanged. The gateway's `IDGW_BROKER_SERVICE_ADDITIONS` supports a new client; its **separate** `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED` is not currently provisioned.
- **Billing:** AVCC already has Square account purchases, `access_products`, `user_entitlements`, idempotent webhook handling, paid/expired/refunded semantics, and signature verification. ACOS #151 bridges only active Square-confirmed entitlements whose product has `resource_type=lotscope_service, resource_id=advanced` into the Advanced capability check; project read/edit grants remain independent. Live Square configuration was `configured:false, environment:sandbox` during audit. Do not advertise functional checkout or grant entitlements from a browser redirect.
- **Database:** Existing `acos-agent-postgres` (PostgreSQL 16) is healthy on the same `gateway` Docker network as AVCC and Identity Gateway. A dedicated *disposable* `lotscope_acceptance_20261027` database was created there, had the PR #147 migration applied, and passed duplicate insertion, separate-project, latest-revision, and two simultaneous-writer uniqueness checks. It was dropped after testing; no persistent LotScope production DB was provisioned.
- **Database transport:** Existing PostgreSQL reports `ssl=off`. PR #147's direct database adapter requests SSL and cannot simply be pointed at that existing instance. Vercel must not be given an unaudited direct TCP connection to the internal database.
- **Private dependency:** App Adapter 0.4.0 is already available as source under ACOS. Building/packing an isolated copy and installing that artifact into the LotScope test checkout passed `npm run lint` and `npm run build` (source-compatible). Automated CI still needs authorized GitHub Packages read access or a reproducible same-commit built package artifact; no credentials were modified.

## Agreed integration direction

1. Reuse **the current PostgreSQL container on NXCore**, but with a separately provisioned LotScope database, role, least-privilege DB permissions, managed backups and documented recovery. Evaluate capacity/ownership before committing to this specific container as the permanent host.
2. Expose persistence through a **dedicated authenticated server-to-server broker** on the existing NXCore/Identity/AVCC infrastructure rather than direct public database access. Authenticate the calling service, resolve the principal live, check paid entitlement and exact `lotscope_project` resource grant, then use the private DB role. New routes must be reviewed, rate-limited, access-logged and tested for cross-tenant ID attacks.
3. Keep LotScope Advanced as a **separate relying party**, cookie and route set. It must never accept the founder-only `lotscope_workbench_session`. Provision its own broker secret and exact-origin acceptance before enabling sign-in.
4. Make server-stored revisions immutable and source-bound, with canonical parcel geometry loaded from the owning project. **Current draft PR #147 validates a client-submitted candidate against its client-submitted design document but does not yet verify the candidate against an immutable server-owned parcel source. Do not promote it until this is closed.**
5. Reuse AVCC's paid entitlement state for `lotscope.advanced.access`, requiring an active paid/valid entitlement *and* separate project grant. Prove Square sandbox paid, duplicate, expired, refunded and replay scenarios before activating sales.
6. Keep the current browser-local Save/Reload functional until explicit customer-authorized migration confirms server read-back. Provide clear on-device vs account-saved state and reject conflicts rather than silently overwriting.
7. Each new client's project/report repository is private and separate. **PondyFlats remains the one-lot/one-client reference project.** LotScope owns reusable design and report-generation engines only.

## Remaining release gates

- Secure, routable internal persistence broker and dedicated project DB/role with actual integration tests; initial SQL-only disposable test does not prove the Next.js API.
- Backend canonical project source validation and account-bound project listing/provisioning.
- Installed paid handoff client/secret, verified owned/nonowned grants and independent authenticated Advanced browser acceptance.
- Configured Square sandbox purchase product, authenticated checkout and refund/event acceptance, then production payment readiness.
- Customer UI local-to-account migration, fresh-device Save → Reload → exact SVG/corridor/door/report proof.
- Exact-head CI/GitHub Packages and deployment/rollback. All related PRs remain draft until their gates pass.

## Security follow-up: canonical project source gate (2026-10-27)

The persistence candidate now requires a *staff-provisioned server-side* `lotscope_advanced_projects` row. `storeAdvancedRevision` and `readAdvancedRevision` hash the source parcel and compare it with that authoritative project record. A client cannot create a canonical project through the public Advanced Save endpoint. The source comparison gate intentionally fails closed for unprovisioned projects. Until a governed project-provisioning process exists, this also means no ordinary new customer project can yet save to the proposed account-backed store.

The schema ran against an isolated disposable database on the existing NXCore PostgreSQL instance; this accepted canonical project registration and a revision referencing it. The test database was dropped afterward and PostgreSQL remained healthy. This is not yet a real authenticated API test or proof of cross-device persistence.

**Critical outstanding:** confirm stronger server ownership for additional fixed site attributes (survey, envelope/setbacks and other authoritative source constraints), secure project creation, and actual database-broker deployment. Do not bypass this gate for a working demo.
