# CHR-007 — Branch protection requires CI to pass before merge

ID: CHR-007
Status: ⬜ ready
Type: chore
Priority: P3

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Configure GitHub branch protection on `develop` (and `main`) requiring CHR-006's CI checks to pass
before a pull request can be merged. This turns today's manual "run the gates before merging" habit
into an enforced guarantee. This is a repository-settings change, not a code change — flagged HITL
since it's the kind of thing worth a human confirming directly rather than an agent flipping
unattended.

## Acceptance criteria

- [ ] `develop`'s (and `main`'s) branch protection rules require CHR-006's backend and frontend CI jobs
      to pass before a PR can be merged.
- [ ] A PR with a red CI check cannot be merged through the GitHub UI or `gh pr merge`.
- [ ] Existing merge conventions (conventional commit messages, PR review) are otherwise unaffected.

## Blocked by

CHR-006.
