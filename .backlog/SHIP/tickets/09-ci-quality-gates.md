# CHR-006 — CI: backend + frontend quality gates on every PR

ID: CHR-006
Status: ⬜ ready
Type: chore
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

A GitHub Actions workflow that runs on every pull request: a backend job (`ruff check`, `ruff format
--check`, `mypy`, `pytest` with the existing ≥80% coverage gate) and a frontend job (`eslint`,
`prettier --check`, `vitest`, `vite build`) — the exact commands already run locally per `CLAUDE.md`'s
quality gate, now automated instead of run by hand before every merge.

## Acceptance criteria

- [ ] A GitHub Actions workflow triggers on every pull request targeting `develop`/`main`.
- [ ] The backend job runs `ruff check`, `ruff format --check`, `mypy`, and `pytest` (coverage ≥80%
      enforced) and fails the check on any violation.
- [ ] The frontend job runs `eslint`, `prettier --check`, `vitest`, and `vite build`, and fails the
      check on any violation.
- [ ] A PR with a deliberately introduced lint/type/test failure shows a red, visible CI check.

## Blocked by

None — can start immediately.
