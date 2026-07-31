# Likely codes — PRD

Status: ⬜ ready
Lot: HABITS
Branch: feature/* per ticket → PR → develop

## Problem Statement

The code picker's Tier 1 lists the user's codes name-sorted (BIZ-049). On a real catalog that is 200+
rows, so every categorization means scrolling or typing a query — even though the answer is highly
predictable: at 9am on a Wednesday there are two or three pairs it realistically is. Walker holds all
the evidence needed to know that (every past Entry has a date, a start minute, a code and an activity)
and uses none of it.

The existing description dropdown covers "resume what I was doing" (recency over descriptions). It
does not cover "which code, at this hour, on this kind of day".

## Solution

Rank **(Timesheet code, Activity) pairs** by a contextual habit score over the user's own past
Entries, and show the top ones in a **band above** the picker's Tier 1 list — the list itself stays
name-sorted. Full model, rationale and rejected alternatives in **ADR-0015**; in short:

- One vote per past **day**, worth that day's best-matching Entry.
- Vote = Gaussian on start-minute distance (σ = 90 min) × weekday factor (1.0 same weekday, 0.35
  another workday, 0 across the workday boundary).
- Evidence = closed Entries with code + activity, in the 8 weeks **preceding the context date,
  excluding the context day** — so what you just finished never tops the band.
- Shown only above a score of 1.0, capped at `likely_count` (default 5, 0 disables). No percentage is
  ever displayed.

The temporal context is an explicit parameter, so the same model serves the Timer ("now"),
categorizing an Entry, and manual add ("the start time you just typed").

## Tickets

| ID | Ticket | Priority |
| --- | --- | --- |
| BIZ-083 | [Likely-codes band in the code picker](tickets/01-likely-codes-band-in-picker.md) | P2 |
| BIZ-084 | [Configurable number of likely codes](tickets/02-configurable-likely-count.md) | P2 |

## Out of Scope

- **Re-sorting Tier 1** by score — explicitly rejected (ADR-0015): a wrong sort hides the code you
  came for, a wrong band costs a glance.
- **Any learned model, and any exposed model constant.** σ, the weekday weight, the window and the
  threshold stay hardcoded in one commented block; only the row count is user-facing.
- **Displaying a probability or confidence.** The score is a ranking device and is not calibrated.
- **Pre-filling anything.** The band changes display order only; the user always clicks.
- **The `codeOnly` / `realOnly` picker modes** (a Task's code, a virtual code's backing) — those are
  configuration decisions, not moments in a day.
- **Live re-ranking while typing a start time** — the band is computed when the picker opens.
