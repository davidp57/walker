# Switch blocks — PRD

Status: ✅ done
Lot: SWITCH
Branch: feature/\* per ticket → PR → develop

## Problem Statement

Changing what you are working on is Walker's most frequent gesture, and its most expensive one.
Today it costs a Stop, then the code picker (a modal), then a search or a scroll through 200+ codes,
then an activity — for a destination that, most days, is one of the same four projects.

Every other "resume" affordance answers a different question. The description dropdown (BIZ-009)
answers "what was I doing", keyed on text. The likely-codes band (BIZ-083) answers "which code, at
this hour" — but only once the picker is already open, which is precisely the modal we are trying to
skip. Starting a Timer from a Task (BIZ-050) is one click, but a Task is a thing that *finishes*: a
project you switch onto ten times a day would either pollute the kanban with immortal cards, or not
be there at all.

What is missing is a destination list: the handful of codes you actually move between, visible on
the Timer bar, one click away.

## Solution

A row of **Switch blocks** on the Timer bar, beside the Timer chip. One block = one **code** (colour
dot + name); a plain click switches the Timer onto it. Codes with several activities reveal the rest
in a hover/focus menu, the click defaulting to the ranked one.

The band's contents are computed server-side by composing two sources, and the reasoning behind that
composition — including where it deliberately departs from ADR-0015 — is **ADR-0016**. In short:

- **Selection** by the ADR-0015 habit ranking, so the band follows the time of day.
- **Fill** by plain recency, so it is *always full*: a band with holes wastes the width it takes, and
  the habit threshold is silent exactly when a user is new or back from leave.
- Pairs **collapse to codes**; the ranked activity becomes the block's default.
- Sorted by **code name**, never by score: contents may follow the hour, positions may not — a block
  is clicked by position, and a band that reshuffles mis-imputes time.
- The **running code is excluded** — it already sits on the bar as the Timer chip.
- Capped by `switch_count` (default 4, `0` removes the band), reduced further by available width.

Switching reuses the existing split rule (`shouldRetagInPlace`): an empty capture stub is re-tagged
in place, real work is closed and a new segment opens. A description typed but not yet saved goes
onto the segment that closes, as Stop does.

## Tickets

| ID | Ticket | Priority |
| --- | --- | --- |
| BIZ-093 | [Switch blocks on the Timer bar](tickets/01-switch-blocks.md) | P2 |

## Out of Scope

- **Pinned blocks.** Considered and dropped: the point is that the band adapts to the time of day.
  Stability is bought by the name sort instead, not by freezing the contents.
- **Keyboard shortcuts (`Alt+1..9`).** The band's contents follow the hour and its length follows the
  window width, so a positional shortcut would impute onto a different code depending on how the
  window is sized — an error nobody would notice until the end of the period.
- **A description on a block.** A block carries a code and an activity; the comment is what you type
  afterwards (ADR-0006). Inheriting a stale description costs a deletion instead of saving a keystroke.
- **Changing activity on the running code from the band.** The running code has no block; that goes
  through the picker (see ADR-0016 for the trade-off).
- **Showing the score, or exposing the model's constants.** Unchanged from ADR-0015.
