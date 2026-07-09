# BIZ-054 — Edit the running entry inline; make the Timer's description field look editable

ID: BIZ-054
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Two friction points around the work currently in progress:

- **A.** In the Activity list, the running Timer's row is fully read-only (BIZ-038: "stop the Timer
  from the bar to edit"). But the same Entry is already editable *from the Timer bar* (description,
  code/activity via switch, start time) — so you can't fix a typo or categorize from the list, even
  though it's the same object.
- **B.** In the Timer bar the description **is** an editable input (`wk-timer-input`,
  `TimerBar.tsx`), but it doesn't look like one: next to the boxed, button-styled code chip
  (`wk-taskchip`, "switch ⌄") the borderless description reads as static text, so users don't realize
  they can type there.

## What to build

Both frontend-only. No backend change — reuse the existing `patchEntry` / re-tag paths.

**A. Make the running row editable (for the safe fields).** In `EntryRow`'s `running` mode, allow
inline editing of **description**, **code/activity** (the code cell becomes clickable →
categorize/re-tag, including the flagged "Add code & activity" affordance), and **start**. Keep
**end** and **duration** read-only — they're live, which is the core of BIZ-038 this ticket
deliberately preserves while relaxing the rest.

Because the running row and the Timer bar are the **same Entry**, edits must **sync both ways**: an
edit in the list updates the `running`/`draft` state the Timer bar renders from, and vice-versa. The
"stop to edit" hint is no longer accurate for these fields — drop/adjust it.

**B. Give the Timer description an editable affordance.** Style `wk-timer-input` as a visible field
(border + focus ring, consistent with the app's inputs) so it reads as editable alongside the boxed
code chip. Purely visual; behavior unchanged.

## Acceptance criteria

- [ ] The running entry's **description**, **code/activity**, and **start** are editable from the
      Activity list; **end** and **duration** stay read-only while running.
- [ ] Editing the running row from the list is reflected in the Timer bar (and vice-versa) — same
      Entry, kept in sync; persisted via the existing patch/re-tag calls.
- [ ] The flagged running row's "Add code & activity" is clickable (categorize in place).
- [ ] The Timer description field has a visible editable affordance (border/focus), distinct-looking
      from static text, in both themes; typing/Enter behaviour is unchanged.
- [ ] Frontend tests cover: a running row edits description/start and categorizes; the running row
      keeps end/duration read-only.

## Blocked by

None.
