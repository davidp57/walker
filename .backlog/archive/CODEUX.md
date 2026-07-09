# CODEUX — Code colour automation + unified code-selection UX (archived)

Status: ✅ done
Branch: feature/* per ticket → PR → develop

## Summary

Two rough edges around how code colours are assigned and how codes are picked, closed together.

**Colour (BIZ-048).** Replaced the backend 8-colour modulo palette (`_auto_color`) and the two
divergent frontend palettes with a single curated **64-colour palette**, hue-ordered (an 8×8
spectrum), mirrored Python/TS and pinned by a contract test against the shared fixture
`tests/fixtures/palette.json`. Colour suggestion is **least-used-first**: pick uniformly at random
among the palette colours with the minimal usage count over the codes visible to the user
(palette-only counting; the edited code excluded). While free colours remain it never repeats an
in-use colour; once all 64 are used it degrades to count 1, 2, … (graceful saturation). A rich
`ColorPicker` (🎲 re-roll, 64-swatch grid, used-markers with a tooltip naming the code(s), still
selectable, accent-ring selection, native analog input) is shown in both the real- and virtual-code
editors. The backend still assigns a least-used colour for any pickerless create path (`color=None`).

**Selection (BIZ-049).** One tiered search model across every code-selection surface, extracted as a
pure tested helper (`lib/codeSearch.ts`): results grouped by tier, then sorted by project name within
each tier (was number order). Tier 1 = the user's codes (real + virtual; real-only for a virtual
code's backing), Tier 2 = the reference catalog. Replaced `VirtualCodeEditor`'s bare `<select>` with
the shared `CodePicker` (code-only + real-only). Activating a Tier-2 reference code now routes
through `CodeEditor` (with BIZ-048's colour picker) instead of a one-click add — a deliberate,
colourable step prefilled from the reference entry; idempotent (already-active → edit). The
two-modal virtual-creation chain works end to end.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-048 | Automatic colour suggestion + rich colour picker | P2 | ✅ done |
| BIZ-049 | Unified tiered code search + rich backing-code selector for virtual codes | P2 | ✅ done |

## Verified against

- Backend: full suite green (240 tests, ~95% coverage); `ruff check` / `ruff format --check` / `mypy`
  clean. BIZ-049 needed no backend change.
- Frontend: full suite green (339 Vitest tests, incl. the palette + code-search contracts, the
  `ColorPicker`, the tiered picker, and the virtual-creation-from-catalog chain);
  `eslint` / `prettier --check` / `tsc --noEmit && vite build` clean.
- Not exercised in a live browser this session (the CODEUX worktree had no backend venv / seeded DB);
  behaviour is covered by the test suites — the modal-chain and z-order logic included.

## Key implementation notes

- Palette source of truth: `src/walker/services/palette.py` (`PALETTE`, `least_used_colors`,
  `suggest_color`) mirrored by `frontend/src/lib/palette.ts`; both assert equality with
  `tests/fixtures/palette.json`. Same contract pattern as `resolve_theme`/`resolveTheme`.
- `services/catalog.py` create paths call `_suggested_color` over `_visible_codes_filter`, so the
  avoidance set is exactly the codes `list_codes(user)` returns — model-agnostic w.r.t. the parked
  catalog re-scoping (see `IDEAS.md`).
- `lib/codeSearch.ts::searchUserCodes` (Tier 1, name-sorted, `codeOnly`/`realOnly` options) and
  `sortReferenceByName` (Tier 2) back the shared `CodePicker`, the catalog-screen search, and the
  virtual-code backing selector.
- Reference activation is centralised in `App.activateReference(ref, onActivated?)`: opens `CodeEditor`
  prefilled from the reference (or in edit mode if the number is already active), and runs the
  continuation once the real code is saved. The activation `CodeEditor` is rendered last so it stacks
  above the picker inside `TaskPanel` / `VirtualCodeEditor`.
- The one-click `POST /api/codes/from-reference` endpoint remains (still tested) but is no longer the
  frontend's activation path; the orphaned `addCodeFromReference` client wrapper was removed.
