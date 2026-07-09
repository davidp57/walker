# BIZ-058 — Changing the running Timer's code edits the entry in place (no switch)

ID: BIZ-058
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Changing the code/activity on the running Timer from the bar splits the entry: once the running
entry has content, `pickTask` closes it and opens a new segment (`shouldRetagInPlace` only edits in
place for an empty capture stub). That surprises — changing the code reads as *correcting the current
segment*, not *switching to a new task*. The user wants it to just continue the running entry with
the corrected code.

## What to build

Adopt a single, coherent rule: **a new segment is only ever created by an explicit *start*** — the
Start button, Start-from-Task (BIZ-050), or resuming an Entry (Activity ▶). **Editing the running
Timer never creates a segment** — it corrects the current Entry in place.

- **`pickTask` (App), the Timer-bar code/activity change**: always `patchEntry(running, …)` in place
  (same Entry, same start). Remove the `switchTimer` branch from this path. The stub case is
  unchanged (already in place); `shouldRetagInPlace` stays, still used by resume / start-from-task.
- **Relabel**: the Timer chip's "switch ⌄" and the picker title "Switch task" drop the "switch"
  wording (e.g. "code ⌄" / "Change code") — it's an edit, not a switch.
- **Unchanged**: resuming an Entry (▶) and Start-from-Task keep opening a new segment (they're
  explicit starts, absorbing a running stub if present). `switchTimer` / `POST /api/timer/switch`
  stay (used by those). No backend change. To deliberately split, the user stops and starts.

**Docs**: update `CONTEXT.md`'s **Timer** entry — the clause "the Timer closes the current Entry and
opens a new one" is no longer true; changing the code now edits the current Entry, and a new segment
comes only from an explicit start. (No ADR — this is a simplification within capture-first, ADR-0006;
rationale recorded here.)

## Acceptance criteria

- [ ] Changing the code/activity on the running Timer (bar) patches the current Entry in place —
      same id, same start — for a categorized entry as well as a stub; no new Entry is created.
- [ ] The Timer chip / picker no longer says "switch"; the wording reflects editing the code.
- [ ] Resuming an Entry and Start-from-Task still open a new segment (unchanged), verified by tests.
- [ ] `CONTEXT.md` Timer entry updated to the edit-in-place model.
- [ ] Frontend tests cover: bar code-change on a categorized running entry patches in place (no
      switch call); resume/start-from-task still switch.

## Blocked by

None.
