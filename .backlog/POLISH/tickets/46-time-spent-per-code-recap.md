# BIZ-089 — "How much time did you spend on X?": per-code totals over a date range

ID: BIZ-089
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Walker captures every minute against a code but cannot answer the one question people actually ask out
loud: *"how much time did you spend on X?"*. Every existing aggregation is bound to a **Timesheet
period**: `aggregate_period` derives its window from `period_bounds(scheme, on)` and shapes the result as
the Code × Activity × Day matrix the Timesheet system wants. There is no total for one code over an
arbitrary span, and no way to ask across periods at all.

`GET /entries?from=&to=` returns the raw entries for a range but has no code filter and no aggregation, so
answering the question today means exporting and summing by hand.

## Solution

- A service that sums minutes **per code over an arbitrary `[start, end]`**, broken down per activity
  (the second level of the two-level aggregation is where the answer usually lives — "12h on N9/…, of
  which 8h on Build"), plus the entry count and the number of distinct days worked.
- Virtual codes report **on their own identity**, not collapsed into their backing real code:
  `resolve_to_real_codes` exists specifically for the Timesheet-system-facing view, and this is the
  opposite use case — the user asks about the fine-grained thing they named (ADR-0008). A real code should
  additionally be able to report its virtual children's time as a roll-up, since "time on this project"
  legitimately means both things depending on who's asking.
- Running entries are excluded from the total, consistently with `aggregate_period` — but the UI says so
  when one is running on the code being asked about, rather than silently under-reporting.
- **Placement: the Code catalog**, on the code itself. The question is always asked *about a code*, and
  that's where the code lives; putting it on the Enter/Review screen would tie it back to a period, which
  is exactly the constraint being removed. This also gives the catalog the one thing it lacks — a reason
  to be more than a list (see the open question in `IDEAS.md` about form-width for a 28+ row ledger).
- **Date filter** with a few presets covering how the question is actually asked (current period, this
  month, this year, all time) plus an explicit custom range. All-time matters: "how much have I *ever*
  spent on this" is the most common form of the question and needs no date input at all.
- No rounding, no targets (ADR-0005): real minutes, formatted as hours + minutes.

## Acceptance criteria

- [ ] Given a code and a date range, the API returns total minutes, a per-activity breakdown, the entry
      count, and the number of distinct days.
- [ ] The range is arbitrary — it may span several Timesheet periods, or none completely — and an
      all-time query needs no dates.
- [ ] A virtual code reports its own time; a real code can report its own **and** a roll-up including its
      virtual children, and the two numbers are labelled distinctly enough not to be confused.
- [ ] Running entries are excluded, and the UI says a timer is running on this code when one is.
- [ ] Totals are exact to the minute — no quarter-hour rounding anywhere on this path (ADR-0005).
- [ ] Reachable from the Code catalog in one interaction from the code, with the date filter visible
      rather than buried.
- [ ] Empty result reads as "no time recorded in this range" and distinguishes that from "no time ever".
- [ ] Accessible: the range control is labelled and keyboard-operable; totals are text, not colour or bar
      length alone (the proportion bars of BIZ-042 may accompany them, not replace them).
- [ ] Quality gate clean both sides.

## Blocked by

None.
