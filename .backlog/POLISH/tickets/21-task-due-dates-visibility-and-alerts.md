# BIZ-062 — Task due dates: make them visible everywhere, and alert when they arrive

ID: BIZ-062
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Task due dates are under-served today:

1. **Not glanceable in the list.** The list view shows a due pill (BIZ-041), but as a **raw ISO
   date** (`{task.dueDate}` → `2026-07-15`, `screens/TasksScreen.tsx`). There's no relative context,
   so "is this soon?" needs mental arithmetic.
2. **Invisible on the kanban.** The board card (`components/TaskBoard.tsx`) renders the priority pill
   but **no due date at all** — a task's deadline is completely hidden in the board view.
3. **No alert when the deadline arrives.** `App.tsx` only passes `dueDate` through. Nothing signals
   that a task is due today or overdue beyond the red list pill — a user not looking at the list has
   no way to know. The terminal-state rule already exists (a task in the last/terminal state is never
   overdue — ADR-0011, `TasksScreen.tsx`).

## Solution

One coherent "due dates" pass across both views plus a proactive, local in-app alert. No push/OS
notifications (Walker is a local web app) and no data-model change.

### 1. Glanceable due formatting (list + kanban)

Introduce one shared helper (e.g. `lib/dueDate.ts`) that turns a `dueDate` + today into a short
relative label and an overdue/soon flag, so the list and the board render due dates identically:

- `Today`, `Tomorrow`, `Yesterday`, `in 3d`, `3d overdue` (keep it terse). Keep the absolute date as
  a `title` tooltip so the exact day is still available on hover.
- Reuse the existing overdue styling (`wk-task-due.is-overdue`) for overdue/due-today; a task in the
  **terminal** state is never flagged overdue (same rule as today).

### 2. Due pill on the kanban card

Add a due pill to the board card in `TaskBoard.tsx`, next to the existing priority pill, shown only
when the task has a due date, using the shared helper + overdue styling.

### 3. Alert when a due date arrives

- **Nav badge** — add a count badge on the **Tasks** nav item (both the sidebar and the phone tab
  bar in `AppShell`), mirroring the existing uncategorized-Entry badge pattern. The count = tasks
  that are **overdue or due today** and **not in the terminal state**. Hidden at zero. This means
  threading a `tasksDueCount` (name TBD) prop into `AppShell`, computed in `App.tsx`.
- **Startup toast** — on app load, if there are any overdue/due-today (non-terminal) tasks, raise one
  info toast via the existing toast system summarising them (e.g. "3 tasks due — 1 overdue, 2 today").
  Fire it **once per app load**, not on every re-render/reload of task data.

## Acceptance criteria

- [ ] List and kanban both show a due date as a short **relative** label (`Today`, `Tomorrow`,
      `in 3d`, `3d overdue`), with the absolute date available on hover (`title`).
- [ ] The kanban card shows a due pill when the task has a due date (none when unset), overdue in red.
- [ ] A task in the terminal state is never styled overdue and never counts toward the alert.
- [ ] The **Tasks** nav item (sidebar + phone tab bar) shows a count badge of overdue/due-today
      (non-terminal) tasks; the badge is hidden when that count is zero.
- [ ] On app load, when at least one task is overdue/due-today, exactly one summary toast is shown;
      no toast when there are none. It does not re-fire on subsequent task reloads within the session.
- [ ] The relative-date helper is unit-tested (today/tomorrow/yesterday/N-days/overdue boundaries).
- [ ] Frontend tests cover: kanban due pill presence/absence + overdue styling; the nav badge count
      (incl. terminal-state exclusion and hidden-at-zero); the startup toast fires once and only when
      due tasks exist.

## Blocked by

None.

## Notes

- Precedent for the nav badge: the uncategorized-Entry badge already wired through `AppShell`
  (`uncategorizedCount`, `data-testid="wk-uncategorized-badge"` / `-tabbar`).
- "Overdue vs due-today" boundary uses the same `today` string comparison already used in
  `TasksScreen.tsx` (`dueGroupLabel`, and the `overdue` computation).
