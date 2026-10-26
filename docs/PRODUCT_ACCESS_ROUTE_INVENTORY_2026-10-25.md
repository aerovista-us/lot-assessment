# LotScope product access inventory — 2026-10-25

## Ownership and product boundary

- **LotScope**: public/free, existing `/` and guided assessment routes. Keep accessible to unauthenticated users.
- **LotScope Advanced**: paid, authenticated customer design and revision workflow. **Not yet deployed as a distinct route/entitlement system.** Introduce explicit customer capability and server-side entitlement only after account/plan authority is confirmed.
- **LotScope Workspace**: staff-only engineering and client-project administration. Currently served under `/workbench`, which also has customer-oriented design journey UI. Splitting the two requires route migration, capability tests, and preservation of local saved designs.
- **PondyFlats**: *one client and one lot* in its own repository. Do not publish arbitrary customer reports there. New customers need separate private repositories with project-specific authorization and artifacts.

## Observed authentication contract

`lib/aerovista/session.ts` checks a server-resolved AeroVista session and `lotscope.workbench.access`. The handoff also requires that capability. `app/workbench/layout.tsx` checks it before rendering the existing Workbench UI. The Identity Gateway `identity.can()` endpoint is already used to check `lotscope.workspace.write` in the generic capability-check API, but the static gateway source did **not** establish actual role/plan grants for that capability. Do **not** claim staff authorization tests have passed until live sessions for authorized and unauthorized principals have been verified.

## Internal project API inventory

All eleven currently active non-auth `/api/workbench` routes, including the Pondy solver/search, intervention POST, automation POST, pavement POST, evidence, registry, customer-report and candidate export endpoints, are proposed to require **both** the existing Workbench session grant and the internal `lotscope.workspace.write` capability. The explicit additional check is applied at route entry; the guard fails closed (401 no Workbench session; 403 capability denied; 503 identity check unavailable). These are existing Pondy-bound operations, not a general customer Advanced API.

The current paid customer design journey may call the Pondy report API through the Workbench UI, so **this policy migration will change behavior for users without staff access**. Therefore it must remain draft while a separate, paid-authenticated customer report route is designed and browser-tested against the same saved revision. Do not merge the security-only branch until callers are audited and a safe transition is ready.

## Acceptance matrix (live evidence still required)

| Principal | Public assessment | Advanced project | Internal Workspace APIs |
| --- | --- | --- | --- |
| Anonymous | Allowed | Denied | 401 |
| Signed in without paid access | Allowed | Denied | 403 if Workbench session, else 401 |
| Paid client, no staff role | Allowed | Own projects only | 403 |
| Internal staff with explicit Workspace grant | Allowed | Authorized projects | Allowed after project-level check |
| Founder with explicit Workspace grant | Allowed | Authorized projects | Allowed after project-level check |
| Revoked/expired session | Allowed | 401 | 401 |
| Identity service unavailable | Public remains independent | Deny | 503 on staff capability check |

## Next implementation gates

1. Confirm Identity Gateway's actual production capability grants, with sanitized evidence from one authorized staff and one paid/nonstaff account. No raw session or one-time codes in logs.
2. Audit every `/workbench` caller and design distinct `/advanced` customer endpoints (including authenticated report preview/download) before enabling staff-only enforcement in production.
3. Establish and test project ownership / resource-scoped checks (`lotscope_project`) for customer reads, writes, exports, and reports; avoid role-only access to other clients' IDs.
4. Carry a public assessment into the paid project as an immutable versioned input with parcel/source orientation, confidence/provenance, user intent, and validation hash. No automatic client repository publication from a browser-local draft.
5. Provision a **private** per-client repo through a separately authorized internal service, with unique project ID, least-privilege GitHub installation permissions, audit trail, idempotency, retention, and rollback; keep Pondy unchanged.
6. Test exact-head build, security route contract (`npm run test:workspace-route-security`), authorized and unauthorized browser/API requests, existing room-alternative Save → Reload → Report, and responsive layouts before changing deployed routing.
