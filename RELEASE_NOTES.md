# Walker v1.5.0

**Headline:** task **due dates** are now visible and alert you when they arrive, the documentation
site is **one click away**, the Enter view can **round to the quarter-hour** for you, and adding a
forgotten entry or spotting hand-entered time is faster.

## Highlights

### Due dates you can actually see — and that remind you
- Due dates now show as **glanceable relative labels** (`Today`, `Tomorrow`, `in 3d`, `3d overdue`)
  in the task list **and** on the kanban cards (which showed none before). Hover for the exact date.
- A **count badge** on the Tasks nav item (sidebar + phone tab bar) shows how many tasks are overdue
  or due today, and a **startup notice** summarises them when you open the app — so a deadline never
  slips by just because you weren't on the Tasks screen. Done tasks are never flagged.

### One-click access to the documentation
- A global **Help** link in the navigation (sidebar and phone tab bar) opens the documentation site,
  alongside the existing in-context links.

### Optional quarter-hour rounding in "Enter in Timesheet system"
- A per-view **"Round to ¼h"** toggle rounds each day's durations to the quarter-hour, intelligently
  carrying the rounding so the **day's total stays as close as possible to what you really worked**.
  It's **display-only and opt-in** — your real minutes are always kept and shown greyed beside the
  rounded value. Off by default.

### Faster entry, clearer origins
- **Per-day "Add" buttons**: add an entry straight to a given day — in the Activity list (today's is
  always there; other days reveal on hover) and on each day column of the Timesheet period grid — with
  the date already filled in.
- **Manual vs timer entries** are now marked with a subtle ✎ so you can tell hand-entered time from
  timer-tracked time, in the Activity, Timesheet period, and Enter views.

## Upgrade notes
- **Database migration required.** This release adds a column to record each entry's origin
  (timer vs manual). Run `alembic upgrade head` when upgrading. Existing entries are left unmarked
  (their origin is unknown) — the marker applies to entries created from now on.
- No breaking API or behaviour changes. Quarter-hour rounding relaxes the long-standing "Walker does
  no rounding" stance (ADR-0005) with an **opt-in, non-destructive** display option only — the real,
  to-the-minute data remains the system of record (ADR-0013).
