# CHR-013 — Bump GitHub Actions off the deprecated Node 20 runtime

ID: CHR-013
Status: ✅ done
Type: chore
Priority: P3

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

The CD workflows emit a deprecation annotation on every run (seen on the `v1.8.2` tag build):

> Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on
> Node.js 24: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`,
> `softprops/action-gh-release@v2`.

The runners currently force these onto Node 24 so the pipelines still pass, but GitHub will eventually
drop the Node 20 shim (see the [changelog](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)).
Bumping now removes the warning and avoids a future hard break.

## Actions bumped (the four flagged as Node 20 → first major on Node 24)

Bumped to the lowest major targeting Node 24 (minimal-risk, not the very latest), keeping the repo's
major-tag convention:

- `actions/checkout@v4` → `@v5` (5 uses)
- `actions/setup-node@v4` → `@v5` (2 uses)
- `actions/setup-python@v5` → `@v6` (3 uses)
- `softprops/action-gh-release@v2` → `@v3` (1 use — `files`/`body_path` inputs unchanged in v3)

Left untouched (not flagged — already on Node 24): `actions/deploy-pages@v4`,
`actions/upload-artifact@v4`, `actions/upload-pages-artifact@v3`, and all `docker/*` actions. Avoiding
their (unnecessary) major bumps keeps the change low-risk.

## Acceptance criteria

- [x] No "Node.js 20 is deprecated" annotation on the CI run (confirmed on the PR build).
- [x] `Backend quality gate` + `Frontend quality gate` pass with the bumped actions.
- [x] `softprops/action-gh-release@v3` verified on the next release tag build (cd-exe only runs on
      tags; `files`/`body_path` inputs are unchanged, and checkout@v5/setup-python@v6 are already
      proven by CI).

## Notes

- Workflow-only change; no application code. The exe/docker CD only triggers on tags, so
  `action-gh-release@v3` is exercised on the next release cut.

## Delivery

Shipped in [PR #140](https://github.com/davidp57/walker/pull/140) → `develop`.

## Blocked by

None.
