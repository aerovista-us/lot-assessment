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

## October 30 isolated HTTP acceptance

The new `http.mjs` listener is restricted to `127.0.0.1` or `::1` and enforces a 2 MB body cap before reaching the HMAC verifier. The private protocol uses **POST for authenticated read requests** and **PUT for immutable saves**; a GET body is not portable to standard fetch clients. This broker protocol is a server-to-server interface and is not publicly exposed.

`server.mjs` is a separate, **not deployed** NXCore launcher requiring a dedicated HMAC secret, a separate Identity Gateway secret and a private database URL. It wires the existing `validateDesignDocument` via `geometry-validator.ts`; no reduced geometry implementation is authorized for a deployed service. Port 18897 is only a proposed local default. The launcher deliberately does not include a public reverse proxy, persistent production config, or an AVCC billing override.

For acceptance only, `http-db.acceptance.mjs` uses a fake identity resolver and a reduced geometry stub, explicitly marked as test doubles. Against a disposable PostgreSQL database on the existing NXCore instance, it passed signed HTTP save/read, conflicting and idempotent revisions, canonical parcel mismatch, unauthorized project denial, duplicate replay after a broker restart, and concurrent writes. The disposable database was deleted. A separate manual role test applied `role-setup.sql` and proved a broker group role **could not insert into canonical projects**. A shared-validator smoke test imported the actual application validator and denied invalid geometry.

Remaining production gates: provision/verify the separate paid Identity Gateway relying party and actual grants; create dedicated database/role and backup/restore procedures (no permanent DB yet); add a private ingress proxy and service supervision; test the **real** App Adapter with signed live sessions; verify source orientation/survey/setbacks in addition to the parcel; implement canonical staff provisioning; run full real-identity HTTP+DB tests and exact report comparison; wire hosted Next.js server to broker before paid UI migration; collect exact-head CI. No rollout until all pass.

## Governed fixed-source locks (October 30)

`lotscope_advanced_projects.source_locked_components` is a staff-provisioned JSONB array of exact immutable components. NULL or empty locks **fail closed** even when the parcel matches; earlier project rows require governed migration before customer saves. Each locked `id` must appear **exactly once** in a candidate and must hash identically to the authoritative stored record. This supports immutable survey/setback/access/orientation facts while leaving unrelated customer-editable design choices open. The broker database role has no INSERT/UPDATE/DELETE on the canonical project table. The disposable HTTP/PostgreSQL acceptance test now locks both the parcel and an east-boundary setback, rejects changed parcel and changed setback, and rechecks the restored revision. These generic locks are not a substitute for a completed survey/building-code validator or AHJ review.

For any previously provisioned project, new field NULL deliberately blocks saves until source locks are reviewed and provisioned. The migration adds the column idempotently without automatically granting authority to previous client-supplied geometry.

## Identity Gateway cross-component wire acceptance (2026-10-30)

Run on NXCore: `node --test services/advanced-broker/identity-wire.acceptance.mjs`. It imports the **actual** ACOS Gateway `serviceAuth.js` middleware and the installed, built 0.4.0 AeroVista App Adapter. It signs the outbound calls using the existing App Adapter and has the original Gateway HMAC and `requireServiceIn` middleware verify them. It tests exact project scope, denial for revoked sessions, unpaid access, wrong project, missing broker registration and incorrect service secret. It **does not** create any live production secrets, alter the running gateway container, or invoke real AVCC customer accounts: downstream `/v1/session/resolve` and `/v1/authorization/check` responses are controlled fixtures. This acceptance script is intentionally NXCore-only and relies on the existing ACOS source checkout; it is not part of portable CI.

Current live Gateway inspection still reports `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED` and the `lotscope_advanced` broker addition as missing. Actual customer acceptance remains blocked until both are securely provisioned, AVCC #151 is accepted, and real paid/unpaid/project access cases run end-to-end. The work does not grant a user access merely because a signed service request was accepted.

## Isolated real HTTP Identity Gateway staging — October 30

New scripts `mock-avcc.stage.mjs` and `staging-docker.acceptance.mjs` exercise the existing packaged Gateway app as an *ephemeral, separate Docker container* on an `--internal` network, with distinct temporary credentials and a mock AVCC backend. App Adapter sends authentic HMAC-signed HTTP requests through the real Gateway session-resolution and authorization-check routes. The staging mock checks Gateway-to-AVCC HMAC separately. Acceptance covered allowed owner, revoked session, wrong project and wrong service credential. The two test containers and temporary network were removed after success; running production Gateway was not changed or restarted. This proves real HTTP/service-auth composition, **not live AVCC customer identity or paid Square entitlement state**. The staging test does not provide a production registration or grant.

