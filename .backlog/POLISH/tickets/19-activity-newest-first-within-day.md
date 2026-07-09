# BIZ-060 — Activity entries: newest first within each day

ID: BIZ-060
Status: ✅ done
Type: fix
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Activity list orders **days** most-recent-first, but **within** a day the entries are ascending
(oldest at the top) — an inconsistency. The oldest entry should be last, newest first, matching the
"most recent first" reading of the whole list.

## What to build

Sort each day's entries **descending by start** (newest at the top, oldest at the bottom) in
`trackerGroups` (App). The running entry stays pinned to the very top of its day (it's the current
activity), as before.

## Acceptance criteria

- [ ] Within a day group, entries render newest-first (higher start time first).
- [ ] The running entry remains pinned to the top of its day.
- [ ] A frontend test asserts two same-day entries render newest-first.

## Blocked by

None.
