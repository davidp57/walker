# BIZ-037 — Searchable/creatable code selection everywhere a code is picked

ID: BIZ-037
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot PROJECTS — `.backlog/PROJECTS/PRD.md`.

## What to build

Make every code-selection surface use the rich `CodePicker` (search + create real code + create
virtual code + add-from-reference), instead of a plain `<select>` limited to active codes.

**Primary gap — the Task editor** (`components/TaskPanel.tsx`):

- Replace the `Timesheet code` `<select>` (the `wk-task-code-select` control) with a trigger that
  opens `CodePicker`, showing the currently-selected code (or "No code (orphan task)").
- Keep the "No code (orphan task)" option (a task may have no code) — expose it as a clear action in
  the picker flow (e.g. a "No code" choice), so a task can be un-assigned.
- Wire the four on-the-fly hooks from the task context the same way `App.tsx` wires them for
  entries: `onCreateNew`, `onCreateNewVirtual`, `onSearchReference`, `onAddFromReference`.

**CodePicker — add a code-only mode** (`components/CodePicker.tsx`):

- Today `onPick(codeId, activity)` requires an activity. Tasks have no activity, so add a mode that
  selects a **code only**: clicking a code result picks it immediately (no activity buttons). Keep
  the existing code+activity behavior for the entry flow unchanged.
- The search, reference-catalog search, and both create buttons behave identically in both modes.

## Out of scope

- `VirtualCodeEditor`'s "Real code" `<select>`: it selects the real code that *backs* a virtual code
  being defined — offering "create a code" there is circular. Left as a plain select.

## Acceptance criteria

- [ ] Opening a task's code selector shows the searchable `CodePicker`; typing filters by number,
      name, label.
- [ ] From the task code picker, creating a new real code and creating a new virtual code both work
      and assign the created code to the task (same handlers as the entry flow).
- [ ] A reference-catalog code not yet active can be added on the fly and assigned to the task.
- [ ] "No code (orphan task)" is still reachable — a task can be set back to no code.
- [ ] `CodePicker` in code-only mode picks on a single click with no activity step; the entry flow's
      code+activity behavior is unchanged.
- [ ] Frontend tests cover: task code chosen via the picker, create-real and create-virtual from the
      task context, and the code-only single-click pick.

## Blocked by

None — can start immediately. Independent of BIZ-036.
