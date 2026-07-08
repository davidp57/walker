# BIZ-047 — Explain the Review vs Enter modes in the Timesheet period view

ID: BIZ-047
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Timesheet period view has two modes — **Review** ("by code") and **Enter in the timesheet
system** — and their row sets differ because virtual codes appear as their own rows in Review but
resolve to their backing real code in Enter (ADR-0008). A first-time user has no cue why the two
views look different.

## What to build

Surface a one-line explanation of the two modes near the Review/Enter toggle (a helper line or a
tooltip/`title` on the toggle), in the spirit of:

- **Review** — "your time by the code you tracked on (virtual codes shown as their own rows)".
- **Enter** — "organized exactly as the timesheet system expects (virtual codes resolved to their
  real code)".

Keep it lightweight — one short line/tooltip, bilingual-neutral English copy, matching the existing
subheading style under the screen title. No new component or interaction beyond showing the text.

## Acceptance criteria

- [ ] The Review/Enter toggle carries a short explanation of what each mode shows (visible helper
      line and/or accessible `title`/tooltip).
- [ ] Copy makes clear Review is by tracked code (virtual rows) and Enter resolves to the real code.
- [ ] No change to the grid behavior itself.
- [ ] Frontend test asserts the explanatory copy is present.

## Blocked by

None.
