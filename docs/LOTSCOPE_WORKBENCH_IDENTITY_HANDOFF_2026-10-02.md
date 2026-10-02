# LotScope Workbench + AeroVista Identity / App Adapter
## Comprehensive Handoff and Continuation Plan

**Date:** 2026-10-02
**Primary repository:** `aerovista-us/lot-assessment`
**Current LotScope main:** `56e77ea69fac1c952f48b283e731d45ad8ff5d8a`
**Current ACOS main after execution update:** `a82a020eee77f97679aa24775ce647d7b7556118`
**Status:** Workbench edit → screen → authoritative-proof loop accepted on source/CI. Identity/App-Adapter integration and authenticated shared persistence are the next major platform milestones.

---

# Execution update — 2026-10-02

The recommended identity path has begun and the following items are now complete in source:

- ACOS PR #70 registered `lotscope_workbench` as a founder-only relying application at `https://lotscope.aerovista.us`, added it to the Identity Gateway broker, added Connected Apps metadata, defined the six planned `lotscope.*` capabilities, and added the founder canary provisioning tool.
- ACOS PR #72 merged as `a82a020eee77f97679aa24775ce647d7b7556118` and fixes the runtime boundary by projecting `IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH` into the Identity Gateway container.
- App Adapter is now `@aerovista-us/app-adapter@0.4.0`; tag `app-adapter-v0.4.0` published successfully.
- LotScope PR #47 implements the founder identity canary: Account login/callback, server-side handoff exchange, Secure/HttpOnly app-session cookie, live session resolution, live `lotscope.workbench.access`, Workbench/API guards, logout/revoke, and public-assessment regression protection.
- Local LotScope acceptance is green against the actual v0.4.0 package bits: TypeScript, canonical/workspace/intervention/circulation tests, production build, and anonymous public/private boundary smoke.

Open operational gates:

1. `lot-assessment` is public and the private GitHub Package must not be exposed to fork workflows. PR #47 therefore expects a dedicated repository Actions secret `AEROVISTA_PACKAGES_TOKEN` with minimum package-read access rather than granting the public repo's `GITHUB_TOKEN` direct package access.
2. Production Identity Gateway still lacks the LotScope broker secret and still runs an older deployment lineage. Provision the same strong `IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH` on the Gateway and LotScope server sides, then use the guarded ACOS promotion/deploy scripts at `a82a020eee77f97679aa24775ce647d7b7556118`.
3. After AVCC promotion, run `backend/tools/provision-lotscope-workbench-canary.mjs` against the canonical production AVCC database.
4. The available Vercel connector currently exposes no AeroVista team/project, so LotScope production secret/deployment cannot be completed from this session.
5. Shared workspace persistence remains intentionally blocked until the founder round trip is accepted.

---

# 1. Purpose of this handoff

This document is the continuation authority for the current LotScope Workbench build after the Intervention Editor, geometry-integrity, canonical-geometry, and authoritative-circulation work completed through PR #45.

It is intended to let a new engineering session continue without reopening settled architecture questions or accidentally restoring weaker evidence semantics.

The next objective is to connect the private Workbench to the shared AeroVista Account / Identity / App Adapter platform, then move browser-local candidate state into authenticated shared persistence without weakening LotScope's geometry/evidence boundaries.

Required sequence:

```text
current Workbench
    ↓
AeroVista Identity / App Adapter
    ↓
founder canary authentication
    ↓
capability-gated Workbench
    ↓
authenticated shared workspace persistence
    ↓
trusted server-side evidence promotion
    ↓
staff / collaborator rollout
```

The public LotScope assessment surface remains separate and should remain usable without an AeroVista login.

---

# 2. Project boundaries

These boundaries remain mandatory.

## PondyFlats
The real development project for Pondy Flats Lot 2. It is a customer/use case of LotScope Workbench. Pondy design decisions, construction assumptions, professional review, and AHJ acceptance remain in the PondyFlats project.

## BStreet
The 1011 N B St client/property project. It is a separate customer/use case of LotScope Workbench and must not be merged into Pondy records, evidence, billing, or reports.

## LotScope
The public-facing assessment product at `lotscope.aerovista.us`. It may expose capabilities already proven in Workbench, but public product behavior must not become the source of truth for Workbench evidence.

## LotScope Workbench
The private professional analysis/design environment. It owns candidate manipulation, intervention workflows, geometry screening, canonical candidate state, solver/evidence integration, and professional workflow tooling.

