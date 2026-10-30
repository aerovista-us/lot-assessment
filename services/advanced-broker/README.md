# Advanced NXCore revision broker — isolated implementation candidate

**NOT DEPLOYED. DO NOT EXPOSE PUBLICLY.** This folder contains the deterministic verifier and PostgreSQL query adapter for the planned NXCore persistence service. It deliberately does not start an HTTP listener or accept live customer requests until a trusted identity adapter, canonical geometry validator, restricted DB connection and hardened ingress are wired and acceptance-tested. This is not a substitute for authenticated browser Save → Reload → Report.

The request verifier requires: exact `lotscope_advanced` service identity; HMAC SHA-256 over method, path, timestamp and raw body; ±5 minute clock window; per-process request replay rejection on PUT; a live customer session resolver which independently checks paid entitlement and per-project read/edit capability; a mandatory shared geometry validator; and source-bound SQL storage.

**Important constraints:** The replay cache is memory-local, insufficient for a multi-instance deployment. Implement a durable/shared nonce ledger and fail-closed replay check prior to exposure. Broker caller must be a trusted server; do not expose the signing secret to web clients. Do not trust a request's `identityId`, product checkout return, or locally claimed project ownership. Backing Postgres is NXCore-internal only; do not disable transport TLS for a public DB connection. Add rate limits and resource caps at ingress.

Before service activation: wire existing Identity Gateway session resolution (must verify active/non-revoked account) and exact `lotscope.advanced.access` and scoped project grant on every operation. Use the common LotScope `validateDesignDocument` implementation rather than a reduced substitute. Staff-only source provisioning must maintain authoritative parcel, orientation, constraints and metadata. Then test full API with real disposable PostgreSQL, concurrency, restore, cross-tenant denial, signed replay across processes, and exact source-bound report artifact.

Run `npm run test:advanced-broker-core` and `npm run test:advanced-broker-signature`. The existing migration was separately applied on disposable NXCore PostgreSQL on October 30, including duplicate revision and project foreign-key checks; the disposable database was dropped. Do not confuse these limited checks with a full live service integration test.

Pondy Flats remains one client repository. No shared customer report publication into Pondy.
