# Switch blocks: a band that is always full, ordered by name, and code-shaped

ADR-0015 gave Walker a habit model that ranks (Timesheet code, Activity) pairs by time of day, and
put it in the code picker as a band the user *reads* before choosing. BIZ-093 puts a second surface
on the same model: a row of one-click blocks on the Timer bar, so switching task no longer opens a
modal at all.

The two surfaces look alike and are not. A picker band is read; a block is clicked, often by
position, sometimes without reading past the colour. That difference overturns three of ADR-0015's
conclusions, and each reversal needs to be written down or a future reader will "fix" it back.

**Decision.** The Switch blocks are computed by a dedicated service that **composes** two sources and
reshapes the result:

- **Selection** — the ADR-0015 ranking picks *which* codes deserve a block. Same model, same
  constants, no fork.
- **Fill** — when the habit threshold (`MIN_SCORE`) leaves the band short, it is topped up with the
  user's **most recently used** pairs, unwindowed. The band is therefore **always full**, up to
  `switch_count` and to what the bar's width allows.
- **Shape** — ranked pairs **collapse to codes**: a block is a code (colour dot + name), the ranked
  activity becomes what a plain click starts, and the code's other activities live in a menu opened
  by hover or keyboard focus.
- **Order** — sorted by **code name**, never by score.
- **Exclusion** — the **running code has no block**.
- The same catalog exclusions as the picker apply throughout (no `backing_only`, no `obsolete`, no
  activity absent from the current catalog): a block must never start a Timer on something the picker
  would refuse.

## Why the band is always full, when ADR-0015 says a band should stay quiet

ADR-0015 is explicit that a band which says nothing when it knows nothing is a band you can trust,
and that is right *for a band above a list*: it costs a line, the list underneath answers anyway, and
a shy band never sends you down a wrong row.

A block row is not above anything. It occupies horizontal space on the app's busiest bar whether or
not it has something to say, and it is the whole point of the feature — an empty row is a feature
that does not exist. Worse, `MIN_SCORE` is silent exactly when the user most needs a shortcut and
least knows the app: a fresh install, the first week, a return from three weeks of leave.

So the threshold keeps its meaning where it was designed to have one (does this qualify as a
*habit*?) and stops being the gate for what is merely a *destination list*. The two sources stay
distinguishable in the code, and only in the code: the UI does not mark filler blocks as
second-class. A block good enough to be one click away is good enough not to apologise for itself,
and a visual distinction would only invite the user to reason about a ranking model they cannot see.

## Why sorted by name, when the whole point is that it follows the hour

ADR-0015 rejected re-sorting Tier 1 by score because alphabetical order is *stable*. The same
argument applies harder here, and cuts in a different place: a block is a click target, so its
**position** is part of how it is used. If the band were score-ordered, two codes swapping rank at
midday would swap places under a cursor that is already moving, and the cost is not a missed glance —
it is time imputed to the wrong charge code, discovered (if ever) at the end of the period.

Splitting the two effects keeps what is worth keeping: the ranking decides **what** is in the band
(which is where the hour matters), the name sort decides **where** each block sits (where the hour
must not matter). Entering and leaving the band still moves things, but only when the set itself
changes, not on every re-rank.

## Why a block is a code, not a pair

The picker's band lists pairs because it is a vertical list with room for a two-line row. A block row
is horizontal and competes for the Timer bar's width, so two blocks reading "Paper V4 · Bug fixing"
and "Paper V4 · Change request" would be near-identical at a glance, and each of them narrower than
the code name they truncate. Collapsing to codes makes the common case one click and the rarer case
(the same project, another activity) one hover.

The consequence is that the click has to pick an activity by itself: it takes the one the model
ranked. That is the only defensible default — it is the pair the evidence is actually about — and it
is why the block still carries an activity even though it does not show one.

## Considered options

- **Pinned blocks, chosen by the user (rejected).** The stable option, and the one that makes
  positional clicking safest. Rejected because it turns a feature Walker can derive from data into a
  configuration screen, and because the pins would then need maintaining — the mission you pinned in
  March keeps its slot in July. The name sort recovers most of the stability at none of the cost.
- **Score order, frozen while a Timer runs (rejected).** Removes the reshuffle at the moment it is
  most dangerous, but the band would then change under the user at the exact moment they stop — and
  "it reorders, but only sometimes" is a rule nobody can hold in their head.
- **Fill with the ranking's own sub-threshold results (rejected).** Cheaper: drop `MIN_SCORE` and
  reuse one model. Rejected because it would make ADR-0015's threshold dead code by side effect,
  taking the picker's guarantee down with it. Recency is also the one thing a user can predict
  without knowing anything about the model.
- **Keep the running code, with its other activities in the menu (rejected).** Tempting: it keeps
  positions stable across a switch, and it makes "same project, other activity" a one-hover gesture.
  Rejected because the running code is already on the bar as the Timer chip, a few pixels from where
  its block would sit — the same code twice, side by side, one of them lying about being a
  destination. The cost is real and accepted: changing activity within the running code goes through
  the picker, and every switch shifts the remaining blocks by one slot.

## Consequences

- A new web-independent service (`services/switch_targets.py`) and a new endpoint
  (`GET /api/codes/switch-targets`). `services/likely_codes.py` and `/api/codes/likely` are untouched,
  so the picker's guarantees are exactly as ADR-0015 left them.
- `switch_count` is a **separate** preference from `likely_count`: the surfaces have different
  geometry, and each needs its own off switch (`0` on either must not silence the other).
- The Timer bar becomes variable-height. Layout priority is: chip/clock/buttons never yield, blocks
  yield next, and the description field yields first by dropping onto a row of its own — a decision
  about what the bar is *for*, and it says the bar is for switching.
- The band ages on a slow tick of its own, because the Timer's second-by-second clock only runs while
  a Timer runs and the blocks must keep following the hour while the app sits idle.
- The recency fill reads all of the user's history rather than an 8-week window; on a personal SQLite
  database this is a grouped query over a few thousand rows, and the alternative (a window) reproduces
  the very blindness the fill exists to cure.
