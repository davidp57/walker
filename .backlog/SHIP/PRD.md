# Professionalize Walker into a shareable app — PRD

Status: ⬜ ready
Lot: SHIP
Branch: feature/ship-* / chore/ship-* / fix/ship-* per slice → PR → develop

## Problem Statement

Walker only works for one person, at one company, run from a dev checkout. Its vocabulary
("Fortnight", "T&E", "PwC") is hardwired to the author's employer, its period boundaries assume that
employer's specific semi-monthly split, there's no way for more than one real person to use an
instance, and running it means cloning the repo and building it by hand. To hand Walker to anyone else
— a colleague, or a stranger who finds the repo — none of that is acceptable: the app needs to read as
a generic product, support real people signing in, be installable without a dev environment, and have
its quality gates enforced automatically instead of by one person's discipline.

## Solution

Genericize Walker's domain vocabulary and its one PwC-specific hardcoded behavior (the Timesheet
period), add a real multi-user login (SSO) for a shared hosted instance while leaving the standalone
distributions exactly as simple as today, publish a real user-facing docs site, and automate what's
today manual: CI enforcing the existing quality gates, and two CD pipelines producing a ready-to-run
Docker image and a ready-to-run Windows `.exe`.

## User Stories

**Vocabulary**

1. As a user with no affiliation to PwC, I want the app's language ("Timesheet period", "Timesheet
   system") to read as generic, so that nothing in the UI or docs implies this is PwC-only software.
2. As an existing user, I want my current data and behavior (semi-monthly period, same fields, same
   grid) to be unchanged after the rename, so upgrading doesn't disrupt my workflow.
3. As a user, I want the shell's footer to show my own name (or username, if I haven't set one) instead
   of a hardcoded role and employer, so the app doesn't misrepresent who I am.

**Configurable Timesheet period**

4. As a user whose company reports on a different cadence, I want to choose a weekly, semi-monthly, or
   monthly Timesheet period in Settings, so Walker's grid matches my own company's timesheet system.
5. As a user, I want changing my period scheme to immediately reshape the Timesheet period view and its
   boundaries, so I see the effect right away, with no stale cached period.
6. As a developer, I want the period-bounds computation to be a pure, per-scheme-tested function, so
   period math stays reliable as schemes are added or changed.

**Organization and SSO**

7. As a new user of the hosted instance, I want to sign in with my Google, Apple, or Microsoft account,
   so I don't need to create and remember a new password for yet another tool.
8. As a user signing in for the first time with a given work email domain, I want Walker to
   automatically create or join my Organization, so nobody has to ask an admin to set anything up.
9. As a member of an Organization, I want to see and impute against the same real Timesheet-code
   catalog as my colleagues, so nobody has to redundantly re-import a catalog that's already there.
10. As a member of an Organization, I want my own virtual codes, Entries, and Tasks to stay private, so
    my personal classification and tracked time aren't visible to colleagues.
11. As an Organization member, I want a real code my colleague can't delete while I have Entries booked
    against it, so the shared catalog's delete guard protects everyone's data, not just mine.
12. As a user of the standalone Docker image or `.exe`, I want to keep using Walker with zero login,
    exactly as today, so a self-hosted single-user instance isn't burdened with auth it doesn't need.

**Docs site**

13. As a prospective user, I want a public docs site with installation and day-to-day usage guides, so
    I can evaluate and set up Walker without reading the source code.
14. As a user, I want the docs organized by what I'm trying to do (getting started, self-hosting,
    day-to-day guide), so I find what I need without hunting through a wall of text.

**CI**

15. As a maintainer, I want every pull request to run the full backend and frontend quality gates
    automatically, so a regression can't merge silently.
16. As a maintainer, I want a red CI check to block merging, so the "run the gates before merging"
    discipline becomes an enforced guarantee, not a habit that depends on someone remembering.

**CD — Docker**

17. As someone deploying Walker on their own infrastructure, I want a versioned, ready-to-run Docker
    image published automatically on release, so I don't need to build it myself.
18. As someone starting a fresh container (or upgrading an existing one), I want the database schema
    brought up to date automatically on boot, so I never run a migration command by hand.

**CD — standalone `.exe`**

19. As a Windows user without Python or Node installed, I want to download a single `.exe`, so I can
    run Walker locally without setting up a dev environment.
20. As a user launching the `.exe`, I want my browser to open automatically on the running app, so I
    don't have to guess the URL or the port.
21. As a user upgrading to a newer `.exe`, I want my existing data preserved and migrated automatically,
    so upgrading is safe and never means starting over.

## Implementation Decisions

Frontend + backend. Builds on ADR-0007 (no auth for the POC, but data scoped to `user_id` from day
one) — this lot is explicitly the "later layer" that ADR anticipated, for the hosted target only.