Canonical relationship:

```text
PondyFlats ≠ BStreet ≠ LotScope public ≠ LotScope Workbench
```

---

# 3. Current release state

There are no open LotScope pull requests at this handoff checkpoint.

Current `main`:

```text
56e77ea69fac1c952f48b283e731d45ad8ff5d8a
Workbench: connect Intervention Editor to authoritative proof (#45)
```

Recent accepted sequence:

| PR | Purpose | Merge commit |
|---|---|---|
| #38 | Intervention Editor v3 shape controls | `2769440b7683791cbdc5109488400abafcfb9131` |
| #39 | Selection-aware right-click context menu | `9a1d5f4ceea50300eded2cdcd90c81788e40704a` |
| #40 | Fix context menu sizing / screen-space overlay | `fba2937f7d7ae580213235b6863439ed2fd98209` |
| #41 | Geometry-integrity hardening | `d35fc98397cc161c0247787cf4e3a1eb9738fbe8` |
| #42 | Undo/Redo, zoom, snapping and editor UX | `8223c1c42ed9efbbc96e64d8d73f692844ed0221` |
| #43 | Stable footprint identity + canonical geometry v2 | `7f7bfe65871ec7ea95bfa5430e2283ed542189be` |
| #44 | Reusable authoritative circulation engine v2 | `7a81ea87088bae082ae4e0cb6874e323b5b82204` |
| #45 | Intervention Editor → authoritative proof worker | `56e77ea69fac1c952f48b283e731d45ad8ff5d8a` |

Old Pondy-specific circulation PR #37 was closed as **superseded without merge** after #44 was accepted.

---

# 4. Workbench capability state

## 4.1 Intervention editing

The Workbench now supports:

- move homes and garages;
- rotate buildings;
- mirror homes;
- numeric dimensions and coordinates;
- direct wall resizing;
- direct corner dragging;
- add deflection point;
- remove eligible added point;
- route/control-point editing;
- pavement editing;
- right-click contextual shortcuts;
- Undo / Redo;
- zoom/pan and fit behavior;
- snapping;
- recovery checkpoints.

The context menu is rendered as normal HTML screen-space UI rather than SVG/parcel-coordinate content.

## 4.2 Geometry integrity

Shared validation is now applied across intervention operations rather than allowing different editor paths to use incompatible validity rules.

Stable vertex and wall identities were introduced so later insert/remove operations do not make array position the only referent for authored geometry.

## 4.3 Canonical intervention geometry

Canonical intervention geometry v2 now exists separately from the original frozen-candidate contract.

Important rule:

> The existing frozen-finalist contract was not replaced. Intervention geometry received an additional canonical layer.

This gives the editor stable geometry identity and a deterministic geometry revision suitable for:

- stale-evidence detection;
- save/reload verification;
- future shared persistence;
- proof association;
- collaboration conflict detection.

## 4.4 Authoritative circulation engine v2

PR #44 replaced the Pondy-specific proof prototype with a reusable candidate-driven circulation engine.

Current engine properties:

- independent inbound search;
- independent outbound search;
- exact modeled stall poses;
- parked companion vehicle retained during the relevant proof;
- explicit street portal;
- finite garage-wall and opening geometry;
- validated terminal connector;
- forward-out or reverse-out terminal acceptance when physically valid;
- hardened densified motion audit;
- pavement polygons treated as a geometric union;
- hard geometry separated from optional comfort policy;
- candidate-specific stall filtering for diagnostics and interactive workflows.

The engine regression suite explicitly rejects the historical invalid endpoint shortcut described below.

## 4.5 Intervention → authoritative proof loop

PR #45 connected the editor to the authoritative engine using a browser Web Worker.

Current user workflow:

```text
Edit geometry
    ↓
Save/checkpoint
    ↓
Evaluate exact edit
    ↓
fast local/static screening
    ↓
Run authoritative proof
    ↓
stall-by-stall continuous-motion search
```

The worker:

- runs off the UI thread;
- can be cancelled;
- reports stall-by-stall progress;
- reports inbound / outbound / full-circulation state;
- labels proof as `HARD PASS`, `OPEN`, or `STALE`;
- treats exhausted search as **not proven**, not impossible;
- ties proof freshness to canonical geometry rather than a generic timestamp.

---

