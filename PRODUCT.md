# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary user** — a corporate consultant (currently the author), working on his work PC in the
browser. His recurring chore is re-keying a Timesheet period's worth of time into an external,
notoriously unpleasant corporate **Timesheet system**. He tracks time throughout an interrupt-driven
day and needs that tracking to translate cleanly into what the Timesheet system expects.

**Designed-for audience** — colleagues within the same **Organization** (same company, same Timesheet
system and shared code catalog). The data model, SSO login, and Organization concept (ADR-0010) exist
to serve this audience.

**Current operating reality** — each user runs the standalone single-user build (the `.exe`, or the
Docker image) locally in mono-user mode. Multi-user / SSO / shared-Organization is built into the
model but is **not yet the live deployment mode**. Data is scoped to a `user_id` from day one so the
single-user reality can grow into the multi-user design without a rewrite (ADR-0007).

## Product Purpose

Walker makes filling the external **Timesheet system** painless. The user tracks real work durations
during the day against the real charge codes (**Timesheet code** + **Activity**); at the end of each
**Timesheet period**, Walker produces a Timesheet-system-shaped matrix plus an aviation-style **entry
checklist**, so re-keying is fast, complete, and error-free. Success = the period's timesheet entered
correctly, with nothing missed or double-entered, at minimal attention cost. Walker **replaces
Clockify** (ADR-0001).

## Positioning

The differentiator is a time tracker **wired natively to the Timesheet system's own code catalog** —
real codes and their activities — so tracking data maps 1:1 onto what the Timesheet system expects at
period end. Generic trackers (Clockify) don't know the charge codes, which is why re-keying is a
chore. Walker adds **virtual codes** for a finer personal breakdown that collapse back to real
Timesheet-system lines on export (ADR-0008).

Deliberate non-goal: Walker **does not automate or scrape the Timesheet system** (ADR-0005). It
outputs a faithful mirror (grid) + checklist and leaves the actual entry, rounding, and daily-total
reconciliation to the user inside the Timesheet system.

## Operating Context

- **Where**: ~99% on the user's work PC, in the browser. Desktop-first; responsive/mobile is a bonus,
  not a priority.
- **Deployment**: standalone `.exe` or Docker image, run locally per user; both auto-run
  `alembic upgrade head` on startup.
- **Rhythm**: an interrupt-driven working day (one-click capture matters); reconciliation happens at
  the close of each Timesheet period.
- **Period schemes**: weekly, semi-monthly (1st–15th / 16th–end, the default), or monthly — user's
  choice in Settings (ADR-0009).
- **Anchoring reference**: the external Timesheet system's "BY CODE" grid (code rows, day columns, one
  duration per cell; weekends greyed, absences pre-filled) — the **Timesheet period view** mirrors it
  so re-keying is a 1:1 visual match.
- **Catalog source**: the **Code catalog** is populated by importing a file exported or generated from
  the Timesheet system; real codes/activities are shared across the Organization.

## Capabilities and Constraints

**Capabilities**

- **Capture-first Timers**: start in one click with no input; the running **Entry** is edited in place
  when re-categorized; state persists server-side and survives a restart (ADR-0006).
- **Entries** record real durations to the minute; all fields (times, duration, imputation,
  description) are editable, including in the grid; uncategorized entries are visually flagged.
- **Timesheet period view**: real durations aggregated per Code × Activity × Day, matching the
  Timesheet system's grid; optional quarter-hour rounding at the enter/view step (ADR-0013).
- **Entry checklist**: tick-as-you-go, line-by-line, so nothing is missed or double-entered.
- **Virtual codes**: user-scoped finer breakdown that resolve to one real code on export (ADR-0008;
  backing is real codes only, ADR-0014).
- **Tasks & kanban**: tasks with markdown descriptions and **user-defined, ordered Statuses**
  (ADR-0011); a Timer can start from a Task in one click.
- **Absences** reflected (not re-entered) in the period view.

**Constraints**

- No rounding and no targets in the tracking data — Walker records real, to-the-minute durations
  (ADR-0005). No progress bars enforcing 8h/day or period totals.
- No Timesheet-system automation (no submit/scrape).
- DB access is engine-agnostic (SQLAlchemy + Alembic); SQLite for the POC, external DBMS later is
  config, not a rewrite (ADR-0004).
- **Ubiquitous language is binding**: use the exact terms in `CONTEXT.md` in code, API, and UI.

**Open product facts** — whether a human **project name** (*libellé*) exists in the real catalog
export or must default to the technical label is unconfirmed pending a catalog sample (backlog
BIZ-002).

## Brand Commitments

- **Name**: Walker.
- **Logo**: a star-badge mark (`frontend/src/components/Logo.tsx`).
- **Personality**: a **subtle western wink** — kept light and professional, surfacing in the logo,
  empty states, and microcopy ("Adios, backlog."…), never a full western skin that would hurt
  information density.
- **UI copy**: English only. Exception: the published docs site (`docs-site/`) is bilingual EN
  (primary) / FR (CHR-010). Timesheet-system codes and labels keep their original wording.
- **UX reference (not a dependency)**: Clockify — always-visible switchable timer, instant start,
  "military" time entry (`1345` → 13:45). Borrow the feel; it is not a data source.

## Evidence on Hand

- Published bilingual user docs site: <https://davidp57.github.io/walker/> (getting started,
  day-to-day guide, self-hosting, catalog import).
- Architectural decisions: `docs/adr/` (0001–0014).
- Ubiquitous-language glossary: `CONTEXT.md`.
- Original UI design brief: `docs/design/handoff.md`.
- Real code catalog is importable from a Timesheet-system export (an internal export query exists
  outside the repo).

Absences future work must **not** fabricate: there are no testimonials, customers, benchmarks,
pricing, or licensing tiers — Walker is a proprietary, single-author POC.

## Product Principles

1. **Capture-first** — starting to track costs one click and zero attention; categorization is always
   deferrable and everything stays editable.
2. **Truthful durations** — record real minutes; never round, target, or enforce totals. Reconciling
   to quarter-hours and 8h/day is the user's job inside the Timesheet system.
3. **Mirror, don't automate** — reproduce the Timesheet system's shape (grid + checklist) so re-keying
   is a 1:1 visual match; never scrape or submit on the user's behalf.
4. **Speak the Timesheet system's language** — track natively against real codes and activities so
   nothing is lost in translation at period end.
5. **The glossary is law** — the `CONTEXT.md` ubiquitous language is the single vocabulary across
   code, API, and UI.

## Accessibility & Inclusion

No formal accessibility standard has been established for the product.

Recorded aspiration (desired, not yet a committed requirement): a **keyboard-only operating mode** for
time entry and Timer management on the tracking screen. The existing "military" time entry already
supports fast keyboard input; extending this to full keyboard operation of the timer and time capture
is a wanted future improvement.
