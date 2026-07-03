# TEC-001 — Running-Timer elapsed correct across midnight

ID: TEC-001
Status: ⬜ ready
Type: tech
Priority: P3

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Compute the running Timer's elapsed time from the **Entry's real start**, not from local midnight, so a
Timer left running across midnight (or whose start is not "today") shows a correct, non-negative
elapsed value. This is a robustness fix for the always-on timer promise.

## Acceptance criteria

- [ ] Elapsed is derived from the Entry's actual start timestamp and is correct intraday.
- [ ] A Timer started before midnight shows correct elapsed after midnight (no negative or inflated value).
- [ ] A frontend test with a deterministic clock covers a midnight-crossing case.

## Blocked by

None — can start immediately.
