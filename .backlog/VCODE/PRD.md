# Virtual codes — PRD

Status: ⬜ ready
Lot: VCODE
Branch: feature/virtual-codes → PR → develop

## Problem Statement

I work on finer-grained things — small projects, sub-topics — than my real T&E codes represent, and
several of them are booked on the **same** real code (e.g. a project with no budget of its own). Today
Walker only knows the real T&E codes, so all that work collapses under one coarse code and I lose the
finer classification I actually think in. Example: *"workday-work-contact-information"* has no budget,
so I book it on the real code *"Workday - integration"* — but other projects book there too, and in
Walker I can't tell them apart.

## Solution

Let me create my own **virtual codes** in Walker: a code that does **not** exist in Time & Expenses,
that I create and link to exactly one **real** T&E code. I track and classify by virtual codes (a finer
breakdown than T&E offers); when I enter T&E, every virtual code **resolves to its real code**, so I
key exactly the real T&E lines — several virtual codes on the same real code collapse into one. A
virtual code behaves like any code (its own name and colour, appears in the picker and the Fortnight
grid); it simply carries a real code behind it, from which it borrows the T&E **number**, technical
**label**, and **Activities**. See ADR-0008.

## User Stories

1. As a consultant, I want to create a virtual code linked to a real T&E code, so that I can track a
   project or sub-topic that has no T&E code of its own.
2. As a consultant, I want a virtual code to have its own **name** and **colour**, so that it reads as
   a distinct thing in the picker and the Fortnight grid.
3. As a consultant, I want a virtual code to **inherit** its real code's number, technical label, and
   Activities, so that I never retype them and T&E stays the source of truth.
4. As a consultant, I want several virtual codes to point to the **same** real code, so that distinct
   projects sharing one T&E code stay separate in Walker.
5. As a consultant, I want to create a virtual code from the **Code catalog** (pick the real code +
   name + colour), so that I can set up my classification deliberately.
6. As a consultant, I want to create a virtual code **on the fly** while categorizing or starting a
   timer, so that I'm never blocked mid-flow.
7. As a consultant, I want virtual codes listed in the **same** catalog as real ones, with a
   **"virtual" badge** and the backing real code shown, so that I see what's real and what's mine.
8. As a consultant, I want picking a virtual code in the picker to fill the (real) code and let me
   choose the **Activity** from that real code's activities, so that categorization stays one flow.
9. As a consultant, I want picking a virtual code to optionally prefill the description with the last
   comment I used for that virtual code + activity, so that repeated work is one action.
10. As a consultant, I want to still pick a **real** code directly (no virtual), exactly as today, so
    that generic codes (admin, meetings) need no virtual code.
11. As a consultant, I want to **edit** a virtual code (name, colour, target real code), so that I can
    fix or re-point it.
12. As a consultant, I want to **delete** a virtual code when nothing uses it, so that my catalog stays
    tidy (like real codes).
13. As a consultant, I want deletion of a **real** code blocked while virtual codes point to it (in
    addition to the existing block while Entries reference it), so that I never orphan a virtual code.
14. As a consultant, I want the **Fortnight / Review** view to show each virtual code as its **own
    row**, so that I see my fine classification.
15. As a consultant, I want the **Enter-in-T&E** checklist to **resolve** virtual codes to their real
    code and collapse them into one line per real code × activity × day, so that I key exactly the T&E
    lines — nothing split, nothing double-entered.
16. As a consultant, I want fortnight durations to stay **real, to the minute** (no rounding, no
    target), whether the row is a real or virtual code, so that ADR-0005 still holds.
17. As a consultant, I want my catalog **import** to be unaffected — it still upserts real codes by
    number, and never touches my virtual codes — so that re-importing is safe.
