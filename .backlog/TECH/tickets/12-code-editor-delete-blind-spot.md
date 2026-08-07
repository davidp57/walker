# TEC-016 — The code editors hide Delete on an unreliable guess

ID: TEC-016
Status: ⬜ ready
Type: correctness
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Extends the inversion made for the catalog in **BIZ-088**.

## Problem

`isCodeInUse` (`frontend/src/App.tsx`) answers "is this code in use?" from **client state only**:

```ts
const isCodeInUse = (id: string): boolean =>
  entries.some((e) => e.codeId === id) ||
  Object.keys(matrix).some((k) => k.startsWith(`${id}|`)) ||
  codes.some((c) => c.realCodeId === id)
```

`entries` holds the **loaded date window** (`trackerFrom` → today, a fortnight) and `matrix` the
**current Timesheet period**. So the answer is wrong in both directions, and BIZ-088's live check
proved it: on the real dev database, on 7 August, **none** of the codes with July entries were
reported in use, because the window starts 25 July.

BIZ-088 fixed the consequence on the Code catalog — entries no longer disable the ✕, the server
decides, and a 409 opens the resolve flow. But two call sites were left on the old guess:

- `CodeEditor` — `onDelete` is `undefined` when `isCodeInUse(editor.code.id)` (App.tsx ~1522)
- `VirtualCodeEditor` — same, for `virtualEditor.code` (App.tsx ~1353)

There the failure is worse than a wrong tooltip: the Delete button is **absent**, with nothing
explaining why. A code whose entries all fall outside the loaded window offers Delete (fine — the
resolve flow now handles it), while a code with one entry from last Tuesday silently loses the
control, and the user has no way to learn that entries are the reason.

The guess also **conflates two different blocks** — entries and virtual children — into one boolean,
which is exactly what BIZ-088 had to separate for the catalog.

## Solution

- Both editors use `deleteBlockedBy` (introduced in BIZ-088) instead of `isCodeInUse`: Delete is
  hidden only for `'virtual'` — a genuine block whose fix is to delete the virtual codes first — and
  offered otherwise, letting `deleteCode` route a 409 into the blocking-entries resolve flow.
- `isCodeInUse` is then unreferenced and is **deleted**, so the unreliable guess cannot come back
  through a third caller.
- When Delete is hidden because virtual codes point at the code, the editor **says so** rather than
  simply omitting the control.

## Acceptance criteria

- [ ] Neither editor hides Delete because of Entries; a blocked delete goes through the BIZ-088
      resolve flow, the same as from the catalog.
- [ ] Both editors still hide Delete when virtual codes point at the code, and explain why.
- [ ] `isCodeInUse` no longer exists in the codebase.
- [ ] A test pins the regression: a code whose only entries fall **outside** the loaded window still
      offers Delete, and one with virtual children does not.
- [ ] Quality gate clean both sides.

## Blocked by

**BIZ-088** — `deleteBlockedBy` and the resolve flow come from it.