Live Gateway still requires independently provisioned Advanced relying-party registration (`IDGW_BROKER_SERVICE_ADDITIONS`) and `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED`; this test deliberately used ephemeral staging-only values. Do not copy test secrets to deployment, publish the private staging port, or turn customer sales on until real authenticated account and payment acceptance are proven.

## Revision sequence correctness — October 30

The PostgreSQL adapter now takes a transactional `FOR UPDATE` lock on the **staff-provisioned project row** before reading its latest candidate revision. Only revision 1 or `latest + 1` may be inserted; exact latest revision retries with an identical payload return unchanged, differing payloads or gaps/stale revisions return a conflict. This serializes concurrent writers across broker instances using the same private PostgreSQL database. The latest persisted revision remains the report source; a customer cannot jump to revision 99 or rewind stale state. The project-wide lock intentionally trades some write concurrency for simpler correctness. The disposable HTTP/PostgreSQL acceptance now tests initial revision skip, concurrent same-revision writes, post-restart continuity, skips after revision 2, and stale revision denial. No production DB was modified.


## Release readiness preflight

`readiness.mjs` is a side-effect-free, fail-closed configuration check. `server.mjs` refuses to listen if its two independent credentials are absent or reused, the allowed Gateway origin is unsafe, private PostgreSQL and dedicated role declarations are missing, or the operator has not explicitly confirmed Gateway registration and canonical-source provisioning. Flags `LOTSCOPE_ADVANCED_GATEWAY_REGISTERED=true`, `LOTSCOPE_ADVANCED_DATABASE_ROLE=lotscope_advanced_broker`, and `LOTSCOPE_ADVANCED_CANONICAL_SOURCE_PROVISIONED=true` must only be set after independently checking real registration, role grants and project locks. These flags are **not** themselves proof of entitlement, nor do they create a role or project. No automatic secret generation or Gateway production restart is attempted. `npm run test:advanced-broker-core` runs the new preflight tests.

## Controlled NXCore Identity Gateway relying-party provisioning (October 30)

**Status: NOT PROVISIONED.** The current production Gateway is Docker Compose-managed: deployment definition `/srv/ACOS/_deploy_runtime/identity-gateway-rate-budget/active/docker-compose.yml`; protected environment `/etc/acos-secrets/identity-gateway.env` (mode 0640, owner root, group glyph). The running Gateway is healthy but does not contain `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED` and does not include `lotscope_advanced` in `IDGW_BROKER_SERVICE_ADDITIONS`. These details are host-specific and not stored with credentials in this repository.

Read-only check (prints only missing setting identifiers, never values):

`node services/advanced-broker/deployment-preflight.mjs /srv/ACOS/_deploy_runtime/identity-gateway-rate-budget/active/docker-compose.yml /etc/acos-secrets/identity-gateway.env`

Controlled activation checklist for an authorized NXCore operator, **after GitHub billing/CI is restored**:

1. Capture a **protected, access-restricted backup** of the current deployment Compose file and secrets file, preserving ownership/mode and recording the current container image digest; never send credential values to chat, logs or Git.
2. Generate a new independent random Advanced service secret using an approved secret generator. Do **not** reuse Workbench/preview/other app secrets. Add the credential only to the protected environment (`IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED`) and append `lotscope_advanced` to the existing comma-separated `IDGW_BROKER_SERVICE_ADDITIONS` without replacing existing entries.
3. Add the Compose environment mapping `IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED: "${IDGW_SERVICE_SECRET_LOTSCOPE_ADVANCED:-}"` in the existing identity-gateway service environment section. Preserve all other service mappings and Docker networks.
4. Validate the effective Compose configuration using the same external secret file without printing the rendered environment. Review a **redacted, key-only** diff. Schedule controlled Gateway recreation only with a tested rollback to the prior environment and Compose file.
5. After recreation, confirm readiness and authenticate a **dedicated staging customer** against actual AVCC session resolution, current Square-confirmed entitlement (paid, pending, refunded, expired), and scoped project read/edit grants. Denial in each negative case is a release gate.
6. Provision a separate least-privilege PostgreSQL role and staff-locked source project. Activate loopback-only broker only after readiness succeeds and ensure the live report matches exactly the persisted selected revision. Keep production commerce/public access disabled until all checks and exact-head CI pass.

The preflight's `ADVANCED_RUNTIME_REGISTERED` / `ADVANCED_RUNTIME_SECRET_PRESENT` flags represent independently confirmed runtime facts and must not be set just to force a green result. This check is deliberately insufficient to authorize publication or payment capture.

**CI blocker:** ACOS GitHub Actions runs 41120280128 and 41122672940 were prevented from starting by GitHub account billing/spending limits, as explicitly reported in GitHub annotations. An organization billing administrator must resolve that through GitHub Billing & plans and rerun exact-head CI. Local ACOS validation on corrected draft head before this run: 62 files / 573 tests PASS. Never infer CI pass from that local result.
