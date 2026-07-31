# BIZ-087 — Done Tasks clutter the Tasks list: hide them behind a toggle

ID: BIZ-087
Status: 🔄 in-progress
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Tasks list shows every Task, terminal state included, so finished work accumulates in the middle of
what still has to be done. The list is the default view, so this is the first thing seen on the screen.

Nothing existing covers it: the **Focus** filter (BIZ-080) is far narrower — it keeps only
overdue / due-today / high-priority, so it is a triage lens, not "hide what's finished" — and it is
deliberately transient. The kanban has `done_collapsed` for its Done column (BIZ-044); the list has no
equivalent.

## Solution

- The list hides Tasks in the **terminal state** (the last one, ADR-0011 — not a hardcoded "done") by
  default.
- A toggle brings them back, labelled with the count — "Done (12)" — so it never looks as though Tasks
  vanished. The count is what makes hiding safe rather than mysterious.
- Persisted per user in `ViewPreferences` (a new key alongside `done_collapsed`, whose kanban role it
  mirrors), so the choice survives a reload.
- Composes with the existing group-by / sort and with Focus rather than replacing any of them: Focus
  already excludes terminal Tasks, so with Focus on the toggle simply has nothing to add.

## Acceptance criteria

- [x] By default the list shows no terminal-state Tasks; the toggle reveals them with a count.
- [x] The choice is persisted per user (`task_hide_done`, default `true`) and survives a reload.
- [x] "Terminal" resolves through the user's own state list — the existing `terminalId` (last state,
      ADR-0011), no hardcoded status id. Covered by the custom-states test, where the terminal state is
      named `z`/"Shipped".
- [x] Grouping and sorting still behave with the terminal Tasks hidden: the filter is applied *before*
      grouping, so a group that ends up empty is not rendered at all.
- [x] The toggle is accessible: it carries `aria-pressed`, is disabled when there is nothing to reveal,
      and shares the `.wk-task-focus` styling (focus ring, weight + count chip, not colour alone).
- [x] Empty-list case handled: when everything is finished the list says so and reports how many are
      hidden, rather than showing the "no tasks yet" copy and looking broken.
- [x] The board is untouched — its terminal column collapses instead (BIZ-044) — and the toggle is not
      rendered there, nor while Focus is on (which already excludes terminal Tasks).
- [x] Quality gate clean both sides (`ruff`, `mypy`, 359 pytest 95%; `lint`, `format:check`, `build`,
      476 vitest — 7 new cases).
- [x] Verified live on a copy of the real data: `✓ DONE 3` on the toolbar, 3 finished Tasks hidden then
      revealed, the choice persisted server-side and surviving a reload.

## Note on the four tests this changed

Four pre-existing `TasksScreen` tests relied on terminal-state Tasks being listed (status grouping, the
single-table assertion, the custom state order, and "never flags a terminal Task as overdue"). Each now
clicks the toggle first. That is the honest consequence of the new default rather than a regression —
but it is worth knowing that hiding Done by default touches any test that reasons about the full list.

## Blocked by

None.