**Vocabulary rename**

- Mechanical rename across code, API routes, UI strings, comments, and tests: `Fortnight` →
  `Timesheet period` (`fortnight_bounds` → `period_bounds`, `FortnightGrid`/`FortnightScreen` →
  matching new names, `/api/fortnight/*` routes renamed), `T&E` / `Time & Expenses` → `Timesheet
  system`, "PwC" removed from UI copy, seed data, and docs. Vocabulary itself is already fixed in
  `CONTEXT.md` (done); this is applying it to the codebase.
- `User` gains an optional `name: str | None` column. The shell footer renders `name ?? username` and
  drops the hardcoded "Consultant" / "PwC · Advisory" lines entirely.

**Configurable Timesheet period (ADR-0009)**

- `Settings` gains a `period_scheme` column (`weekly | semi_monthly | monthly`), defaulting to
  `semi_monthly` so existing users see no behavior change.
- `period_bounds(scheme, on_date)` replaces `fortnight_bounds(on_date)` as the pure function computing
  a period's `(start, end)`; aggregation reads the scheme from the user's `Settings` instead of
  hardcoding the semi-monthly split. No custom N-day cycles (rejected in ADR-0009).

**Organization-scoped catalog + SSO (ADR-0010)**

- New `Organization` model (`id`, `email_domain` unique, timestamps). `User` gains `email` (identity
  from the SSO provider; also the auto-join key) and `organization_id`.
- Real Timesheet codes (`real_code_id IS NULL`) move from `TimesheetCode.user_id` to
  `TimesheetCode.organization_id` — shared catalog per Organization. Virtual codes keep `user_id`
  (personal). Entries and Tasks are untouched (`user_id`-scoped).
- Real-code queries and mutations (list, create, edit, delete, and the existing in-use delete guard)
  are re-scoped from "this user's codes" to "this Organization's codes."
- SSO: OAuth2/OIDC against Google, Apple, and Microsoft. On a successful callback, resolve the email's
  domain, find-or-create the matching `Organization`, and find-or-create the `User` by email under it.
  No invite flow, no roles.
- SSO applies to the **hosted deployment only**. The standalone Docker image and `.exe` keep today's
  implicit-default-user, no-login path unchanged — a deployment-mode setting selects which auth path is
  active.
- Existing single-user deployments migrate each user into an Organization of one, so upgrading a
  standalone instance doesn't strand its data if it's later pointed at hosted mode.
