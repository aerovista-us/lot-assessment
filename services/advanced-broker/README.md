# Advanced NXCore revision broker — isolated implementation candidate

**NOT DEPLOYED. DO NOT EXPOSE PUBLICLY.** This folder contains the deterministic verifier and PostgreSQL query adapter for the planned NXCore persistence service. It deliberately does not start an HTTP listener or accept live customer requests until a trusted identity adapter, canonical geometry validator, restricted DB connection and hardened ingress are wired and acceptance-tested. This is not a substitute for authenticated browser Save → Reload → Report.

The request verifier requires: exact `lotscope_advanced` service identity; HMAC SHA-256 over method, path, timestamp and raw body; ±5 minute clock window; durable shared PostgreSQL replay claim on PUT; a live customer session resolver which independently checks paid entitlement and per-project read/edit capability; a mandatory shared geometry validator; and source-bound SQL storage.

**Important constraints:** Replay claims now use an atomic PostgreSQL insert-on-conflict ledger shared by broker instances. Maintain reliable retention/cleanup beyond the maximum accepted signature window, and test replay race behavior through the real API before exposure. Broker caller must be a trusted server; do not expose the signing secret to web clients. Do not trust a request's `identityId`, product checkout return, or locally claimed project ownership. Backing Postgres is NXCore-internal only; do not disable transport TLS for a public DB connection. Add rate limits and resource caps at ingress.

Before service activation: wire existing Identity Gateway session resolution (must verify active/non-revoked account) and exact `lotscope.advanced.access` and scoped project grant on every operation. Use the common LotScope `validateDesignDocument` implementation rather than a reduced substitute. Staff-only source provisioning must maintain authoritative parcel, orientation, constraints and metadata. Then test full API with real disposable PostgreSQL, concurrency, restore, cross-tenant denial, signed replay across processes, and exact source-bound report artifact.

Run `npm run test:advanced-broker-core` and `npm run test:advanced-broker-signature`. The existing migration was separately applied on disposable NXCore PostgreSQL on October 30, including duplicate revision and project foreign-key checks; the disposable database was dropped. Do not confuse these limited checks with a full live service integration test.

Pondy Flats remains one client repository. No shared customer report publication into Pondy.

## Live Identity Gateway connector

`identity-adapter.server.mjs` now creates the existing `@aerovista-us/app-adapter/server` client with the **separate** `lotscope_advanced` service identity and `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED`. `identity-authorizer.mjs` performs an uncached `auth.resolveSession` on every request, then checks global `lotscope.advanced.access` and the exact scoped `lotscope.project.read`/`edit` grant using the resolved identity ID. A revoked/invalid session or denied grant returns no identity; Gateway unavailability propagates a fail-closed 503 from the broker. No new authorization table was introduced.

The current runtime reports the Advanced Identity Gateway service secret **not provisioned**, so the tests exercise a fake authenticated Gateway interface, not a real paid customer session. Do not activate live broker requests until the separate IDGW client, credentials and project grants are provisioned and independently verified with actual authorized and unauthorized accounts. Existing founder Workbench credentials must not be reused.

## Durable replay improvement — October 30

The broker now **requires** a `store.claimReplay` operation rather than keeping a process-local cache. The PostgreSQL adapter creates the claim atomically using `INSERT ... ON CONFLICT DO NOTHING` against `lotscope_advanced_replay_claims`; the migration adds its primary key and expiry index. Replays return 409, store errors fail closed with 503. Node tests include two broker instances sharing a ledger and a failed database claim. The migration was applied and checked against disposable NXCore PostgreSQL (one claim inserted, duplicate ignored), then dropped. Future activation needs an audited expiry cleanup job and actual parallel network requests backed by PostgreSQL.
