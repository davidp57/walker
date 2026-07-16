# Walker v1.7.0

**Faster code entry, a more honest Timesheet period.** This release makes picking codes quick even
with a long catalog, and makes the by-code view reconcile to the time you actually tracked.

## Highlights

### Fuzzy code search, everywhere
- Type the way you think — `HRHUB` finds **HR Hub**, `developpement` finds **Développement**, and a
  bare number fragment finds the full code. Case, accents, spaces, and punctuation are all ignored.
- Applies to **your own codes** (the Code catalog screen and every code picker) *and* to the
  **reference catalog** search.
- On the **Code catalog** screen the search box now filters your displayed list of codes in place
  (not just the "add from reference" suggestions), and every code list is sorted alphabetically.

### The Timesheet period no longer under-reports in silence
The **by-code** matrix only counts entries that are fully categorized (code **+** activity) — that's
what the Timesheet system needs. Time tracked without a code or activity used to vanish from the
matrix total with no explanation. Now:
- the **Review** grid shows an amber **"Uncategorized"** footer row (per day and for the period), so
  the matrix total plus the uncategorized time reconciles to your captured total;
- entries that have a code but **no activity** are flagged ("⚑ pick an activity"), and the
  incomplete-entry count now includes them — so nothing is left half-categorized before the period
  closes.

### Overlap detection covers the running timer
A completed entry that overlaps the **currently running** timer is now flagged, with a one-click trim
on the completed entry. The running timer itself stays read-only.

### Easier timer start-time edit
Click **anywhere on the running clock** to correct its start time — no longer just the small "since"
line.

### Add-able reference suggestions only
Reference-catalog suggestions now exclude codes already in your catalog **on the server side**, so
every suggestion you see is genuinely one you can add — and the result limit is never spent on codes
you already have.

## Upgrade notes
- **No breaking changes.**
- **Database migration** (revision `c2d3e4f5a6b7`): adds a normalized search key
  (`reference_codes.search_blob`) and backfills existing rows. The standalone `walker.exe` applies it
  automatically on startup; other deployments run `alembic upgrade head`. Reversible (the downgrade
  drops the column).
- New additive API field `uncategorized_by_day` on `GET /api/period/{date}`.
