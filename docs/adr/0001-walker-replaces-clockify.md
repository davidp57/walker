# Walker is a standalone tracker; it does not build on Clockify

Walker's goal is to make filling the timesheet system painless every fortnight. Re-keying is a chore
because Clockify doesn't know the real timesheet codes / activities: you track against Clockify
projects, then remap everything by hand into the timesheet system.

We chose to **replace Clockify** with an in-house tracker that tracks time directly against the
timesheet catalog (Code + Activity), rather than **layering Walker on top of Clockify** (reading
entries via the Clockify API then mapping). This way imputation happens **as you track, inside Walker**
(on the fly or shortly after — entries are editable, see ADR-0006), not as an end-of-fortnight remap;
the Timesheet then follows mechanically.

## Considered Options

- **Layer on Clockify (rejected)**: Walker reads Clockify entries via the API and maps them to
  timesheet codes. Rejected because the mapping stays an end-of-fortnight chore and Clockify can't carry the
  Code + Activity structure; we'd keep two sources of truth.
- **Standalone tracker (chosen)**: more upfront work (re-implement tracking and timers), but
  imputation becomes native and there's no more remapping.

## Consequences

- Walker must re-implement the Clockify UX qualities that matter to the user: **switchable timer**
  (change code/description without stopping the clock) and **military time entry** (`1345` → 13:45).
- Walker must hold the **timesheet code / activity catalog** locally (source TBD).
- Daily tracking becomes Walker's responsibility: availability, data persistence, fast startup.
