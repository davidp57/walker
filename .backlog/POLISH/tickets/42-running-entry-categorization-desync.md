# BIZ-085 — Categorizing the running entry from the Activity list is lost on Stop

ID: BIZ-085
Status: ⬜ ready
Type: bug
Priority: P1

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Reported by Julien.

## Problem

Set the Timesheet code + Activity of the **running** entry from the Activity list and two things go
wrong: the Timer bar's chip still reads "Uncategorized · pick a code", and **stopping the Timer wipes
the categorization** — the entry lands back as Uncategorized. Real work silently loses its code, which
makes it invisible in the Timesheet period matrix.

Reported with the running entry showing `IT - Team Coordination & Leadership · N9/6198577/010 · Team
meeting` in the list while the chip beside the counter still said "Uncategorized".

### Reproduction

1. Start the Timer with no code (capture-first, ADR-0006).
2. In the Activity list, categorize the running row — pick a code + activity.
3. The row updates. **The Timer chip does not** — still "Uncategorized · pick a code".
4. Press Stop → the entry is Uncategorized again. The code chosen in step 2 is gone.

## Diagnosis

The running entry's categorization lives in **two places**, and only one path keeps them in sync.

- `draft` ([App.tsx:265](../../../frontend/src/App.tsx:265)) holds the Timer bar's code / activity /
  description. It is seeded from the running entry **once**, inside the effect keyed on `trackerFrom`
  ([App.tsx:389](../../../frontend/src/App.tsx:389)) — so on first load, or when the tracker window is
  widened, and never again.
- `reload()` ([App.tsx:424](../../../frontend/src/App.tsx:424)) only does `setEntries`. Since `running`
  is derived from `entries`, the Activity list shows the truth immediately while `draft` stays stale —
  hence the chip not moving (symptom 1).
- `stopTimer` ([App.tsx:491](../../../frontend/src/App.tsx:491)) then patches the entry with
  `draft.codeId` / `draft.activity` / `draft.description` before stopping. With a stale `draft` those
  are `null`/`null`/`''`, so the patch **overwrites** the code just set (symptom 2 — the data loss).

The Timer-bar path is fine: `pickTask` ([App.tsx:582](../../../frontend/src/App.tsx:582)) does
`setDraft` *and* patches, keeping both in step (BIZ-058).

Same failure reaches the running entry through every write that isn't `pickTask`:

- `onCategorizeEntry` from the Activity list ([App.tsx:1200](../../../frontend/src/App.tsx:1200)) and
  from the cell drill-down — the reported case.
- `onEditEntry` inline edits on the running row (BIZ-054).
- The full `EntryEditor` opened on the running entry.
- `completeTimer` ([App.tsx:507](../../../frontend/src/App.tsx:507)) repeats `stopTimer`'s overwrite, so
  **Complete** loses the categorization the same way.

## Solution

Recommended: **stop duplicating the state.** While an entry is running it is the single source of
truth — derive the Timer bar's code / activity / description from `running`, and keep `draft` only for
the stopped state (composing what the next Start will carry). `stopTimer` / `completeTimer` then have
nothing to push before stopping, and the whole class of bug disappears rather than this one instance.

Cheaper alternative if that refactor looks too wide for a P1 fix: re-sync `draft` from the running
entry after every `reload()` (move the seeding out of the `trackerFrom` effect into one keyed on
`entries`), **and** make `stopTimer` / `completeTimer` stop overwriting — they should only send fields
the user actually edited on the bar. Note this leaves the two copies in place, so the next write path
added to the running entry can reintroduce the desync; the recommended fix does not.

Either way the description field needs care: it is edited live on the Timer bar while stopped *and*
while running, so it is the one field where the bar legitimately leads.

## Acceptance criteria

- [ ] Categorizing the running entry from the Activity list updates the Timer chip immediately.
- [ ] Stopping the Timer afterwards **keeps** that code + activity.
- [ ] Same for **Complete** (BIZ-023) and for a code set through the full entry editor or the cell
      drill-down on the running entry.
- [ ] Editing the running entry's description on the Timer bar still wins, and is saved on Stop.
- [ ] Regression test in `App.test.tsx`: categorize the running entry through the list, assert the chip
      shows the code, then Stop and assert the patch sent to the API carries the code (not `null`).
- [ ] Quality gate clean both sides.

## Blocked by

None.
