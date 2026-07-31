# Contextual "likely codes", surfaced as a band and never as a re-sort

The code picker's Tier 1 lists the user's own codes sorted by name (BIZ-049, ADR-0012). On a
prod-shaped catalog that is 200+ rows, so picking the two or three pairs actually worked on at 9am
means scrolling or typing a query every single time — even though the choice is highly predictable
from the time of day and the day of the week. ADR-0005 rules out automating the Timesheet system and
ADR-0006 defers categorization rather than prompting for it; neither forbids helping the user *find*
a code faster, but introducing a component that **predicts** needs its boundary written down, because
on the face of it it reads as contradicting both.

**Decision.** Walker ranks **(Timesheet code, Activity) pairs** by a **contextual habit score**
computed from the user's own past Entries, and surfaces the top ones in a **band above** the picker's
Tier 1 list. The list itself is **never re-sorted** — it stays name-sorted.

The score of a pair, for a context (weekday, minute-of-day):

- Each past **day** on which the pair was used casts **one vote**, worth that day's **best-matching**
  Entry (not the sum of its Entries).
- A vote is `K_hour × K_day`, where `K_hour` is a Gaussian on the distance between the two start
  minutes (**σ = 90 min**, truncated to 0 beyond ±3σ) and `K_day` is **1.0** on the same weekday,
  **0.35** on another workday, and **0** across the workday / non-workday boundary (using the user's
  configured `workdays`, not a hardcoded Mon–Fri).
- Evidence is Entries that are **closed**, carry **both a code and an activity**, and fall in the
  **8 weeks preceding the context date, excluding the context day itself**. Entry `source`
  (timer vs manual) is ignored.
- A pair is shown only if its score reaches **1.0** — readable as "at least one day where you used
  this pair at almost exactly this time, on this same weekday" — capped at `likely_count`
  (default 5; **0 disables** the band). If nothing reaches the threshold the band is absent.
- **No percentage and no confidence figure is ever displayed.** The score is a ranking device, not a
  calibrated probability, and must not be dressed up as one.

The context is an explicit parameter (`?at=`), so it is "now" from the Timer and "the start time
currently typed" from the entry editor — one model, three surfaces (Timer, categorize, manual add).

## Considered options

- **Re-sort Tier 1 by score (rejected):** the strongest alternative, and the reason for this ADR.
  Alphabetical order is *stable* — you learn where a code sits and it stays there. A probabilistic
  order changes with the hour and the weekday, so the same gesture in the same place stops giving the
  same result. Above all the damage is asymmetric: a band that is wrong costs a glance, whereas a
  wrong sort actively **hides** the code you came for. The band's fallibility is what makes an
  imperfect model acceptable — and with sparse personal data the model *will* be imperfect. A band
  also composes with search trivially (it disappears once a query is typed) instead of having to blend
  "text relevance" with "hourly probability" into one indefensible ordering.
- **Frequency-only or recency-only ranking (rejected):** frequency puts a daily 14:00 meeting on top
  at 9am; recency makes one-off picks jump the queue and duplicates what the description dropdown
  already does. Neither expresses "what do I do *at this hour*", which is the actual regularity.
- **Mean instead of sum (rejected):** dividing by the number of uses answers "when I use this pair, is
  it typically around now?" — which erases frequency, half the useful signal. It is also maximal on
  the *least* data: a training course logged once, one Wednesday at 9:35, scores a perfect 1.00 and
  outranks a pair used twelve times every morning. On a 5-row band that fills the band with rarities.
  The sum already carries both halves (vote count = frequency, vote weight = hour fit).
- **Summing over Entries rather than over days (rejected):** a single choppy day with eight switches
  onto one code would outweigh eight different days of steady habit. One day = one vote makes the unit
  of measurement a *day*, which is what a habit is.
- **An explicit recency decay (rejected):** a `τ` would let a mission that ended five weeks ago fade
  instead of sitting in the window. Rejected on **knob discipline**: this is a single-user app with no
  labelled data and no way to evaluate a constant other than by impression. Every unjustifiable knob
  is one that gets fiddled with forever and adds a dimension to future "it feels wrong" reports. The
  8-week window already *is* the decay, with one number instead of two.
- **A learned model (rejected):** any real classifier here would mean a dependency nobody can debug,
  a training story, and a persistence story — for a 5-row band in a personal app. Four documented
  constants in one module beat that on every axis that matters, including being explainable to the one
  user.
- **Computing client-side (rejected):** the SPA already holds 14 days of Entries, but a weekday-aware
  model needs ~8 weeks — and loading 56 days at startup to feed 5 rows of UI would slow the whole app.
  More importantly this is domain logic (`services/`, web-independent per ADR-0003) and belongs where
  it can be unit-tested: an ordering bug is invisible by eye, since a wrong order still looks
  plausible.

## Consequences

- A new web-independent service `services/likely_codes.py` plus `GET /api/codes/likely?at=…`.
  **No schema migration**: `Entry` already stores `date` + `start_minute` (minutes since midnight —
  exactly the unit the kernel needs), and view preferences are a JSON bag.
- The four constants (σ, the other-workday weight, the window length, the threshold) live in one
  commented block at the top of the service. Tuning is a one-line commit, deliberately **not** a
  settings screen: they are model internals whose effect the user cannot observe. Only the visible
  quantity — how many rows — is user-configurable.
- **Today never feeds today's band.** Excluding the context day is what stops the pair you just
  finished from trivially topping the list (same weekday and a near-identical hour are both automatic),
  kills the self-reinforcing loop of a model measuring its own suggestions, and leaves a full day to
  fix or delete a bad Entry before it ever counts as evidence — which is why no minimum-duration
  filter is needed.
- Candidates are intersected with the **live** catalog (code still among the user's codes, activity
  still on that code): proposing something unpickable is worse than proposing nothing.
- The band is absent while a search query is present, and in the `codeOnly` / `realOnly` picker modes
  (choosing a Task's code, or the real code backing a virtual one) — those are configuration
  decisions, not moments in a day.
- BIZ-049 is **not** reversed: Tier 1 stays name-sorted, and this is a layer above it.
- `likely_count` is the first **integer** view preference (the others are booleans and enums), so
  `_resolve_view_preferences` gains a clamped-int branch.
- The band only ever changes **display order**. It never pre-fills, never assigns, never touches a
  duration — the user still clicks. That is the line this ADR draws against ADR-0005/ADR-0006, and it
  is the line to defend if this is ever extended.