18. As a consultant, I want to **search** a virtual code by its **name** (since it shares its real
    code's number), so that I find it fast in the picker and catalog.
19. As a consultant, I want an Entry I tracked on a virtual code to **carry that virtual code**, so
    that my classification persists on the Entry and in the Fortnight.
20. As a consultant, I want everything about a virtual code to reuse the existing code machinery
    (colour dot, picker, catalog card, fortnight row), so that it feels native, not bolted on.

## Implementation Decisions

Frontend + backend. Grounded in ADR-0008 (virtual codes) and ADR-0005 (no rounding / no target).

- **Model**: the Timesheet code gains a **nullable self-reference** to a real code. Null = a **real**
  code (exists in T&E, imported); set = a **virtual** code (Walker-only). A virtual code **borrows**
  number, technical label, and Activities from its real code, and **owns** its name and colour.
- **Identity / uniqueness**: number-uniqueness per user holds for **real** codes only; a virtual code
  is identified by its **name** (unique per user), since it shares its real code's number.
- **Entry**: unchanged — it references the code it was tracked on (real or virtual) through the code
  reference it already has. No new Entry field in this lot.
- **Two-level aggregation** (the core behaviour): the **working view** (Fortnight / Review) groups by
  code, so a virtual code is its own row; the **T&E-facing view** (the Enter-in-T&E checklist and
  anything keyed into T&E) **resolves** virtual → real and aggregates by **real code × activity**. The
  resolve step lives in the fortnight-aggregation service and the checklist derivation.
- **Creation** in two places: the **Code catalog** ("New virtual code": choose the real code + name +
  colour) and **on the fly** in the code picker (choose/search the target real code inline, then name
  it). The catalog lists virtual codes **mixed** with real ones, badged, with the backing real code
  shown.
- **CRUD & guards**: reuse the existing code create/update/delete. Add a guard so a **real** code
  cannot be deleted while virtual codes point to it (alongside the existing in-use-by-Entries guard).
- **Categorization**: the picker offers virtual codes (filling the real code + an optional last-comment
  for that virtual code × activity) and real codes (as today). Description/comment suggestions are
  scoped by (code, activity), virtual codes included.
- **Import unchanged**: the reference-catalog import keeps upserting **real** codes by number; virtual
  codes are user-created and invisible to it.
- **API**: creating / updating / deleting / listing codes carries the real-code link; the fortnight and
  checklist responses reflect the two-level aggregation above.

## Testing Decisions

Test **external behaviour** through the highest seams; don't test internals. Coverage gate ≥ 80%
(`fail_under`) unchanged.

- **Backend — API seam** (FastAPI `TestClient`, prior art `tests/test_api_*.py`): create / list /
  update / delete a virtual code; the delete-guard on a real code that has virtual children; the
  fortnight aggregation returns a **row per virtual code** for the working view and **resolves to real
  code × activity** for the checklist; the catalog import still upserts real codes only.
- **Backend — pure service tests** (prior art: existing fortnight-aggregation service tests): the
  virtual → real resolution and the two-level aggregation, deterministically.
- **Frontend** (Vitest + Testing Library, prior art: lot CORE component/lib tests): the picker shows
  and creates virtual codes (including on the fly); the catalog shows the badge + backing real code;
  the Review fortnight shows a row per virtual code; the Enter-in-T&E checklist collapses virtual codes
  to their real code.

## Out of Scope

- The **Task manager** (lot B) — separate PRD.
- Changing how durations are recorded or rounded (ADR-0005 stands); the checklist progress bar remains
  the only "progress" indicator.
- Changing the catalog import format or behaviour beyond leaving it real-code-only.
- The actual edit to the UX lot's BIZ-007 (see Further Notes) — applied when this lot is sequenced, not
  in this PRD.

## Further Notes

- All decisions were validated in a grilling + domain-modeling session. See **ADR-0008**
  (`docs/adr/0008-virtual-codes-self-referential.md`) and **CONTEXT.md** (new *real code* / *virtual
  code* terms).
- **Cross-lot dependency**: this lot **amends BIZ-007** (UX lot) — its "identical geometry" acceptance
  criterion becomes "same grid; Review by code (virtual rows), Enter resolved to the real code". Apply
  that edit when this lot is scheduled against the UX lot.
- Next: `/to-issues` to slice into tickets — e.g. model + API + resolution (BIZ/TEC), catalog & picker
  UI incl. on-the-fly creation (BIZ), two-level fortnight/checklist aggregation (BIZ), and the BIZ-007
  amendment (CHR/TEC).
