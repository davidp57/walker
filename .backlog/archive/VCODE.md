# VCODE — Virtual codes (archived)

Status: ✅ done
Branch: feature/virtual-codes → PR → develop

## Summary

User-created "virtual" codes backed by exactly one real T&E code (ADR-0008): a virtual code borrows
its real code's number, technical label, and Activities, and owns its own name and colour. Two-level
aggregation — the Fortnight/Review grid shows a virtual code as its own row; the Enter-in-T&E checklist
resolves virtual codes to their real code, collapsing several virtual codes sharing one real code into
a single T&E line. Delivered end-to-end: model, catalog CRUD (create/edit/delete + delete guards),
picker integration (list, on-the-fly creation, last-comment prefill), and the two-level aggregation.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-012 | Virtual code model + create/list + catalog UI | P2 | ✅ done |
| BIZ-013 | Track & categorize on a virtual code (picker + on-the-fly creation) | P2 | ✅ done |
| BIZ-014 | Two-level Fortnight / checklist aggregation | P2 | ✅ done |
| BIZ-015 | Edit / delete virtual codes + real-parent delete guard | P2 | ✅ done |
| CHR-002 | Amend BIZ-007 acceptance criterion for virtual codes (cross-lot) | P3 | ✅ done |

## Verified against

- Backend: 67 tests passing, ~96% coverage; `ruff check`/`ruff format --check`/`mypy` clean.
- Frontend: 51 Vitest tests passing (added jsdom + `@testing-library/jest-dom` test infra, missing
  until this lot); `eslint`/`prettier --check`/`tsc --noEmit && vite build` clean.
- Manual browser verification: created a virtual code on the fly from the code picker (picker reopens
  on the same target — "used immediately"), categorized an Entry on it, confirmed Review shows it as
  its own row while Enter-in-T&E collapses it into its real code's line (daily total moved from 0:24 to
  1:24, exactly the virtual code's tracked duration), confirmed editing a virtual code prefills
  correctly and the Delete button is hidden while an Entry references it.

## Key implementation notes

- `TimesheetCode.real_code_id` — nullable self-FK (migration `b3b4a90edd53`); `is_virtual` /
  `resolved_number` / `resolved_label` / `resolved_activities` properties resolve borrowed values.
  `(user_id, number)` DB uniqueness dropped in favour of a service-layer check scoped to real codes.
- `services/fortnight.py::resolve_to_real_codes` collapses virtual rows onto their real code; only
  `services/checklist.py::derive_checklist` calls it — `aggregate_fortnight` (Review) is untouched.
- `api/routers/codes.py::_code_read()` builds `CodeRead` explicitly (no `from_attributes`) so
  `number`/`label`/`activities` are always the resolved values.
- Frontend mirrors the resolve step client-side for the checklist (`lib/checklist.ts`) since the
  Review and Enter-in-T&E grids share the same `rows` computation in `App.tsx`.
