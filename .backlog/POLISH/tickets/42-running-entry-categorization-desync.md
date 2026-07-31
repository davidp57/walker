# BIZ-085 — Categorizing the running entry from the Activity list is lost on Stop

ID: BIZ-085
Status: 🔄 in-progress
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

## A second data loss, found while verifying

The recommended fix was applied, and browser verification then exposed **the same bug hiding in the
description field** — which the first cut of this ticket had waved through as "the bar legitimately
leads".

Categorizing from the Activity list also prefills the description (the last comment used on that code,
BIZ-013). That write lands on the Entry, and the bar's buffer knows nothing about it. The first attempt
guarded Stop with "push the description only if it differs from the Entry's" — which blanks it, because
**comparing values cannot tell "the user typed" from "another surface wrote"**, and guessing wrong
destroys data in one direction or the other.

So the description needs an explicit `descriptionTouched` flag: the buffer **mirrors** the Entry until
the user types into it, and only then wins, until the segment closes. Every wholesale draft replacement
(Stop, Complete, Cancel, resume, start-from-Task, suggestion pick, BIZ-013 prefill) rearms it; only
`onDescriptionChange` sets it.

## Acceptance criteria

- [x] Categorizing the running entry from the Activity list updates the Timer chip immediately.
- [x] Stopping the Timer afterwards **keeps** that code + activity.
- [x] Same for **Complete** (BIZ-023) — it shares the one `saveRunningDescription` helper with Stop, so
      the two cannot drift apart — and for a code set through the entry editor or the cell drill-down,
      which all write the Entry that the bar now reads.
- [x] A description **typed** on the bar still wins and is saved on Stop.
- [x] A description written by another surface is **not** blanked on Stop, and is mirrored onto the bar.
- [x] A code picked *before* Start is carried onto the new Entry (it used to arrive only via the Stop
      push, which this fix removes).
- [x] Capture-first is untouched: an empty Start still patches nothing (BIZ-009 tests still green).
- [x] Regression tests in `App.test.tsx` (5 cases: chip sync, no null code on Stop, typed description
      saved, foreign description not blanked, code carried onto Start).
- [x] Quality gate clean both sides (`ruff`, `mypy`, 342 pytest 95%; `lint`, `format:check`, `build`,
      468 vitest).
- [x] Verified live on a copy of the real database — never on the live one, since the scenario writes:
      chip follows, Stop keeps all three fields, a hand-typed comment beats the prefill.

## Blocked by

None.
