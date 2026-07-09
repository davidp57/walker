# Walker v1.4.0

**Two headline improvements land together: a workflow you can shape yourself, and smoother code
management — plus a round of everyday UX polish.**

## Make the workflow your own

- **User-defined task states / kanban columns.** Task statuses are no longer a fixed five. Add,
  rename, reorder, and delete your own columns straight from the kanban. The first column is your
  starting state and the last is "done" — Walker follows those positions for completing tasks,
  recurrence roll-forward, and the start-timer nudge, so your workflow drives the behaviour. Deleting
  a column that still holds tasks asks where to move them first, and you always keep at least two
  columns.

## Codes: colours and picking, sorted out

- **Automatic, distinct colours.** Every new code (real or virtual) now opens on a colour picked for
  you — at random from a curated 64-colour palette, favouring the least-used colours so sibling codes
  stay visually distinct. A rich colour picker lets you re-roll, pick from the grid (used colours are
  marked and named on hover), or set any custom colour.
- **One consistent code search everywhere.** Categorizing an entry, setting a task's code, and now
  choosing a virtual code's backing code all use the same searchable picker — results grouped (your
  codes, then the reference catalog) and sorted by name. Activating a code from the reference catalog
  now opens the code editor, so you give it a colour as you add it.

## Everyday polish

- **Start a timer from a task in one click** — from both the list and the board.
- **Your view preferences stick** — task view / group / sort, period mode, and the collapsed-Done
  state are remembered per user.
- **Overlapping entries are flagged** with a one-click trim to fix them.
- **The grouped task list** renders as a single, aligned table.
- **Edit the running entry inline**, and the Timer's description now looks like the field it is.
- **Changing the running Timer's code** edits the entry in place instead of starting a new one.
- **Open links in a task description** with Cmd/Ctrl+click.
- **A day's entries** are listed newest-first.
- **Form modals** no longer close when you click outside them — only ✕ / Cancel / Save dismiss them.

## Fixed

- Broken links on the documentation site (`/Walker/` → `/walker/`).

## Upgrading

This release includes a **database migration** (task status moves from a fixed enum to a per-user
state list). Run `alembic upgrade head` after updating. It's backwards-compatible with your data —
existing task statuses stay valid and no task is rewritten.

## Thanks

Thanks to Julien for his suggestions.
