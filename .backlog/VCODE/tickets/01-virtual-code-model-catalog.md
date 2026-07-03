# BIZ-012 — Virtual code model + create/list + catalog UI

ID: BIZ-012
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

Make a Timesheet code either **real** (exists in T&E, imported — as today) or **virtual** (Walker-only,
pointing at one real code). A virtual code **borrows** its real code's number, technical label, and
Activities, and **owns** its name and colour. Number-uniqueness per user applies to **real** codes only;
a virtual code is identified by its **name**. Expose creating and listing virtual codes, and show them
in the **Code catalog** among the real ones with a **"virtual" badge** and the backing real code shown;
a "New virtual code" action picks the target real code + name + colour. See ADR-0008.

## Acceptance criteria

- [ ] A code can be created as virtual, linked to exactly one real code, with its own name + colour; it borrows the real code's number, label, and Activities.
- [ ] Several virtual codes can point to the same real code; number-uniqueness applies to real codes only; a virtual code is identified by its name (unique per user).
- [ ] The catalog lists virtual codes among real ones with a "virtual" badge and the backing real code shown; "New virtual code" creates one.
- [ ] The reference-catalog import still upserts real codes only and never creates or touches virtual codes.
- [ ] Backend API test (create/list virtual codes; import unaffected) + a frontend test (catalog badge + create).

## Blocked by

None — can start immediately.
