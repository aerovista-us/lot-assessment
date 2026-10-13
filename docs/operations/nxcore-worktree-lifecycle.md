# NXCore worktree lifecycle — 2026-10-13

## Canonical locations
- Primary LotScope checkout: `/home/glyph/Projects/lot-assessment`
- Primary PondyFlats checkout: `/home/glyph/Projects/PondyFlats` (verify before creation)
- Active LotScope worktrees: `/home/glyph/worktrees/lotscope/<branch-slug>`
- Active PondyFlats worktrees: `/home/glyph/worktrees/pondyflats/<branch-slug>`
- Reproducible test artifacts: `/home/glyph/qa/pondyflats/<run-id>`
- Audits and retention manifests: `/home/glyph/Projects/_worktree-audits/`

## Enforced process
1. Use `git -C <primary> worktree add <designated-path> -b <feature-branch> origin/main` for an isolated change. Never add new temporary checkouts directly under `/home/glyph`.
2. Associate each worktree with one issue/PR, and record owner, branch, originating SHA, created date, and expected retirement in the audit inventory.
3. Before retirement, refresh upstream and inspect `git status --porcelain --untracked-files=normal`, tracked diff, ignored artifacts, branch-to-PR mapping, and whether the exact worktree HEAD is an ancestor of current `origin/main`.
4. Do not discard modified files, untracked artifacts, unknown branches, or potential proof evidence. Preserve useful changes on a branch/commit or evidence archive, with a manifest and checksums, before further cleanup.
5. For clean, accepted and confirmed-merged worktrees only, use `git worktree remove <path>` (no `--force`). Recheck the directory is not in use; do not remove the primary checkout. Do not delete a branch automatically if it has unmatched commits.
6. Run `git worktree list --porcelain` and `git worktree prune --dry-run` after accepted merges. `prune` or branch deletion requires separate validation. Never recursively delete worktree folders by path wildcard.
7. Keep source geometry, publication permissions, acceptance evidence and customer deliverables governed by their existing gates. Local cleanup does not promote any artifact.

## October 13 audit
An initial LotScope audit found 41 registered worktrees; eight clean worktrees with HEAD contained in `origin/main` were retired using `git worktree remove`. Full local manifest is `/home/glyph/Projects/_worktree-audits/lotscope-worktree-inventory-2026-10-13.json`. Remaining worktrees include dirty/untracked dependency trees, unmerged historical heads, QA artifacts and active feature states. No forced cleanup or deletion of uncommitted source material authorized. PondyFlats worktrees need a separate formal inventory.
