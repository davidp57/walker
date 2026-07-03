# BIZ-016 — Copy the T&E code from the Enter in T&E screen

ID: BIZ-016
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Each row header already shows the T&E code number (`row.code.number`, `wk-rowhead-code`), shared
between the Review and Enter-in-T&E grid modes (`FortnightGrid.tsx`). Add a small copy icon button
right next to it that copies the number to the clipboard — keying into T&E means retyping this
number by hand, so a one-click copy removes a transcription step. Give clear feedback on copy (e.g. a
brief checkmark swap or tooltip change), matching the existing icon-button visual language
(`wk-btn-icon`).

## Acceptance criteria

- [ ] A copy icon sits beside the T&E code number in the row header, in the Enter in T&E grid.
- [ ] Clicking it copies the exact code number to the clipboard and gives visible confirmation.
- [ ] Doesn't interfere with existing row-header interactions (row `n/N` badge click, in Enter in T&E).
- [ ] A frontend test covers the copy action (mocked clipboard) and the confirmation feedback.

## Blocked by

None — can start immediately.