# 5. Important evidence correction: Pondy Design 4 historical inbound proof

The historical Pondy D4 inbound planner was reproduced against the accepted old source.

It did prove that search could reach collision-free states near the modeled stalls.

It did **not** prove continuous physical motion into the exact final stall poses.

The old search accepted a route when it came within approximately 2.25 ft of the target and then appended the exact parked pose without validating the final connecting vehicle motion.

Reproduced B-South example:

```text
penultimate:
x = 22.619
y = 21.803
heading = west

exact stall:
x = 22.25
y = 21.5
heading = west
```

That final transition requires lateral displacement while keeping the same heading and is not a realizable straight or constant-curvature vehicle movement.

Therefore:

- the old 4/4 result remains useful historical near-route evidence;
- it must not be presented as modern continuous-motion proof;
- current D4 is **not declared impossible**;
- exact full-circulation status remains open until the corrected engine closes the routes.

This correction must not be undone merely to restore the previous PASS label.

---

# 6. Evidence and truth boundaries that must remain

## Modeled
The Workbench has a deterministic model or authored geometry for the item.

## Screened
Fast geometry/static/path-hint checks ran on the exact edit.

## Authoritatively proven
The authoritative circulation/evidence engine completed the applicable proof under the recorded engine/rules contract.

## Professionally reviewed / approved
Survey, zoning, code, fire separation, drainage, structural, civil, MEP, title/easement, energy, permit and other external professional/AHJ questions have been accepted by the applicable authority.

A machine PASS does not promote a project to professional approval.

A visually convincing plan does not promote an edit to machine PASS.

An exhausted search does not prove physical impossibility.

---

# 7. Current persistence state

Candidate Workspace is still browser-local.

Current implementation:

```text
components/workbench/useCandidateWorkspace.ts
STORAGE_KEY = lotscope:pondy-lot2:candidate-workspace:v1
```

The workspace persists through `window.localStorage`.

It currently stores/merges:

- local candidate revisions;
- checkpoints;
- imported candidate packages;
- branch relationships;
- restore state.

Limitations:

- tied to one browser/profile;
- no canonical authenticated owner;
- no cross-device continuity;
- no multi-user collaboration;
- no durable server audit;
- browser clear/reset can remove drafts;
- no optimistic concurrency/revision conflict protection;
- no server-verifiable authorship.

This is the primary reason Identity/App-Adapter integration is now the next architectural step.

---

# 8. AeroVista Identity / App Adapter current state

## 8.1 Current ACOS baseline

Current ACOS `main`:

```text
bffb2dda7e73c81b9d14b9380748a98a5f646f6e
docs(account): establish Account Session Security SOT
```

Important recent identity milestones are no longer pending:

- PR #49 stale app-return/session-integrity hardening: **merged** 2026-09-26;
- Profile Contract v1: merged;
- canonical self-profile operations: merged;
- Account Profile / Setup: merged;
- safe Account app-return/handoff: merged;
- founder Identity/Rack canary controls: merged;
- Connected Apps portal: merged and deployed;
- Identity Gateway dependency hardening: merged and production accepted;
- AVCC backend production dependency issues: resolved;
- founder Rack Account → handoff → native AVCC session → protected read → scoped revoke round trip: accepted in production.

## 8.2 App Adapter baseline

Package:

```text
@aerovista-us/app-adapter
version 0.4.0
Node >=20
```

v0.4.0 is published through the successful `app-adapter-v0.4.0` release workflow and provides the required surface for LotScope.

Browser:
- `auth.buildLoginUrl()`
- `auth.beginLogin()`
- `auth.buildRegistrationUrl()`
- `auth.beginRegistration()`
- `auth.parseCallback()`
- `auth.completeLogin()`
- `auth.session()`
- `auth.logout()`
- `identity.me()`
- `identity.can()`

Server:
- `auth.exchangeHandoff()`
- `auth.resolveSession()`
- `auth.revokeSession()`
- `identity.describe()`
- `identity.can()`
- `services.call()`
- `services.health()`

Architecture rule:

> `identity.describe()` selects experience.
> `identity.can()` authorizes protected actions.

Role/display context must not be used as authorization.

## 8.3 Account / Identity production status

Portal v1 Slices A-C are production accepted.

Account currently provides:

- profile;
- Connected Apps;
- Access;
- Security summary;
- Membership;
- governed app handoff;
- read-only role/grant/relationship context.

