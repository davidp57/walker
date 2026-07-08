# BIZ-040 — De-noise the empty "Add a description…" placeholder in the Activity list

ID: BIZ-040
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

In the Activity list almost every row shows a light-grey "Add a description…" placeholder, because
descriptions are optional (capture-first). Repeated on nearly every row, it's visual noise that
competes with the actual descriptions.

## What to build

In `components/EntryRow.tsx`, show the "Add a description…" affordance **only on hover/focus** of the
row (or of the description cell). At rest, an entry with no description shows a discreet `—` (or an
empty cell), not the full invite. A row that *has* a description is unchanged. The click/edit target
still works — hovering reveals the invite, and it stays fully keyboard-reachable (focus shows it too,
for accessibility).

## Acceptance criteria

- [ ] An entry with no description renders no "Add a description…" text at rest; it appears on hover
      or keyboard focus of the row/cell.
- [ ] The description remains editable via the same interaction as today.
- [ ] Rows with a description are unchanged.
- [ ] Focus (not just mouse hover) reveals the invite, so it's reachable without a pointer.
- [ ] Frontend test covers rest vs hover/focus visibility.

## Blocked by

None.
