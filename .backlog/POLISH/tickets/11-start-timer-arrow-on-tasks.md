# BIZ-050 — One-click "Start a timer" arrow on tasks (list + board)

ID: BIZ-050
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Starting a Timer from a Task is inconsistent and slower than the Activity list's resume arrow:

- The **list** view has a ▶ action (BIZ-023) but it **opens the Code picker** to choose the Activity
  — an extra step every time, even when there's nothing to choose.
- The **board (kanban)** view has **no** start action at all — the play arrow is missing on cards.
- By contrast, the Activity list's ▶ (`EntryRow`) resumes a past Entry **in one click**, because that
  Entry already carries an Activity.

The user wants the task arrow to behave like Activity's — one click, immediate — on **both** views.

## What to build

A one-click ▶ that starts a Timer immediately from a Task, with **no picker**, matching the
capture-first Timer (ADR-0006). Description = the Task's title, code = the Task's code. Activity is
resolved without asking:

- Task **without a code** → uncategorized Timer (description only).
- Code with **no** activities → code only.
- Code with **exactly one** activity → that activity is auto-filled.
- Code with **two or more** activities → Activity left empty, categorized later on the running Entry.

**If a Timer is already running**, the click switches: re-tag the running Entry in place when it's an
empty stub, otherwise close it and open a new segment — the same semantics as `resumeEntry` /
`switchTimer`. Reuse that path; drop the picker-based `startTaskTimer` flow (and its
`pendingTaskStart` machinery) for this action.

**Status nudge:** starting from a Task in status `todo` moves it to `in_progress`; any other status
is left untouched (deliberately conservative — a Timer on a `test`/`waiting` task must not regress it).

**Placement**

- **Board card** (`BoardCard`): ▶ at the **top-right of the card head**, mirroring the drag handle on
  the left. Always visible (not hover-only — the board is touch-capable), subtle ghost style, same
  `IconPlay`. Kept separate from the status-move controls at the card foot.
- **List row** (`TasksScreen`): keep the right-hand action, but style it as a proper row-action
  consistent with `EntryRow`'s edit/resume/delete, not a detached floating icon.

**Terminology fix (glossary consistency):** a Task arrow **starts** (no prior tracked work), an Entry
arrow **resumes**. Relabel the Activity list's misnamed button "Resume this task"
(`EntryRow.tsx:249-250`, it acts on an **Entry**, not a Task) to "**Resume this entry**". The task
arrow's tooltip is "Start a timer from this task".

## Acceptance criteria

- [ ] ▶ appears on **both** the list rows and the board cards; clicking it starts a Timer with no
      picker.
- [ ] The started Entry's **description is the Task's title** and its **code is the Task's code**.
- [ ] Activity resolution follows the four cases above (none / code-only / auto-single / deferred).
- [ ] Clicking while a Timer runs switches (re-tag empty stub in place, else close + open new).
- [ ] A `todo` task moves to `in_progress` on start; other statuses are unchanged.
- [ ] Board card ▶ is top-right, always visible, doesn't interfere with drag, open, or move controls;
      works in both themes and on touch.
- [ ] The Activity list button reads "Resume this entry" (no longer "Resume this task").
- [ ] Frontend tests cover the four activity cases, the running-Timer switch, and the `todo` nudge.

## Blocked by

None.
