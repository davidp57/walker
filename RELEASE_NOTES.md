# Walker 1.12.0 — a forgotten Timer no longer costs you the day

You forget to press Stop. The Timer runs all night. Next morning you stop it — and the day it had been
tracking is gone. Not corrupted-looking, not flagged: the entry reads `10:00 – 09:02`, its duration
reads `0:00`, and the day total counts it as nothing.

That is what happened, in real data, on 20 August. The cause is small and entirely mechanical: stopping
a Timer wrote *the current* time-of-day onto the entry, without ever asking which day the entry belonged
to. On an entry dated yesterday, this morning's 09:02 lands *before* yesterday's 10:00 start — a negative
duration, which every total in the app quietly clamped to zero.

This release closes that hole three times over: such a value can no longer be stored, the Timer knows
which day it belongs to, and when Walker cannot know something it now asks instead of guessing.

## Fixed

- **A Timer left running overnight no longer destroys the day it tracked.** Stopping, switching or
  completing a Timer can no longer stamp a minute from a different day onto its entry. And because
  Walker records real minutes and invents none, it does not paper over the gap with a plausible number:
  an entry closed this way is left at zero minutes and **flagged**, and Walker **asks you** when you
  actually stopped — as a time on the day the Timer was tracking, which is the only answer that can be
  true. You can also discard the entry outright, if the Timer was tracking nothing real, or answer
  later.

  Two things it deliberately does *not* do: split the session across midnight (that would invent a
  night of work) and auto-close it at some end-of-day hour (a fabricated 18:00 is the same lie as a
  fabricated 23:59).

- **An entry that ends before it starts is now impossible to store.** Every duration in Walker is
  `end - start`; that this is positive was assumed everywhere and guaranteed nowhere. It is now a
  database constraint, and the API rejects such a span outright rather than writing a row no view can
  render honestly. That includes the subtler case: moving only an entry's *start* past its fixed end is
  refused just like moving the end back.

- **Walker left open across midnight now notices the new day.** "Today" was read once, when the page
  loaded. So a Walker left open overnight went on believing it was yesterday — it kept loading
  yesterday's window of entries, labelled `Today` / `Yesterday` one day off, and a day group's `+ Add`
  filed new entries under the wrong date. The day rolls over on its own now, with no reload. This is
  also what makes the fix above reachable: the case that loses a day is precisely the case where the
  interface's idea of "today" was stale.

- **A zero-duration Timer entry says so.** It used to read `0:00`, indistinguishable from a rounding
  artefact. It is now flagged as unfinished business until you give it a real end time. Hand-entered
  entries are left alone — a manual zero is a deliberate placeholder.

## Notes worth keeping

- **The migration repairs before it constrains, and it will touch one of your rows.** Adding the
  constraint first would fail on exactly the databases that need it, so any entry ending before it
  starts is first brought back to a zero duration. Concretely: the 20 August row (`10:00 → 09:02`)
  becomes `10:00 → 10:00`, flagged "no duration". If you have already re-entered that day by hand, the
  row is a partial duplicate and can be deleted from the Activity view.

- **Why ask rather than guess.** Walker's contract is to record what actually happened to the minute and
  leave the rounding to you (ADR-0005). A Timer that ran for 23 hours holds no information about when
  you stopped working — so any automatic answer is a fabrication, and the honest options are "ask" or
  "leave it visibly empty". Walker now does both, in that order.

## Upgrading

Replace the image (or the `.exe`); your data carries over. The schema migration runs on startup and is
the one behaviour change to be aware of — see the note above about the row it repairs.

One API contract change, for anyone driving `/api` directly: `POST /api/entries` and
`PATCH /api/entries/{id}` now answer **422** when the resulting span would end before it starts, where
such a write was previously accepted. Nothing in the interface ever sent one.
