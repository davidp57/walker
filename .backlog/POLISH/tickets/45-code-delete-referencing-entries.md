# BIZ-088 — Deleting a code blocked by its entries: identify them, then reassign or delete

ID: BIZ-088
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Amends the in-use guard of **BIZ-030**.

## Problem

`delete_code` (`services/catalog.py`) counts the Entries pointing at the code and, if there are any,
raises `Code <number> is referenced by entries and cannot be deleted.` That message is a dead end: it
says *no* without saying **how many**, **when**, or **which**, and offers no way forward. The user's only
recourse today is to hunt the entries down by hand across the Activity view, day by day, with no idea how
far back to look.

The contrast inside the same function is what makes it feel arbitrary — the two *other* reference kinds
are resolved automatically rather than blocking: Tasks are orphaned (`timesheet_code_id` → `None`) and
ChecklistMarks are deleted. Entries block because they are real captured time and silently
reassigning/deleting them would be data loss. That's the right call; the missing piece is the tooling to
let the user resolve them deliberately.

Note `GET /entries` requires either `date` or both `from`/`to` and has no code filter, so even the API
cannot currently answer "which entries use this code".

## Solution

- **Identify.** A read endpoint returning the entries blocking a code's deletion — count, date range
  (first/last), total minutes, and the entries themselves. This is also what makes the blocked state
  explainable rather than mysterious.
- **Resolve, two ways**, both explicit and both leaving the code deletable afterwards:
  - **Reassign** every blocking entry to another code (and activity, since a code change without an
    activity would push the entries into the uncategorized bucket — see `aggregate_period`), reusing the
    existing tiered code picker rather than a bespoke selector.
  - **Delete** them, behind the same deliberate second step the rest of the app uses for destructive
    actions (the inline-confirm pattern of `CodeCatalogScreen` / `TaskPanel`).
- **Surface it where the block happens**: the Code catalog delete flow stops presenting a bare error and
  instead reports the count and opens the resolve step. Not a new screen.
- Bulk reassign/delete goes through a **service function on the whole set**, not N round-trips from the
  frontend — the overlap and merge rules already live server-side and a partial failure mid-loop would
  leave the catalog in a state the user can't reason about.

## Open question — entries belonging to other members

The guard is deliberately **Organization-wide** (BIZ-030): the `Entry` count in `delete_code` has no
`user_id` filter, so another member's entries block the deletion. But every read and write path here is
user-scoped (`list_entries`, `patch_entry`). So a user can be blocked by entries they may neither see nor
reassign.

Simplest resolution, and the one this ticket assumes unless decided otherwise: the count/range/minutes
are reported **org-wide** (so the block is at least explainable), but reassign and delete only ever touch
**the acting user's own** entries; if others remain, the message says so and names the owner count rather
than pretending the user can finish the job. Anything more (acting on another member's time) is an
authorization decision, not UX polish, and would need its own ADR.

## Out of scope

**Archiving entries.** There is no archive/soft-delete concept for `Entry` in the domain today — adding
one changes every aggregation path (`aggregate_period`, the checklist, the totals) and deserves its own
decision. Reassign covers the real need here: keeping the captured time while freeing the code.

## Acceptance criteria

- [ ] A blocked deletion reports how many entries reference the code, over what date range, for how many
      total minutes — instead of the current bare "cannot be deleted".
- [ ] The blocking entries can be listed from the API, filtered to one code, without needing to guess a
      date window.
- [ ] Reassigning them to another code + activity succeeds as one operation, and the code is deletable
      immediately afterwards.
- [ ] Deleting them requires a deliberate second step and reports what will be lost (count + minutes)
      before, not after.
- [ ] Reassignment sets an activity: no path leaves entries categorized by code only, which would move
      them into the uncategorized bucket of the period grid.
- [ ] The org-wide/user-scoped asymmetry is handled explicitly per the section above — never a silent
      partial reassign that leaves the code still undeletable with no explanation.
- [ ] The virtual-children guard is untouched: a real code backing virtual codes still refuses deletion
      (that has its own fix — delete the virtual codes first).
- [ ] Tasks/ChecklistMark cleanup behaviour unchanged.
- [ ] Quality gate clean both sides.

## Blocked by

None.
