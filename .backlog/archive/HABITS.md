# HABITS — Likely codes: contextual ranking in the code picker (archived)

Status: ✅ done
Branch: feature/\* per ticket → PR → develop

## Summary

The code picker's Tier 1 lists the user's codes name-sorted, which on a prod-shaped catalog is 200+
rows — so every categorization meant a scroll or a typed query, even though the answer is largely
determined by the time of day and the day of the week. Walker held all the evidence (every past Entry
has a date, a start minute, a code and an activity) and used none of it.

HABITS ranks **(Timesheet code, Activity) pairs** by a contextual habit score over the user's own past
Entries and shows the top ones in a **band above** Tier 1. The list itself is never re-sorted — a
wrong band costs a glance, a wrong sort hides the code you came for. The full model and every rejected
alternative are in **ADR-0015**; in short: one vote per past **day** worth that day's best-matching
Entry, a vote being a Gaussian on start-minute distance (σ = 90 min) times a weekday factor (1.0 same
weekday, 0.35 another workday, 0 across the workday boundary), over the 8 weeks preceding the context
day and excluding it.

The temporal context is an explicit parameter, so one model serves three surfaces: the Timer ("now"),
categorizing an Entry, and manual add ("the start time you just typed").

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-083 | Likely-codes band in the code picker | P2 | ✅ done |
| BIZ-084 | Configurable number of likely codes (0 disables) | P2 | ✅ done |

## Key implementation notes

- `services/likely_codes.py` — web-independent. The four model constants (σ, other-workday weight,
  window, threshold) live in one commented block, each with its justification, and are **deliberately
  not settings**: they are internals whose effect a user cannot observe, so a knob would only invite
  untestable fiddling.
- Candidates are intersected with the **live** catalog (code still owned, activity still present), so
  history that outlived a re-import never proposes something the picker cannot select.
- `GET /api/codes/likely?at=<ISO datetime>` → `LikelyCodeRead[]`. The score never crosses the wire:
  it is a ranking device, not a calibrated probability, and ADR-0015 forbids surfacing one.
- `likely_count` (default 5, 0–10, `0` disables) was the first **integer** view preference, so
  `services/settings.py` grew its own validated-int branch alongside the bool and enum ones.
- The band is fetched when the picker opens, not cached across opens, and hidden as soon as a query
  is typed — never rendered as a skeleton, which would make the list below it jump.

## Sequel

**SWITCH** (BIZ-093, ADR-0016) reuses this ranking for a second surface — one-click blocks on the
Timer bar — and deliberately departs from two of ADR-0015's conclusions there: the band is always
full (recency tops it up below `MIN_SCORE`) and it is sorted by name rather than by score, because a
block is *clicked by position* rather than read. See `.backlog/archive/SWITCH.md`.
