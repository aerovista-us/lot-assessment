# LotScope Case Compare — isolated Neon acceptance receipt

**Status:** NOT EXECUTED against Neon. This is an operator checklist and acceptance contract, not a claim of a successful migration.

## Verified preflight facts (read-only)
- Target Vercel project: `lotscope` / `prj_qRwvydlg2d9yVbZZfkryxjjEdRt0`.
- Integration resource: `lotscope-workbench` / Neon resource `soft-rain-48005994`.
- Integration deployment actions specify Preview branching. This setting does **not** prove that the intended preview branch currently exists.
- Code branch: `feat/case-persistence-neon-v1`; draft PR #173.
- Migration file: `db/migrations/001_case_comparison.sql`.
- Preview verification file: `db/tests/neon_preview_acceptance.sql`.
- Controlled Postgres tests use a disposable database. They are not evidence of Neon Preview completion.

## Stop conditions
Do not run SQL if the intended preview branch is absent, not selected, still routes to the production endpoint, or if the active authenticated user cannot verify the Neon project/branch ID and the branch's parent.

Do not fetch or print database passwords, session tokens, connection URIs, cookies, or other secrets in CI logs, issue comments, or screenshots.

## Branch receipt required BEFORE DDL
Record outside secrets:
- Neon project ID: __________
- Neon branch **ID** and name: __________
- Neon parent branch ID: __________
- Preview endpoint hostname (host only, not URI): __________
- Production endpoint hostname (host only): __________
- Hostnames differ: YES / NO
- Preview deployment commit: __________
- Isolation confirmed in Neon Console: YES / NO

An environment variable named `DATABASE_URL` in Vercel is not proof of branch isolation. See Neon Console → Branches and confirm the endpoint belongs to the selected preview branch.

## Migration, rollback-only SQL acceptance
1. In Neon Console, select the verified **preview** branch and intended database in SQL Editor; independently check that production is NOT selected.
2. Apply the exact contents of `db/migrations/001_case_comparison.sql` in the preview branch only. Record execution timestamp and output. The migration wraps its DDL in a transaction.
3. Run `db/tests/neon_preview_acceptance.sql` against that same branch. It asserts schema, trigger names, revision capture, stale write denial, tenant isolation, and history immutability. Its probe writes are enclosed in `BEGIN` / `ROLLBACK`; it must report PASS with no leftover probe row.
4. Confirm the preview application's runtime deployment points at this same Neon branch. Do not infer this solely from a successful build.

## Real authenticated case acceptance
Use **two distinct authorized, non-production test identities** through the actual AeroVista Gateway / AVCC SSO flow on the exact Preview URL. Do not bypass capability checks. Both users must independently have `lotscope.workbench.access` granted in the identity authority; avoid sharing one founder cookie.

- [ ] Founder session authenticated; capture redacted identity ID and capability receipt.
- [ ] Second authorized identity authenticated; distinct identity ID proven.
- [ ] Unauthenticated GET, PUT and `?list=1` all 401.
- [ ] Founder creates unique test case, server returns revision 1; first entry in revision history exists.
- [ ] Founder reloads page/device and loads same case; content, address, selections and revision match.
- [ ] Founder edits case and saves revision 2; revision history contains both immutable snapshots.
- [ ] An old revision 1 write returns 409; current revision 2 is unchanged.
- [ ] Second identity cannot GET founder's case (404), cannot read it in list, and cannot modify founder case.
- [ ] Second identity creates/loads own case; independent revision history is recorded.
- [ ] Malformed project 400; verified evidence without source 422; invalid origin 403.
- [ ] Failure injection in **Preview** proves unreachable DB fails 503 and browser draft survives.
- [ ] Case package export/import does not transfer acceptance or grant authority.

## Real Preview recovery acceptance
1. Capture a Preview-only backup or snapshot, with timestamp/branch ID, using Neon branch snapshot/restore tooling or a protected dump under an approved recovery procedure.
2. Restore to a separate throwaway Neon branch or scratch database; **never overwrite Preview or Production in the recovery drill**.
3. Compare restored table counts, sample case IDs, latest revision values, revision-history counts, and trigger definitions. Do not include private case content in logs.
4. Verify at least one restored case head and immutable historical revision through SQL. Record the restore duration, resource ID, and verification receipt. Delete scratch resources under documented cleanup.

## Gate
**Do not mark ready, merge, or promote until all boxes are checked and evidence is recorded.**
Draft PR #173 stays unmerged; this receipt does not authorize a production migration.
