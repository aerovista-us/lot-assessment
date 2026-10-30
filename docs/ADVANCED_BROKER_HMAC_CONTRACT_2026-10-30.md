# Advanced private broker request signing — 2026-10-30

This is a **client-side signing contract**, not a deployed persistence service. It adds no public endpoint and never contacts NXCore. The purpose is to reuse the existing AeroVista HMAC wire format consistently when implementing the trusted persistence broker in issue #151.

## Request contract

- Service name: `lotscope_advanced`, not the founder-only `lotscope_workbench`.
- Signed message: `METHOD + "\\n" + exactPath + "\\n" + ISO8601Timestamp + "\\n" + rawBody`.
- Signing algorithm: HMAC-SHA256; headers `X-AV-Service`, `X-AV-Timestamp`, `X-AV-Signature`.
- Paths restricted to versioned private Advanced broker project routes. Reject absolute URLs, encoded traversal and queries within the signed path; query params, if ever needed, must be separately specified in a versioned protocol.
- Signing secret must be server-only and distinct from Identity Gateway and AVCC internal service secrets. Do not log it or include it in browser bundles.

## Broker-side verification is mandatory

1. Reject missing/malformed/tampered signatures using constant-time comparison; reject requests outside ±5 minutes and enforce nonce or request-id replay protection for mutations. Timestamp alone is not enough against within-window replay.
2. Verify the **actual user session** through the trusted Identity Gateway, rather than accepting an unsigned `identityId` forwarded by the browser or assuming the HMAC service identity is the customer.
3. Recheck `lotscope.advanced.access` and scoped `lotscope.project.read`/`edit` on **every** project operation. Service authentication only authorizes the application, not the user's project access.
4. Load canonical project parcel/source metadata from a trusted, staff-provisioned store; never let a candidate submitted with a browser request establish its own source authority.
5. Use a dedicated database and least-privilege role on NXCore. Do not route external TCP directly to PostgreSQL. Bound request size, enforce timeouts, rate limiting, audit logs without secrets, immutable revisions, idempotency and 409 conflicts.
6. Test forged identity, cross-project ID, stale/revoked session, expired paid entitlement, signed replay, stale revision, private project report, and restart/restore against a disposable database.

## Progress and release gates

As of October 30, 2026 GitHub still shows LotScope main at `63e1dee9` and the Advanced stack (#146–#150) as draft. NXCore Desktop Commander reported offline, so **these changes are not claimed to have run on NXCore**. Continue with `npm run test:advanced-broker-signature`, TypeScript/build and exact-head CI once a test runner is available, then implement the matching broker verifier and disposable-database integration. No production promotion or credential changes are permitted until all customer-journey gates pass.

Pondy Flats remains a dedicated one-client, one-lot repository.