### Account Session Security v1

Account Session Security v1 is:

- merged;
- source accepted;
- CI accepted;
- canonical in ACOS SOT;
- **not yet promoted to production**.

It adds:

- active-session inventory;
- relying-app session labels;
- self-service revoke of other owned sessions;
- atomic revoke + durable security audit.

This is not required to begin a founder-only LotScope canary, but it should be production-promoted before wider staff/collaborator rollout.

---

# 9. Recommended identity boundary for LotScope

Register Workbench, not the public assessment, as the relying app.

Recommended relying-app id:

```text
lotscope_workbench
```

Recommended display name:

```text
LotScope Workbench
```

Recommended production origin:

```text
https://lotscope.aerovista.us
```

Reasoning:

- public assessment remains anonymous;
- professional Workbench receives an explicit trust boundary;
- Account Connected Apps can show “LotScope Workbench”;
- future public-account features can be added deliberately rather than inheriting Workbench authority.

---

# 10. Proposed protected/public route matrix

Remain public:

```text
/
/assessment/**
/api/assessment/**
/proven-patterns
public marketing/help assets
```

Require Workbench authentication:

```text
/workbench/**
/api/workbench/**
```

Authentication plumbing may be exposed at bounded routes such as:

```text
/api/workbench/auth/login
/api/workbench/auth/callback
/api/workbench/auth/logout
/api/workbench/session
```

No current public assessment endpoint should gain a service HMAC secret or direct AVCC internal access.

---

# 11. Recommended capability model

Do not authorize by checking:

```text
avccRole === "founder"
```

Use live capabilities.

Recommended initial capabilities:

```text
lotscope.workbench.access
lotscope.project.read
lotscope.project.edit
lotscope.workspace.write
lotscope.proof.run
lotscope.project.admin
```

Recommended resource model:

```text
resourceType = "lotscope_project"
resourceId   = "pondy-lot2"
```

Later examples:

```text
resourceId = "bstreet-1011-n-b"
resourceId = <customer/project id>
```

Founder inheritance may cause `identity.can()` to allow the action, but the Workbench itself should not hard-code founder bypass logic.

First canary contract:

```text
login
→ describe
→ can(lotscope.workbench.access)
→ protected Workbench page
→ can(project.edit) before mutation
→ logout/revoke
→ fail closed
```

---

# 12. App Adapter integration architecture

Recommended layout:

```text
lib/aerovista/
    app-adapter.server.ts
    auth.server.ts
    capabilities.ts
    session.ts

app/api/workbench/auth/login/route.ts
app/api/workbench/auth/callback/route.ts
app/api/workbench/auth/logout/route.ts
app/api/workbench/session/route.ts

app/workbench/layout.tsx
```

## Server adapter

Server-only code creates an adapter for:

```text
appId = lotscope_workbench
secret = IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH
```

The secret must exist only in the server/Vercel secret environment.

Never use a `NEXT_PUBLIC_*` variable for it.

## Browser adapter

Browser code may create:

```text
appId = lotscope_workbench
appOrigin = https://lotscope.aerovista.us
```

Browser code receives no HMAC/service credential.

## App session

The callback exchanges the Account one-time handoff **server side**.

The returned native AVCC session token must remain server/HttpOnly-cookie scoped.

Recommended cookie characteristics:

```text
HttpOnly
Secure
SameSite=Lax
bounded lifetime consistent with AVCC session
no raw token exposed to client JavaScript
```

The browser gets only a safe identity/session projection.

## Workbench request guard

Create one reusable server guard such as:

```text
requireWorkbenchSession()
requireCapability(capability, resource)
```

Every protected mutation route must use the live session plus `identity.can()`.

A page-level route guard improves UX but is not sufficient authorization by itself.

---

# 13. ACOS-side onboarding work

Use canonical `docs/APP_ONBOARDING_RECIPE.md`.

LotScope integration is **Lane A — App Adapter / broker**.

Initial Workbench does not need the Connector Kit merely to authenticate users or save LotScope-owned project data.

Required ACOS changes:

1. register handoff client `lotscope_workbench`;
2. register exact HTTPS return origin;
3. provision `IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH` on both Identity Gateway and LotScope server environment;
4. add `lotscope_workbench` to `HANDOFF_BROKER_SERVICES`;
5. configure user-safe Connected Apps display metadata;
6. create/approve initial LotScope capabilities/grants;
7. run Gateway/App Adapter/AVCC CI;
8. merge ACOS changes;
9. explicitly deploy Identity Gateway/AVCC changes through guarded production lane;
10. run machine smoke before interactive acceptance.

