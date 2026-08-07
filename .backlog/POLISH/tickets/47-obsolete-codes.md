# BIZ-090 — Mark a code obsolete: hide it, and optionally sweep the open period onto its replacement

ID: BIZ-090
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Reuses the bulk-reassign machinery of **BIZ-088**.

## Problem

Codes retire. A project closes, a charge line is replaced by its successor, an internal code is
folded into another — but the old code cannot simply be deleted: **Entries reference it**, and that
captured time is real (BIZ-088 exists precisely because deleting it is refused). So the retired code
stays in the catalog forever, and worse, keeps appearing in every picker, where it is just as easy to
click as the live one.

Today the only two states are "exists" and "deleted". Deleting means resolving every entry that ever
pointed at it — the right answer when a code was a mistake, the wrong one when it was legitimate work
that simply ended. Nothing expresses "this was real, it is over, stop offering it to me".

## Solution

- **A code can be marked obsolete** — a flag on `TimesheetCode`, alongside the existing `backing_only`
  (BIZ-075, ADR-0014), which already establishes the pattern of a code that exists and resolves but is
  filtered out of the catalog and pickers.
- **Hidden by default, revealed by a toggle.** The Code catalog filters obsolete codes out; a
  "Show obsolete codes" toggle brings them back, labelled with the count so it never looks as though
  codes vanished — the same shape as `task_hide_done` (BIZ-087). Persisted as a view preference.
- **Gone from every picker**, which is the point: an obsolete code you can still click is not retired.
  That includes the likely-codes band (ADR-0015) — a habit score computed over past entries would
  otherwise keep resurrecting it.
- **Still fully resolvable.** Entries, the period grid and the checklist that reference it keep
  rendering its number, label and colour, exactly as `backing_only` codes do today. Marking a code
  obsolete must never make past work unreadable.
- **Optional sweep of the open Timesheet period.** When marking a code obsolete, offer to move that
  period's entries onto a replacement code + activity, reusing BIZ-088's bulk reassign with a date
  window. Optional because a code can retire with nothing to carry over.

## Why only the open period

Past periods have already been keyed into the Timesheet system. Rewriting their entries would put
Walker permanently out of step with what was actually declared, and Walker's whole contract is to
mirror that (ADR-0005: it reports, it does not automate). The open period is the only one still
being edited, so it is the only one where a sweep is a correction rather than a falsification.

Entries older than the open period keep pointing at the obsolete code — which is exactly why the code
must stay resolvable rather than being deleted.

## Open question — obsolescence is Organization-wide for a real code

Real codes are Organization-scoped (BIZ-030, ADR-0010): one row shared by every member. So marking one
obsolete hides it **for the whole Organization**, from a single user's action. Virtual codes are
per-user and raise no such question.

This ticket assumes, unless decided otherwise, that this is **acceptable and intended** — a charge code
that has closed has closed for everyone, and that is why it lives on the shared row. But the UI must
say so at the moment of the action rather than letting it look like a personal preference, and the
sweep must stay user-scoped like every other Entry write path (the asymmetry BIZ-088 already
documents). If a per-user "hide this code" is wanted instead, that is a different feature with a
different data model, and needs its own ADR.

## Acceptance criteria

- [ ] A code can be marked obsolete and un-marked, from the catalog.
- [ ] Obsolete codes are absent from the catalog by default, and from every picker including the
      likely-codes band, with no exception.
- [ ] A persisted "Show obsolete codes" toggle reveals them in the catalog, labelled with the count.
- [ ] Entries, the period grid and the checklist still resolve an obsolete code's number, label and
      colour — past work stays readable.
- [ ] Marking obsolete offers, optionally, to reassign the **open Timesheet period's** entries to a
      chosen code + activity; declining leaves every entry untouched.
- [ ] The sweep never touches entries outside the open period, and never another member's entries.
- [ ] Marking a **real** code obsolete states that it applies to the whole Organization before it is
      applied, per the section above.
- [ ] An obsolete code is still deletable through the normal path (BIZ-088) — obsolete is not a
      substitute for deletion, it is the state for work that legitimately happened.
- [ ] Alembic migration for the new column, defaulting existing rows to not-obsolete.
- [ ] Quality gate clean both sides.

## Blocked by

None. (Builds on BIZ-088's reassign service, already shipped.)
