# Issue tracker: local `.backlog/` directory

Lots, PRDs, and tickets for this repo live as markdown under `.backlog/`. (The code is hosted on
GitHub, but issues are tracked locally here — the two are decoupled.)

## Conventions

- One lot per directory: `.backlog/<LOT-ID>/` (semantic name, e.g. `CORE`).
- The PRD is `.backlog/<LOT-ID>/PRD.md` (the `/to-prd` template).
- Tickets are `.backlog/<LOT-ID>/tickets/<NN>-<slug>.md`, numbered from `01` in dependency order.
- Each ticket keeps a **stable ID** (`BIZ-`/`TEC-`/`CHR-`) as an `ID:` line — referenced by the
  changelog and docs, so it never changes even though the filename uses `NN-slug`.
- Status is a single `Status:` line near the top of each PRD/ticket file (see `triage-labels.md`).
- The lot index (table of every lot + status) is `.backlog/README.md`, maintained by hand.
- Completed lots are moved to `.backlog/archive/<LOT-ID>.md` (compact, ticket table preserved).
- Comments / conversation history append at the bottom under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

- A PRD → write `.backlog/<LOT-ID>/PRD.md` (create the directory if needed) and add a row to
  `.backlog/README.md`.
- An issue → write `.backlog/<LOT-ID>/tickets/<NN>-<slug>.md` with `ID:`, `Status:`, `Type:`, `Priority:`.
- New artifacts are created at `Status: ⬜ ready` (the `ready-for-agent` role).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user normally passes the lot ID or ticket path directly.

## Sequencing vs scope

`.backlog/` is the source of truth for **scope and status**. Execution order, priority tiers, and hard
dependencies live in `ROADMAP.md` at the repo root.

## PRs as a request surface

No — issues are authored here, not triaged from external PRs.
