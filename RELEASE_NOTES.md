# Walker 1.10.0 — no more silent losses, and a picker that knows your day

Two of this release's four changes were **data losses that left no trace**: a Timesheet code you had just
set could be wiped when you pressed Stop, and Tasks set to recur relative to the Timesheet period never
came due at all. Both are fixed. Alongside them, the code picker now learns from your own history and
offers what you usually work on at this hour, and the Tasks list stops showing finished work.

Upgrading is drop-in — no database migration, no new configuration, no change to any existing endpoint —
but **read "Before you upgrade"**: one default changes what you see, and existing recurring Tasks need
one manual save.

## Highlights

- **Nothing you categorize gets thrown away any more.** The running entry now owns its own code and
  activity, so no surface can quietly overwrite what another one set.
- **Period-relative recurring Tasks work at all**, for the first time — they used to be inert.
- **The code picker proposes your habits**: the pairs you actually use at this hour, on this kind of day.

## Before you upgrade

- **Finished Tasks disappear from the Tasks list on first launch.** That is the new default. The
  `✓ Done (N)` toggle on the toolbar brings them back, and the count is there so nothing ever looks as
  though it vanished. Your choice is remembered per user.
- **Recurring Tasks created before this version keep their missing due date.** The fix seeds a date when
  a rule is *set*, so an old rule that never got one stays empty: open each affected Task and save it
  once, and it takes its date. There is deliberately no data migration — it would have to invent a
  reference date for rules created on an unknown day.
- **The new "Likely at this time" band starts out empty.** It needs at least one well-aligned day in the
  preceding 8 weeks before it says anything. Silence on a fresh install is the design, not a fault.

## Fixed

- **Setting the code of the running entry no longer gets lost.** Categorizing the running entry from the
  Activity list left the Timer chip reading "Uncategorized", and pressing **Stop** then wiped the code
  back to nothing — so real, tracked work silently vanished from the Timesheet period matrix. The running
  entry is now the single source of truth for its own categorization: every surface that can set it
  reaches the Timer chip, and closing the segment can no longer overwrite it.

  The report covered the Activity list; the same loss reached **Complete**, inline edits on the running
  row, and the full entry editor. All are fixed together. A code picked *before* Start is now applied to
  the new entry immediately, and a failure to save it is reported instead of passing silently. The
  description keeps its own rule — what you type on the Timer bar wins — but a comment written from
  another surface is no longer blanked.

- **Tasks that recur relative to the Timesheet period now actually come due.** The feature was inert:
  setting such a rule never gave the Task a due date, and since a recurrence only advances when a Task is
  completed, a Task that never came due was never completed. A rule now gets its first due date the
  moment it is set, landing **in the current period** when that date is still ahead — including today,
  which is precisely the case that was reported.

  Two further corrections came with it: the date is computed against **your** Timesheet-period scheme
  rather than always the semi-monthly one (weekly and monthly users were getting dates from a period they
  don't use), and adding a rule to an existing Task seeds a date too. Offsets still snap to working days,
  stepping over both weekends and Absences; an explicit due date is never overwritten.

## New

- **Likely codes in the code picker.** A "Likely at this time" band above the picker's list offers the
  (Timesheet code, Activity) pairs you usually work on *at this hour, on this kind of day*, scored from
  your own past Entries over the preceding 8 weeks.

  The list below keeps its alphabetical ordering — the band is a layer on top, never a re-sort — so a
  wrong guess costs a glance instead of hiding the code you came for. It stays silent when nothing looks
  like a habit, and disappears as soon as you type a search, since by then you have said what you want.
  The moment it ranks against follows the context: "now" from the Timer, and the start time you just
  typed when adding or editing an entry. The day being categorized is excluded from its own evidence, so
  what you just finished never sits at the top.

  New endpoint: `GET /api/codes/likely`. Additive — nothing existing changes.

- **The Tasks list keeps finished work out of the way.** Tasks in the final state no longer sit in the
  middle of what still has to be done. The `✓ Done (N)` toggle reveals them, and when everything is
  finished the list says so and reports how many are hidden rather than looking empty. The kanban is
  unchanged — there the Done column collapses instead.

## Notes worth keeping

- **ADR-0015 draws a line that matters more than the feature it justifies.** Walker may **suggest a
  display order**; it never fills anything in for you, and it never shows a confidence figure or a
  percentage. The scoring is four documented constants — no model, no training, no dependency anyone
  would have to debug. The seven rejected alternatives are recorded with their reasons, including why the
  band is not a re-sort and why the score is a sum rather than an average. Read it before "improving"
  this area.
- **One ticket is deliberately left open.** BIZ-084 will make the number of band rows configurable (0
  disabling it). It is waiting on a few days of real use, so that the default of 5 is chosen from
  experience rather than guessed. That is not an oversight.

## Upgrading

Drop-in. No database migration, no API or configuration change. Replace the image (or the `.exe`) and
your existing data carries over unchanged — subject to the two caveats in "Before you upgrade".
