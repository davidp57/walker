# BIZ-013 — Track & categorize on a virtual code (picker + on-the-fly creation)

ID: BIZ-013
Status: ⬜ ready
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

- [ ] The picker lists virtual codes; picking one sets the code and lets the user choose an Activity from the real code's activities.
- [ ] Picking a virtual code optionally prefills the description with the last comment used for that virtual code + activity.
- [ ] A virtual code can be created on the fly in the picker (choose real code + name) and used immediately.
- [ ] Picking a real code directly is unchanged; an Entry records the virtual code it was tracked on.
- [ ] Frontend tests (picker shows and creates a virtual code; categorization sets it) + an API test if a new categorize path is added.

## Blocked by

BIZ-012.