A configured secret without broker allowlist admission is blocked and must not be called “registered and working.”

---

# 14. App Adapter package distribution gate

LotScope is a separate repository, so a monorepo-only `file:` dependency is not a production solution.

Before implementation, verify that `@aerovista-us/app-adapter@0.3.0` is available from the intended private GitHub Packages registry.

If not yet published, make the real LotScope consumer the release trigger:

```text
tag/release app-adapter-v0.3.0
→ publish private package
→ pin exact version in lot-assessment
```

Do not copy adapter source into LotScope.

Do not create a LotScope-specific authentication client if package publication is the only missing piece.

---

# 15. Founder canary acceptance

First Workbench identity rollout should be founder-only.

Acceptance:

```text
LotScope Workbench
→ Login with AeroVista
→ Account
→ existing Account authentication / setup
→ one-time handoff
→ LotScope server exchanges code
→ native AVCC app session
→ identity.describe()
→ identity.can(lotscope.workbench.access)
→ Workbench renders
→ project read
→ project edit capability check
→ save bounded test edit
→ logout/revoke app session
→ protected route fails closed
```

Required evidence:

- app session scoped to LotScope Workbench;
- no raw AVCC token exposed to browser JS;
- invalid/bogus handoff reaches broker and fails as `code_not_found`, not service unauthorized;
- replayed handoff cannot be reused;
- wrong audience/origin fails;
- revoked session immediately loses protected access;
- capability denial blocks protected action;
- Account session remains independent from LotScope app-session logout.

---

# 16. Shared persistence architecture

After founder identity canary is accepted, move Candidate Workspace from browser authority to a LotScope-owned server store.

## Authority rule

AeroVista Identity answers:

```text
who is this?
may they perform this action?
```

LotScope remains authoritative for:

```text
candidate geometry
workspace state
checkpoints
project revisions
proof records
LotScope-specific collaboration metadata
```

Do not store Workbench candidate truth in AVCC Identity tables.

## Recommended storage

Use a durable PostgreSQL-compatible store behind authenticated Next server routes.

Required properties:

- durable server storage;
- transactions;
- unique revision IDs;
- JSON/JSONB candidate payload support;
- indexes by project/candidate/identity;
- optimistic-concurrency support;
- backups/export.

Do not use Vercel ephemeral filesystem or browser `localStorage` as shared authority.

## Suggested v1 tables

### `lotscope_workspaces`

```text
id
project_id
label
created_by_identity_id
created_at
updated_at
current_revision_id
```

### `lotscope_candidate_revisions`

```text
id
workspace_id
candidate_id
parent_revision_id
revision_label
canonical_geometry_revision
candidate_payload_json
evidence_state
created_by_identity_id
created_at
```

### `lotscope_checkpoints`

```text
id
workspace_id
candidate_id
candidate_revision_id
label
snapshot_json
created_by_identity_id
created_at
```

### `lotscope_proof_runs`

```text
id
workspace_id
candidate_revision_id
geometry_revision
engine_schema
engine_version
rules_version
execution_trust
status
result_json
created_by_identity_id
created_at
```

Optional later: `lotscope_workspace_members`.

Do not make local membership records a substitute for live AVCC capability checks.

---

# 17. Local-first migration behavior

Do not abruptly delete the current browser workspace.

Recommended migration:

1. authenticated user opens Workbench;
2. server workspace is fetched;
3. current local workspace is inspected;
4. if local-only drafts exist:
   - show `Import local drafts to my Workbench`;
   - preserve existing IDs/lineage where safe;
   - create a server revision;
   - retain one local recovery copy until server write is confirmed;
5. after accepted server persistence:
   - `localStorage` becomes recovery/cache only;
   - server state becomes authoritative.

---

# 18. Concurrency and save contract

Shared persistence requires revision-aware writes.

Recommended write request:

```text
workspaceId
candidateId
baseRevisionId
candidatePayload
canonicalGeometryRevision
```

Server behavior:

```text
if baseRevisionId == currentRevisionId:
    accept
    create immutable next revision
else:
    return 409 revision_conflict
```

The client must not silently overwrite another staff member's newer revision.

