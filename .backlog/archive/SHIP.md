# SHIP — Professionalize Walker into a shareable app (archived)

Status: ✅ done
Branch: feature/*, fix/*, chore/* per ticket → PR → develop

## Summary

Turns Walker from a personal, PwC-specific tool into a generic, shareable time-tracking app: vocabulary
genericized ("T&E"/"Time & Expenses" → "Timesheet system", "Fortnight" → configurable "Timesheet
period"), multi-tenant Organization model with domain-based auto-join and SSO for a hosted deployment,
a real-code catalog scoped per Organization, a public MkDocs docs site, CI quality gates + branch
protection, and two standalone distribution paths (Docker image on GHCR, Windows `.exe` via
PyInstaller) — each self-migrating on boot. See ADR-0009 (configurable Timesheet period) and ADR-0010
(Organization-scoped catalog + SSO).

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-027 | Timesheet period rename + configurable period scheme | P2 | ✅ done |
| BIZ-028 | Organization model + domain-based auto-join | P2 | ✅ done |
| BIZ-029 | SSO login (Google/Apple/Microsoft) for the hosted instance | P2 | ✅ done |
| BIZ-030 | Real-code catalog becomes Organization-scoped | P2 | ✅ done |
| CHR-003 | "T&E"/"Time & Expenses" → "Timesheet system" rename | P3 | ✅ done |
| CHR-004 | Remove PwC branding; optional User display name | P3 | ✅ done |
| TEC-005 | Enable SQLite WAL mode for the hosted deployment | P2 | ✅ done |
| CHR-005 | Docs site (MkDocs + Material) on GitHub Pages | P2 | ✅ done |
| CHR-006 | CI: backend + frontend quality gates on every PR | P2 | ✅ done |
| CHR-007 | Branch protection requires CI to pass before merge | P3 | ✅ done |
| CHR-008 | CD: publish the Docker image to GHCR on version tags | P2 | ✅ done |
| CHR-009 | Standalone `.exe` (PyInstaller) + CD to GitHub Releases | P2 | ✅ done |

## Verified against

- Backend and frontend quality gates (`ruff check`/`ruff format --check`/`mypy`/`pytest`,
  `eslint`/`prettier --check`/`vitest`/`vite build`) green on every merged PR.
- `BIZ-027` (largest ticket) merged after a 15-file conflict resolution against everything else the
  lot had landed in the meantime; re-verified with the full 197 backend + 217 frontend test suite
  before merging.
- The shared-`.venv` race (a concurrent worktree-isolated agent's `pip install -e .` can silently
  repoint the venv's editable install at its own checkout) recurred throughout this lot too — every
  backend result was re-verified with a fresh `pip install -e ".[dev]"` from the correct checkout
  before trusting it.
- A CRLF "format:check failure" reported independently by ~8 agents across this lot turned out to be a
  local `core.autocrlf=true` working-directory artifact, not real repository content (git blobs were
  confirmed pure LF via `git cat-file`) — never actually a CI risk, but a `.gitattributes` was added as
  defensive future-proofing.
- Post-lot, the actual CD pipelines were dry-run for real: `cd-docker.yml` initially failed because the
  Docker build's frontend stage didn't include `tests/fixtures/` (needed by TEC-004's contract test,
  which `tsc --noEmit` type-checks) — fixed, then verified end-to-end by pushing test tags
  (`v0.1.0-rc1`, `v0.1.0-rc2`, later deleted) and confirming a real image reached GHCR. `docs.yml`
  initially failed because GitHub Pages had never been activated for the repo, and its trigger included
  `develop` while the auto-created `github-pages` environment only allows deploys from `main` — both
  fixed (Pages enabled via the API; trigger narrowed to `main` only, matching this repo's gitflow).

## Key implementation notes

- Multi-tenancy is layered, not uniform: `Organization` auto-joins by email domain (free-mail domains
  excluded), real Timesheet codes are `organization_id`-scoped, but virtual codes, Entries, and Tasks
  stay `user_id`-scoped — a User with no Organization keeps a catalog visible only to themselves.
- `auth_mode` (`sso` / `none`) gates the entire OAuth router and its `SessionMiddleware` at the FastAPI
  app-factory level — in the default `none` mode (every standalone Docker/`.exe` deployment) neither
  exists, so there is no code path that could accidentally reach SSO.
- SQLite WAL mode was added via a `sqlalchemy.event.listens_for(engine, "connect")` PRAGMA listener,
  deliberately kept on the existing **sync** engine — the ticket as originally drafted over-specified
  an async engine copied from the author's Solde app, corrected before implementation as unwarranted
  scope creep for Walker's fully-sync codebase.
- `period_bounds(scheme, on)` (`services/period.py`, renamed from `fortnight.py`) is a pure function
  with no database dependency; existing users on the default `semi_monthly` scheme see byte-for-byte
  identical boundaries to the old hardcoded Fortnight logic.
- Branch protection's `required_status_checks.contexts` must match the CI job's **display** `name:`
  (`Backend quality gate` / `Frontend quality gate`), not its YAML job id (`backend`/`frontend`) — the
  initial setup used the job id and would have blocked every future PR from merging, checks green or
  not; caught and fixed on the first real PR after enabling protection.
