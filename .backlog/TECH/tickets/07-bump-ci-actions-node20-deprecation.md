# CHR-013 — Bump GitHub Actions off the deprecated Node 20 runtime

ID: CHR-013
Status: ⬜ ready
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

## Actions in use (across `.github/workflows/{ci,cd-docker,cd-exe,docs}.yml`)

Pin each to the current major that targets Node 24:

- `actions/checkout@v4` → latest v4/v5 on Node 24 (5 uses)
- `actions/setup-node@v4` → latest (2 uses)
- `actions/setup-python@v5` → latest (3 uses)
- `softprops/action-gh-release@v2` → latest patch/major on Node 24 (1 use)
- Sanity-check the rest at the same time: `actions/deploy-pages@v4`, `actions/upload-artifact@v4`,
  `actions/upload-pages-artifact@v3`, `docker/*` (`build-push-action@v6`, `login-action@v3`,
  `metadata-action@v5`, `setup-buildx-action@v3`) — bump any that still target Node 20.

## Acceptance criteria

- [ ] No "Node.js 20 is deprecated" annotation on CI or CD runs.
- [ ] `Backend quality gate`, `Frontend quality gate`, and both CD workflows (docker + exe) still pass
      on a tag/PR.

## Notes

- Workflow-only change; no application code. Verify by pushing to a branch (CI) and, ideally, a
  throwaway pre-release tag or a manual `workflow_dispatch` if the CD workflows support it, since the
  exe/docker CD only triggers on tags.

## Blocked by

None.