Initial conflict UX:

```text
Reload current
Save mine as branch
Compare revisions
```

Do not implement real-time collaborative geometry editing in v1.

---

# 19. Critical proof-trust issue after shared persistence

The current authoritative circulation engine runs in a **browser Web Worker**.

That is excellent for responsive interactive analysis, but a browser is controlled by the user.

Therefore:

> A browser-produced proof result must not become the tamper-resistant shared evidence authority merely because it is uploaded to the database.

For persistence, record browser proof with:

```text
execution_trust = client_interactive
```

It may be used for immediate feedback and design iteration.

It must not automatically become:

```text
verified_server
promotion evidence
release evidence
```

---

# 20. Trusted proof promotion

Add a second proof lane after persistence.

Interactive lane:

```text
Browser Web Worker
fast feedback
client_interactive
```

Trusted verification lane:

```text
canonical saved candidate
→ trusted solver runtime
→ same authoritative engine version
→ result associated with exact geometry revision
→ verified_server
```

The trusted runtime may eventually be:

- a bounded server worker;
- an NXCore LotScope solver service;
- another authenticated AeroVista compute service.

Do not move heavy proof into a normal short Vercel request unless runtime measurements show the exact production workload fits safely.

Trusted result should record:

```text
candidate revision
canonical geometry revision
engine schema/version
rules version
source commit
execution environment
timestamp
result digest
```

This is the evidence that may later drive promotion/release decisions.

---

# 21. Account Session Security dependency

Before wider staff rollout, intentionally promote ACOS Account Session Security v1 using:

```text
docs/ACCOUNT_SESSION_SECURITY_OPERATIONS.md
```

Affected ACOS production services:

1. command-center;
2. Identity Gateway;
3. Account UI.

After promotion, acceptance should prove that a real LotScope Workbench app session:

- appears in Account Security with trusted app classification;
- can be revoked from Account;
- loses Workbench access after revoke;
- does not revoke the separate Account browser session;
- writes expected durable security audit.

This is a strong staff-rollout gate.

---

# 22. Audit strategy

Keep two concepts separate.

## Domain revision history

Stored by LotScope with every save/checkpoint/proof.

Records:

```text
who changed what candidate
which parent revision
which geometry revision
when
```

## AeroVista platform/security audit

Used for:

```text
login/handoff
session revoke
capability/protected-action evidence
security events
```

Do not flood AVCC security audit with every mouse drag.

Commit/save/proof publication events are candidates for higher-level platform work/audit integration later.

---

# 23. Connector Kit decision

Do **not** add the AVCC Connector Kit to LotScope merely because it exists.

Initial Workbench requires:

```text
App Adapter only
```

Add a separate trusted machine identity later only if the LotScope backend genuinely needs direct AVCC machine operations such as:

- Registry/status writes;
- durable AVCC audit publishing;
- notifications;
- other internal machine-service APIs.

Possible future service identity:

```text
lotscope_workbench_api
AV_SERVICE_SECRET_LOTSCOPE_WORKBENCH_API
```

This must remain separate from:

```text
IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH
```

User-login and machine-service trust boundaries must never be collapsed.

---

# 24. Recommended implementation sequence

## Phase I0 — Preflight / package gate

- verify App Adapter 0.3.0 package publication/access from `lot-assessment`;
- document npm/GitHub Packages auth for Vercel build;
- choose exact callback route;
- confirm `lotscope_workbench` is not already registered;
- inventory current Vercel environment/secret handling.

**Exit gate:** LotScope CI can install the exact pinned adapter without copied source.

## Phase I1 — ACOS registration

- add `lotscope_workbench` handoff client;
- register `https://lotscope.aerovista.us`;
- add broker allowlist entry;
- provision Identity Gateway secret;
- configure Connected Apps metadata;
- create initial capability policy/grants.

**Exit gate:** invalid handoff through LotScope reaches broker and returns governed failure, not broker rejection.

## Phase I2 — LotScope adapter seam

Add:

- server adapter factory;
- login route;
- callback/exchange route;
- session projection route;
- logout/revoke route;
- Workbench auth guard;
- capability helper.

Keep public assessment untouched.

**Exit gate:** preview login round trip works and no secret enters client bundle.

## Phase I3 — Founder production canary

Deploy ACOS + LotScope exact accepted heads.

Run:

