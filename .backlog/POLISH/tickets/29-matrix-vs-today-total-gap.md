# BIZ-070 — Explain the gap between the "by code" matrix total and the "Today" list total

ID: BIZ-070
Status: ✅ done
Type: feature
Priority: P2

## Decision (2026-07-16)

Option **3 (both)** chosen: surface the delta *and* flag uncategorized entries.

## Delivery

Shipped in [PR #128](https://github.com/davidp57/walker/pull/128) → merged to `develop`. Backend adds
`uncategorized_by_day` to the period aggregation/API; the Review grid shows an amber "Uncategorized"
footer row (per-day + total) reconciling matrix + uncategorized = captured; the incomplete-entry
count and `EntryRow` flag broaden from no-code to also cover coded-but-no-activity ("pick an
activity").

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The **Timesheet period → by code** matrix and the **Today** activity list can show different totals
for the same day, with nothing in the UI explaining why. Real example that surprised the user:

- **Today** list: `Total 8:35`
- **by code** matrix: `DAILY TOTAL 3:58`

The 4:37 difference is entirely made of entries that have a **Timesheet code but no Activity** yet:
two `N9/6208251/010` entries (2:13 + 1:27) and one `N9/6030793/150` entry (0:57).

This is **working as designed**: the matrix mirrors what will be keyed into the Timesheet system,
which requires a `code + activity` pair, so `aggregate_period` deliberately excludes entries without
an activity (`services/period.py` — `if not entry.activity … continue`, ADR-0005 / ADR-0006). The
"Today" list, by contrast, sums every completed entry regardless of categorization.

The behavior is correct; the **silence is the bug**. If it surprised the app's own author, it will
surprise other users: the matrix looks like it's "losing" time with no signal that some entries just
aren't categorized enough to appear yet.

## Options to discuss

Pick one (or a combination) — this is the decision to make before building:

1. **Surface the delta.** Show, near the matrix daily/period total, the captured-but-uncategorized
   remainder — e.g. `3:58 categorized · 4:37 uncategorized` or a small "+4:37 not yet on the matrix"
   note that links to the offending entries.
2. **Flag uncategorized entries.** Mark entries that have a code but no activity (in the Today list
   and/or a dedicated "needs an activity" count), reusing the existing uncategorized-count pattern
   from the UX lot, so the user knows what to finish.
3. **Both** — a delta indicator on the matrix that drills into the list of entries missing an
   activity.

## Acceptance criteria

- [ ] When the "by code" matrix total is lower than the day's captured total, the UI makes the gap
      and its cause (entries missing an activity) visible — no silent discrepancy.
- [ ] The user can get from that signal to the specific entries that need an activity.
- [ ] Exact minutes are unchanged; this is presentation only (no rounding, ADR-0005).
- [ ] Tests cover a day mixing categorized and code-only-no-activity entries: the matrix total, the
      captured total, and the surfaced delta all agree.

## Blocked by

None — but needs a product decision on the option above before implementation.

## Notes

- Captured from `IDEAS.md` (2026-07-15) after the gap surprised the user in real use.
