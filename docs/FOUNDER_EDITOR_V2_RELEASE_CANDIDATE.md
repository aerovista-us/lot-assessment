# Isolated universal editor V2 — guarded production-compatible release candidate

## What this branch changes
- Copies the **shared** floor/roof model preview and design-document geometry implementation, not project-specific solvers.
- Copies the improved universal editor as a separate `UniversalDesignEditorV2` component with wall/vertex editing, partition and program/stair previews.
- Adds updated universal design-document and solving regression fixtures.
- Preserves existing production Workbench authentication, session, handoff and app identity unchanged.
- `CandidateWorkspaceClient` defaults to the **existing production editor**. Experimental V2 UI requires explicitly setting `LOTSCOPE_EDITOR_V2_RELEASE=enabled` **on the server** plus live AVCC capability `lotscope.workbench.editor_v2` for an identity with `founder` role.

## Critical flag boundary
The candidate page now calls `mayUseEditorV2()` server-side. It defaults off, verifies the existing Workbench session/capability, requires the founder role in the returned Identity descriptor, and requires a **distinct** AVCC `lotscope.workbench.editor_v2` capability. Any missing role, permission, session, configuration or backend error fails closed to the legacy editor. Assign the new capability only to approved founders via the existing AVCC entitlement process; confirm IdentityDescriptor exposes effectiveRoles or roles before enabling. No client-side flag is an authorization mechanism.

## QA and deployment release gates
1. CI: exact-head install/lint, universal design-document/solver regression, auth/identity, roof, circulation, and Pondy benchmark; verify the V2 and legacy TypeScript build together.
2. Independent security review: verify new `LOTSCOPE_EDITOR_V2_RELEASE` server gate plus founder role + `lotscope.workbench.editor_v2` capability; prove founder allow and staff/client/guest/anonymous deny using live AVCC responses. Confirm identity role descriptor shape and entitlement provisioning.
3. Deploy candidate in an authorized preview/staging environment with authentication proof, or a narrowly scoped internal canary using existing production Account identity and an approved rollback. Do not switch preview to production credentials.
4. Browser: founder login/logout/session reload; drag wall/vertex and cancel; keyboard nudges; invalid shapes rejected; save/reload; roof and report source invalidation; desktop/mobile; verify correct jogged boundary orientation.
5. Record exact commit/SHA and deploy ID. Only then approve any staged rollout; keep V2 flag disabled until reviewed.
6. Rollback by leaving/reverting feature toggle to disabled and redeploying known-good package; retain prior candidate revisions.

**Not in scope:** ACOS PR #128 preview handoff changes, new-lot intake, customer publishing or claim of locked construction roofs. Design 5 is still a universal internal editor, not a fifth published concept.

Source feature: PR #100. Main product plan: `docs/PRODUCT_COMPLETION_PLAN_2026-10-14.md`.