```text
login
callback
describe
can
protected Workbench
protected mutation
logout/revoke
fail closed
```

**Exit gate:** founder round trip accepted with evidence.

## Phase P1 — Shared persistence foundation

- provision PostgreSQL store;
- add schema/migrations;
- implement authenticated workspace read/write;
- implement immutable candidate revisions;
- implement checkpoint persistence;
- add 409 revision conflict behavior.

**Exit gate:** two browsers for same identity see same saved candidate and cannot silently overwrite stale revisions.

## Phase P2 — localStorage migration

- server authority first;
- local workspace import/recovery;
- browser localStorage becomes cache/recovery only.

**Exit gate:** existing local candidate/checkpoint data survives migration.

## Phase P3 — proof persistence

- store interactive Web Worker proof as `client_interactive`;
- bind to exact canonical geometry revision;
- automatically mark stale on geometry change.

**Exit gate:** no proof can attach to wrong revision.

## Phase P4 — trusted proof runner

- move publish/promotion verification into trusted compute;
- reuse exact engine package;
- store `verified_server` result and digest.

**Exit gate:** promoted evidence is independently recomputable from saved canonical geometry.

## Phase I4 — Account Session Security production promotion

- follow ACOS operations runbook;
- prove LotScope session inventory/revoke behavior.

**Exit gate:** user can see/revoke LotScope app session from Account Security.

## Phase C1 — staff/collaborator rollout

- add resource-scoped capabilities;
- introduce project sharing;
- add activity/revision history UI;
- add compare/branch conflict flow.

**Exit gate:** staff can collaborate without gaining unrelated project access.

---

# 25. Proposed first PR stack

Keep changes small and independently reviewable.

## LotScope next PR
**Identity seam / no persistence**

- App Adapter dependency;
- server adapter;
- auth routes;
- Workbench guard;
- safe session projection;
- capability helpers;
- tests.

## ACOS companion PR
**Register LotScope Workbench**

- handoff client;
- broker allowlist;
- capability policy;
- Connected Apps projection;
- tests/documentation.

The ACOS PR and LotScope PR should be accepted together but may deploy in ACOS-first order.

## Following LotScope PR
**Authenticated workspace persistence**

- database schema;
- server workspace API;
- revision conflict behavior;
- current local workspace compatibility.

## Following LotScope PR
**Local migration + revision history UX**

## Following LotScope PR
**Proof persistence + trusted verification seam**

Exact PR numbers are planning placeholders only.

---

# 26. Tests required for Identity integration

## Browser/session
- login URL contains correct client id and return origin;
- state mismatch rejected;
- callback error rejected;
- browser cannot read service secret;
- unauthenticated `/workbench` redirects/denies appropriately;
- unauthenticated `/api/workbench/*` returns 401.

## Server handoff
- bogus code reaches broker and returns expected `code_not_found`;
- wrong relying-app audience denied;
- reused code denied;
- missing server secret fails closed;
- Gateway unavailable fails closed.

## Session
- valid native session resolves;
- revoked session rejected immediately;
- logout revokes only LotScope app session;
- Account session remains independent.

## Authorization
- `lotscope.workbench.access` denied → Workbench inaccessible;
- project read allowed while project edit denied;
- mutation route checks capability server side;
- UI visibility is not accepted as authorization.

## Public regression
- `/assessment/**` remains public;
- public assessment endpoints do not require Account;
- public build contains no Workbench secret.

---

# 27. Tests required for shared persistence

- authenticated create/read/update;
- foreign identity cannot access another project;
- capability denied write returns 403;
- stale revision returns 409;
- branch creation preserves parent relation;
- checkpoint restore creates a new revision rather than silently destroying history;
- canonical geometry revision survives save/reload;
- malformed candidate rejected;
- browser local import remains revalidation-required where appropriate;
- no proof from revision A can attach to revision B;
- deleting/clearing browser localStorage does not delete server workspace;
- database transaction failure cannot claim save success.

---

# 28. Security rules that are not negotiable

1. No `IDGW_SERVICE_SECRET_*` in browser code.
2. No direct public/browser call to AVCC `/api/internal/*`.
3. No local role string used as protected-action authority.
4. `identity.can()` fails closed for protected operations.
5. Public LotScope stays public unless deliberately changed.
6. Workbench domain state belongs to LotScope, not AVCC Identity.
7. Browser-generated solver evidence is not automatically trusted server evidence.
8. Raw native session tokens are never rendered in UI or stored in ordinary client state.
9. Revocation must take effect through live session/capability resolution.
10. Shared save requires revision conflict protection.
11. Account self-service must not gain role/grant mutation through LotScope.
12. A machine-service secret, if later introduced, remains separate from the App Adapter broker secret.

