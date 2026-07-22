# Walker v1.8.0

**Bend your tracked time back to what actually happened.** Two symmetric gestures on entries — carve
a break out of a stretch you left running, or glue two entries back into one — plus a cleaner way to
create virtual codes and a fix to the Code catalog search.

## Highlights

### Insert a break — carve non-worked time out of an entry
Left the timer running through lunch, or stopped it too late? **Punch a hole** in an entry instead of
hand-editing times:
- Pick the break window (start + duration + end, linked — edit any two and the third follows), and
  the entry splits into the worked time around it, exact to the minute.
- On the **running timer**, the part before the break is closed off and the timer keeps running from
  the break end — so you can account for a lunch you took while it was still going.
- The gap is left untracked by default, or given its own entry if you categorize it.
- Reach it three ways: the **Insert a break…** button in the entry editor, the break icon on any
  Activity row, and an action on the running timer.

### Merge — glue two entries back into one
The inverse of a break, right where you'd expect it — next to the **Trim** button on overlapping
entries:
- **Merge** combines two entries of the **same code and activity** into one spanning both.
- It also joins a finished entry with the **running timer** that continued it (adjacent or
  overlapping): the timer survives and simply starts earlier.
- Offered only when there's nothing to lose — matching code and activity.

### Simpler virtual codes — no more duplicate dialog, no clutter
Creating a virtual code backed by a code that isn't in your catalog used to open a second, look-alike
editor and leave an extra real code sitting in your catalog. Now the backing code is created
automatically behind the scenes and **hidden** — it exists only to feed the Timesheet export, never
clutters your catalog or pickers, and is cleaned up when its last virtual code is deleted. Add that
same code explicitly later and it becomes a normal, visible code.

### Code catalog — search no longer hides your codes
On the **Code catalog** screen, typing in the search box used to float the reference-catalog
suggestions on top of your own codes, blocking access to them. The two are now separated: the box
filters your codes in place, and matching reference codes appear as a distinct section **below** the
list.

## Upgrade notes
- **No breaking changes**, no data loss.
- **One additive migration** (`timesheet_codes.backing_only`): existing codes backfill to "not a
  backing code". The standalone `walker.exe` applies it automatically on startup; other deployments
  run `alembic upgrade head`. Reversible (the downgrade drops the column).
- **API additions are additive only** — new `POST /api/entries/{id}/break` and
  `POST /api/entries/{id}/merge` endpoints, and new optional fields (`backing_only` on
  `GET /api/codes`, `as_backing` on `POST /api/codes/from-reference`). Nothing existing changed or was
  removed.