- The hosted deployment enables SQLite's **WAL** (Write-Ahead Logging) journal mode and foreign-key
  enforcement at startup (`PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`), using an async
  SQLAlchemy engine — the same pattern already proven in production by the author's Solde app
  (`backend/database.py`'s `init_db()`). WAL lets concurrent readers proceed without blocking on a
  writer (SQLite still allows only one writer at a time — WAL doesn't change that — but removes the
  whole-file lock that makes the default rollback-journal mode painful with more than one active user).
  Sized for this lot's actual scale (a handful of Organization members); it is not a substitute for an
  external DBMS if the hosted instance later needs real concurrent-write throughput.

**Docs site**

- A new MkDocs + Material-theme site (mirroring VMCT v6's `mkdocs.yml` shape: theme, nav structure,
  search), built and deployed to GitHub Pages by a GitHub Actions workflow. Content is hand-written for
  an external user (installation per distribution target, day-to-day guide) — not generated from
  `CONTEXT.md` or `docs/adr/`, which stay internal developer documentation.

**CI**

- A GitHub Actions workflow running on every pull request: a backend job (`ruff check`, `ruff format
  --check`, `mypy`, `pytest` with the existing ≥80% coverage gate) and a frontend job (`eslint`,
  `prettier --check`, `vitest`, `vite build`), mirroring the exact commands already run locally
  (`CLAUDE.md`'s quality gate).
- A branch-protection rule on `develop`/`main` requires both jobs to pass before a PR can merge.

**CD — Docker**

- The existing multi-stage `Dockerfile` already self-migrates (`alembic upgrade head && exec walker` on
  boot) — no change needed there. A new GitHub Actions workflow, triggered on `v*` tags, builds it and
  publishes to GitHub Container Registry (`ghcr.io`), tagged with the version and `latest`.

**CD — standalone `.exe`**

- A PyInstaller build bundles the FastAPI backend, the built frontend static files, and the Alembic
  migration chain into one Windows executable. On launch it runs `alembic upgrade head` against a
  SQLite database at `%APPDATA%\Walker\walker.db` (not next to the binary), opens the default browser
  at `http://localhost:8000`, and keeps a visible console window (no system-tray mode).
- A GitHub Actions workflow, triggered on `v*` tags, runs the PyInstaller build on a Windows runner and
  attaches the resulting `.exe` to that tag's GitHub Release.

## Testing Decisions

Test external behavior through the highest seam; never internals. Coverage gate ≥80% unchanged.

- **Vocabulary rename**: no new seam. Existing backend (`tests/test_api_*.py`, `tests/test_services_
  *.py`) and frontend (`*.test.tsx`) tests are updated in place — same assertions, new names/labels.
- **Configurable period** — backend pure-function tests for `period_bounds` per scheme (prior art:
  `tests/test_services_fortnight.py`'s exhaustive date-math coverage), plus an API test that
  `period_scheme` round-trips through `/api/settings` (prior art: `tests/test_api_settings.py`).
  Frontend: the period-scheme Settings control and the Timesheet-period view recomputing on change.
- **Organization/SSO**:
  - The domain-based find-or-create-Organization logic is a pure service function, unit-tested
    independently (given an email, an existing-Organizations set → which Organization, created or
    joined) — same shape as the existing `services/*.py` pure-function tests.
  - The OAuth login flow is tested at the **API seam** with the provider's response mocked (never
    against real Google/Apple/Microsoft accounts) — prior art for mocking an external boundary:
    `frontend`'s mocked-API tests (e.g. `App.test.tsx`'s `vi.spyOn(api, ...)`) for the equivalent
    pattern on the frontend side.
  - Re-scoping the real-code catalog gets a migration test plus an API test asserting two `User`s in
    the same `Organization` see and can impute against the same codes, and that one member's virtual
    codes/Entries/Tasks are invisible to another.
  - Enabling WAL mode gets a narrow test asserting `init_db()`'s startup `PRAGMA` calls actually run
    (prior art: Solde's `tests/unit/test_database.py::test_init_db_does_not_create_tables`, which
    verifies the `PRAGMA journal_mode` call executes and returns a mode) — not a concurrency stress
    test, just a regression guard that the PRAGMA doesn't silently stop being issued.
- **Docs, CI, CD (Docker + `.exe`)**: no automated test seam — this is infrastructure/tooling, verified
  manually (a deliberately failing PR is blocked by the required CI check; a version tag produces a
  pulled image on GHCR and a downloadable, runnable `.exe` on the Release page). Stated explicitly here
  rather than inventing unit tests that would verify nothing meaningful.

## Out of Scope

- The docs chatbot (Cloudflare Worker + Gemini RAG, modeled on VMCT v6's DOC-CHATBOT lot) — the target
  architecture is scoped and recorded in `ROADMAP.md`, but not committed to this PRD; a follow-up lot
  once the docs site itself exists.
- Custom/arbitrary Timesheet-period cycles beyond the three fixed schemes (rejected in ADR-0009).
- Sharing virtual codes, Entries, or Tasks across an Organization — these stay strictly per-`User`.
- Any Organization membership model beyond auto-join-by-domain: no invites, no roles, no admin
  permissions over the shared catalog.
- SSO/login for the standalone Docker image or `.exe` — they keep ADR-0007's implicit-user behavior.
- Any change to how durations are recorded, rounded, or targeted (ADR-0005 stands).
- Switching off SQLite (ADR-0004) for the hosted, multi-tenant target. WAL mode (see Implementation
  Decisions) mitigates the read/write contention this lot's actual scale would hit, but SQLite is still
  single-writer — an external DBMS remains a separate, later concern if the hosted instance ever needs
  real concurrent-write throughput beyond a handful of Organization members. Tracked separately in
  `ROADMAP.md`'s existing "switch to an external DBMS when hosted" forward-looking item.
- Multi-currency, billing, or any monetization concern.

## Further Notes

- Sourced from a grilling session (this repo's `grill-with-docs` skill) held to scope this lot; every
  decision above is already recorded in `CONTEXT.md` (vocabulary), ADR-0009 (period), and ADR-0010
  (Organization/SSO) — this PRD assembles them into one shippable slice rather than introducing new
  decisions.
- The lot's working name was "RELEASE" during the grilling session; the user picked **SHIP** as the
  final name specifically because it stays legible to someone reading `.backlog/README.md` without the
  session's context, unlike a themed alternative ("BADGE," playing on the app's *Walker, Texas Ranger*
  namesake) that was also considered.
- Next step: `/to-issues` slices this lot into per-area tracer-bullet tickets (BIZ / TEC / CHR),
  respecting the natural dependency order (vocabulary rename and period scheme have no dependencies;
  Organization/SSO depends on nothing here either but is the largest single slice; docs/CI/CD are each
  independent of the others and of the vocabulary/period/org work).