---

# 29. Current known technical follow-ups

Legitimate future work includes:

- richer polygon validity for unusual collinear/touching edge cases;
- optional orthogonality/angle constraints where architectural intent requires them;
- richer direct-edit browser gesture QA;
- room/stair/conditioned-area revalidation after arbitrary footprint edits;
- dependent opening/room transforms for more complex topology;
- performance work on long ranked search paths;
- trusted-server proof execution;
- collaboration/version history;
- authenticated persistence;
- wider staff/device/cross-tab identity acceptance.

These are not reasons to reopen already accepted editor/circulation architecture.

---

# 30. Immediate next executable actions

Start in this order:

1. **Verify App Adapter package distribution**
   - confirm `@aerovista-us/app-adapter@0.3.0` can be consumed by `lot-assessment`;
   - publish through existing tag-gated release path if not.

2. **Open the ACOS LotScope registration branch**
   - app id `lotscope_workbench`;
   - origin `https://lotscope.aerovista.us`;
   - broker allowlist;
   - Connected Apps metadata;
   - capability policy skeleton;
   - secret template only.

3. **Open LotScope Identity PR**
   - install/pin adapter;
   - create server/browser integration seam;
   - protect `/workbench/**`;
   - add login/callback/logout/session routes;
   - keep public assessment public;
   - test fail-closed behavior.

4. **Provision production/preview secrets**
   - Identity Gateway;
   - Vercel/LotScope environment;
   - no browser exposure.

5. **Run broker smoke**
   - bogus handoff code must reach accepted broker path.

6. **Run founder interactive canary**
   - Account → LotScope → describe → can → protected edit → revoke.

7. **Only after founder canary**
   - begin authenticated PostgreSQL workspace persistence.

8. **Before staff rollout**
   - promote Account Session Security v1 and verify LotScope session inventory/revoke.

---

# 31. Handoff decision summary

The Workbench no longer needs more editing features as its primary next investment.

Critical next transition:

```text
single-browser professional tool
            ↓
authenticated AeroVista application
            ↓
durable shared professional workspace
            ↓
trusted revision/evidence system
```

The identity platform is now mature enough for this integration:

- App Adapter v0.3 contract exists;
- Account app return is hardened;
- old PR #49 session-integrity blocker is resolved and merged;
- founder Account/Rack production acceptance is proven;
- capability-first authorization is established;
- Account Session Security has accepted source contract and only needs intentional production promotion.

The safe next move is **not** to create new LotScope authentication or copy identity logic.

It is to register `lotscope_workbench` as a normal AeroVista relying application and consume the existing App Adapter exactly as designed.

Once that canary is accepted, shared persistence can be introduced with canonical AVCC identity attached to every revision while LotScope remains authoritative for its own project geometry and evidence.

---

# 32. Continuation authority

## LotScope
- `aerovista-us/lot-assessment`
- `main = 56e77ea69fac1c952f48b283e731d45ad8ff5d8a`
- PR #44 authoritative circulation engine
- PR #45 Intervention Editor authoritative proof
- `components/workbench/useCandidateWorkspace.ts`
- canonical intervention geometry modules
- authoritative circulation package and tests

## AeroVista Account / Identity
- `aerovista-us/ACOS`
- `main = bffb2dda7e73c81b9d14b9380748a98a5f646f6e`
- `docs/APP_ONBOARDING_RECIPE.md`
- `docs/AEROCORE_APP_ADAPTER_V0.md`
- `docs/APP_IDENTITY_EXPERIENCE_V1.md`
- `docs/ACCOUNT_IDENTITY_PLATFORM_MAP.md`
- `docs/ACCOUNT_SESSION_SECURITY_V1.md`
- `docs/ACCOUNT_SESSION_SECURITY_OPERATIONS.md`
- `@aerovista-us/app-adapter` v0.3.0

If historical notes conflict with those canonical sources, the current canonical sources win.

---

**Recommended continuation:** begin Phase I0 package verification, then create the ACOS `lotscope_workbench` registration change and the LotScope App Adapter integration PR as a paired rollout.
