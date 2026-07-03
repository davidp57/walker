# BIZ-013 — Track & categorize on a virtual code (picker + on-the-fly creation)

ID: BIZ-013
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

In the code picker, offer **virtual codes** alongside real ones. Picking a virtual code fills the
(real) code and lets the user choose the **Activity** from the real code's activities, optionally
prefilling the description with the **last comment** used for that virtual code + activity. Allow
creating a virtual code **on the fly** from the picker (choose the target real code inline, then name
it) and use it immediately. Picking a **real** code directly still works exactly as today. An Entry
tracked on a virtual code **carries** that virtual code.

## Acceptance criteria

- [x] The picker lists virtual codes; picking one sets the code and lets the user choose an Activity from the real code's activities.
- [x] Picking a virtual code optionally prefills the description with the last comment used for that virtual code + activity.
- [x] A virtual code can be created on the fly in the picker (choose real code + name) and used immediately.
- [x] Picking a real code directly is unchanged; an Entry records the virtual code it was tracked on.
- [x] Frontend tests (picker shows and creates a virtual code; categorization sets it) + an API test if a new categorize path is added.

## Blocked by

BIZ-012.

## Comments

- `CodePicker` already iterated the full `codes` prop with no real/virtual filtering, so virtual
  codes were already listed; added a small "virtual" badge (reusing `CodeCatalogScreen`'s
  `wk-act-chip` convention) next to a virtual code's name for clarity, plus a regression/coverage
  test (`CodePicker.test.tsx`) proving both real and virtual codes render and are pickable.
- Added a pure, unit-tested helper `lastDescriptionFor(entries, codeId, activity)`
  (`frontend/src/lib/tasks.ts` + `tasks.test.ts`) mirroring the existing "last comment in this cell"
  logic already used by the Fortnight "add in cell" flow. Wired it into all three `CodePicker`
  `onPick` targets in `App.tsx` (`'timer'`, `'new'` draft, and categorizing an existing entry by id):
  when a match exists the description is prefilled/patched; otherwise the existing description is
  left untouched.
- Added `onCreateNewVirtual?: (query: string) => void` to `CodePicker`, rendered next to the existing
  "➕ Create a new code" action in the empty state.
- **Design decision — "used immediately"**: chose the simpler of the two options considered: on
  saving a virtual code created from the picker, `App.tsx` closes `VirtualCodeEditor` and **reopens
  `CodePicker` on the same target** (`virtualEditor.reopenPicker` tracks which target to return to).
  The newly created virtual code then appears in the reopened picker's list, one click away. This
  was preferred over auto-selecting an activity on the user's behalf (option (a)) because it needs no
  guessing about which activity the user actually wants, keeps the two modals from ever needing to
  be visually stacked, and was straightforward to cover with a deterministic test
  (`App.test.tsx` — "creates a virtual code on the fly from the picker and reopens the picker to use
  it").
- Confirmed `Entry.timesheet_code_id` needed zero backend/schema changes: added
  `test_entry_can_be_tracked_and_round_trips_on_a_virtual_code` in `tests/test_api_entries.py`
  proving an entry patched with a virtual code's id round-trips correctly via `GET /api/entries`.
- New frontend tests: `frontend/src/lib/tasks.test.ts`, `frontend/src/components/CodePicker.test.tsx`,
  `frontend/src/App.test.tsx` (categorize-with-virtual-code, real-code-pick regression, description
  prefill, on-the-fly virtual creation + reopen).
