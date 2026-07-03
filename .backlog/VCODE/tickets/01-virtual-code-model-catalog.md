# BIZ-012 — Virtual code model + create/list + catalog UI

ID: BIZ-012
Status: ✅ done
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

- [x] A code can be created as virtual, linked to exactly one real code, with its own name + colour; it borrows the real code's number, label, and Activities.
- [x] Several virtual codes can point to the same real code; number-uniqueness applies to real codes only; a virtual code is identified by its name (unique per user).
- [x] The catalog lists virtual codes among real ones with a "virtual" badge and the backing real code shown; "New virtual code" creates one.
- [x] The reference-catalog import still upserts real codes only and never creates or touches virtual codes.
- [x] Backend API test (create/list virtual codes; import unaffected) + a frontend test (catalog badge + create).

## Comments

`TimesheetCode.real_code_id` (nullable self-FK) + `is_virtual`/`resolved_number`/`resolved_label`/
`resolved_activities` properties; migration `b3b4a90edd53` drops the old `(user_id, number)` unique
constraint (SQLite batch mode) in favour of a service-layer check scoped to real codes.
`catalog.create_virtual_code` + `POST /api/codes/virtual`; `codes.py` now builds `CodeRead` explicitly
via `_code_read()` so `number`/`label`/`activities` are always the resolved values. Frontend: new
`VirtualCodeEditor` modal, catalog badge + "New virtual code" action, `createVirtualCode` API client.
Added the frontend's missing jsdom/`@testing-library/jest-dom` test wiring (`vitest.config.ts`,
`test-setup.ts`) as part of adding the first component test.

## Blocked by

None — can start immediately.
