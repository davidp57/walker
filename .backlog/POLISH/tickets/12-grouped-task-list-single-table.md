# BIZ-051 — Grouped task list as a single table with section rows

ID: BIZ-051
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

In the list view, grouping (by Project/code, status, priority, due) renders **one independent
`<table>` per group** (`TasksScreen`, `groups.map(... <table>)`). Each table sizes its columns on its
own content, so the columns **don't line up from one group to the next** — Title/Status/Code shift
group to group, and the row action floats far to the right. The grouped list reads as broken rather
than grouped. In *group by Project* the Code column is also redundant with the group header.

## What to build

Render the grouped list as a **single `<table>`** whose groups are **section header rows** (a
full-width header row per group, e.g. a `<tr>` with a spanning `<th>/<td>`), instead of N separate
tables. One table = one set of column widths, so columns stay **aligned** across all groups. Applies
to every group-by mode, not just code.

- Keep the existing per-group ordering and the group labels.
- When grouping **by Project (code)**, drop the now-redundant Code column (the code is the section
  header). Other group-by modes keep the Code column.
- The row action column (BIZ-050's ▶) stays a normal trailing column and inherits the aligned widths.

## Acceptance criteria

- [ ] Grouped list renders as a single table with section header rows; columns are aligned across all
      groups (no group-to-group column drift).
- [ ] Works for all group-by modes (none, code, status, priority, due).
- [ ] Grouping by Project (code) hides the redundant Code column; other modes keep it.
- [ ] Ungrouped (group by none) still renders correctly.
- [ ] Frontend test asserts a single table (not one per group) and the code-column omission when
      grouped by code.

## Blocked by

None. (Independent of BIZ-050, though both touch `TasksScreen`.)
