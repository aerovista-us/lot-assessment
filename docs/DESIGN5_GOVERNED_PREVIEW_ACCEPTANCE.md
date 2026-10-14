# Design 5 governed preview — acceptance runbook

Production client: lotscope_workbench, exactly https://lotscope.aerovista.us.
Preview client: lotscope_workbench_preview, exactly https://lotscope-git-feat-design5-shared-a-bd9f8e-aerovista-us-projects.vercel.app.
ACOS PR #128 registers the preview client as founder-only and invisible to Account Connected Apps. No wildcard Vercel origins.

## Secrets and deployment gates
1. Provision a dedicated read:packages-only GitHub Packages credential using the approved secrets process. Add it as sensitive Vercel NODE_AUTH_TOKEN, Preview target, branch feat/design5-shared-architecture-contract only. Do not reuse production token or log credential values.
2. Register a dedicated Identity Gateway service principal for lotscope_workbench_preview with minimum handoff/identity capabilities. Store its separate credential as sensitive Vercel IDGW_SERVICE_SECRET_LOTSCOPE_WORKBENCH_PREVIEW, Preview target and same branch only. Production credential must not be a fallback.
3. Verify Vercel preview deployment READY at exact PR head. A green GitHub workflow is not proof of a working Vercel preview.
4. Review, merge and deploy ACOS PR #128 before founder preview login. Test Account return validation: registered client + exact origin accepted, unrelated Vercel origins and nonfounder roles rejected.
5. Authenticated desktop and mobile browser acceptance: wall drag, vertex drag, final pointer-up, snapping, pointer cancellation, keyboard controls, save/reload revision persistence, rejected invalid geometry.
6. Confirm unaccepted roof geometry and customer publication remain blocked; capture exact SHA and review evidence before PR #100 merge.

## Verified local checks
At LotScope head fb25efb1cc5dd8dccd7e0b581d4dd793a18ea66a on NXCore: callback contract test PASS, universal design PASS, universal solver PASS, TypeScript PASS, production build PASS. These tests used existing authorized cached node_modules, not a reproducible clean npm install.
GitHub Actions passed three LotScope QA workflows at this head; Vercel preview failed npm authentication. ACOS PR #128 handoff and identity checks passed; remaining CI checks may still be running.
Do not merge solely to test production; no copying browser cookies, sharing founder credentials or bypassing geometry authority.
