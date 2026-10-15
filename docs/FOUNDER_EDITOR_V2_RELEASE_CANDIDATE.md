# Isolated universal editor V2 — guarded production-compatible release candidate

## What this branch changes
- Copies the **shared** floor/roof model preview and design-document geometry implementation, not project-specific solvers.
- Copies the improved universal editor as a separate `UniversalDesignEditorV2` component with wall/vertex editing, partition and program/stair previews.
- Adds updated universal design-document and solving regression fixtures.
- Preserves existing production Workbench authentication, session, handoff and app identity unchanged.
- `CandidateWorkspaceClient` defaults to the **existing production editor**. Experimental V2 UI requires explicitly setting `NEXT_PUBLIC_LOTSCOPE_EDITOR_V2=enabled`.

## Critical flag boundary
`NEXT_PUBLIC_*` is a client-side **release toggle, NOT an authorization control**. Enabling it globally for production users is NOT approved. Production must keep it unset until server-authoritative founder-only authorization is implemented or the Workbench capability is verified to permit founders exclusively. The existing Workbench access capability is still enforced, but this alone is not proof of a founder-specific audience.

## QA and deployment release gates
1. CI: exact-head install/lint, universal design-document/solver regression, auth/identity, roof, circulation, and Pondy benchmark; verify the V2 and legacy TypeScript build together.
2. Independent security review: founder-only eligibility **server-side**, deny staff/client/guest, no reliance on public environment variables.
3. Deploy candidate in an authorized preview/staging environment with authentication proof, or a narrowly scoped internal canary using existing production Account identity and an approved rollback. Do not switch preview to production credentials.
4. Browser: founder login/logout/session reload; drag wall/vertex and cancel; keyboard nudges; invalid shapes rejected; save/reload; roof and report source invalidation; desktop/mobile; verify correct jogged boundary orientation.
5. Record exact commit/SHA and deploy ID. Only then approve any staged rollout; keep V2 flag disabled until reviewed.
6. Rollback by leaving/reverting feature toggle to disabled and redeploying known-good package; retain prior candidate revisions.

**Not in scope:** ACOS PR #128 preview handoff changes, new-lot intake, customer publishing or claim of locked construction roofs. Design 5 is still a universal internal editor, not a fifth published concept.

Source feature: PR #100. Main product plan: `docs/PRODUCT_COMPLETION_PLAN_2026-10-14.md`.
