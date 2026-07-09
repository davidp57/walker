# BIZ-049 — Unified tiered code search + rich backing-code selector for virtual codes

ID: BIZ-049
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot CODEUX — `.backlog/CODEUX/PRD.md`.

## Problem

Code selection is inconsistent across the app. The rich `CodePicker` (search, colour dot,
reference-catalog lookup, create-on-the-fly) backs categorizing an entry and setting a task's code,
but creating a **virtual code** picks its backing real code through a bare `<select>` in
`VirtualCodeEditor` — no search, no colour dot, unusable once there are many real codes. Search
behaviour also varies: ordering differs, and the task-code picker deliberately omits the reference
catalog (`App.tsx`, `onSearchReference` not passed for `target === 'task'`).

## What to build

A **single tiered search model** for every code-selection surface — the two `CodePicker` uses
(categorize entry, switch task), the task-code `CodePicker` (`TaskPanel`), the catalog screen search
(`CodeCatalogScreen`), and the new virtual-code backing selector.

**Results are grouped by tier first, then sorted by `name` (project name/libellé) within each tier**
— this replaces the current number ordering. Tiers by context:

| Context | Tier 1 | Tier 2 |
|---|---|---|
| General pickers (categorize, switch task, task code) | user-scope codes **real + virtual** | **reference catalog** |
| Virtual-code creation (backing code) | user-scope **real** codes only | **reference catalog** (real) |

- Picking a **Tier 2** (reference-catalog) code **activates it first** (full parity — the "B"
  option). Activation routes through `CodeEditor` (see below), so the newly activated real code gets
  BIZ-048's colour picker.
- The **task-code picker gains the Tier 2 (catalog)** tier it currently lacks — an intentional
  behaviour change for consistency.

**Virtual-code backing selector**: replace the `<select>` in `VirtualCodeEditor` with the shared
search UI in `codeOnly` mode (no activity step), Tier 1 = user-scope **real** codes, Tier 2 =
reference catalog. Backing a virtual code onto a not-yet-active catalog code therefore chains two
modals — **search → pick a catalog code → `CodeEditor` opens (activate + colour the real code) →
back to `VirtualCodeEditor` with it selected → name + colour the virtual → save.** This modal chain
is accepted.

**Activation-from-reference routes through `CodeEditor`.** Today `add_from_reference` adds a real
code in one click with no dialog; it now opens `CodeEditor` pre-filled from the reference entry
(number, label, name, activities) with BIZ-048's suggested colour, so activation is a deliberate,
colourable step. A deliberate deviation from the one-click, capture-first spirit of ADR-0006 for this
path — justified by making colour choice visible at creation; kept easily reversible (UI wiring), so
no ADR. Handle idempotency: activating a code already active opens it in edit mode instead of
re-creating.

## Acceptance criteria

- [ ] All four code-selection surfaces use one search, results **grouped by tier then sorted by
      `name`** within each tier.
- [ ] General pickers: Tier 1 = user real + virtual, Tier 2 = reference catalog. Virtual-code
      creation: Tier 1 = user real only, Tier 2 = reference catalog.
- [ ] The task-code picker now searches the reference catalog (Tier 2).
- [ ] `VirtualCodeEditor`'s `<select>` is replaced by the shared searchable selector (colour dots,
      Tier 1 real + Tier 2 catalog); a colleague with many codes can find one by typing.
- [ ] Picking a Tier 2 code activates it via `CodeEditor` (with BIZ-048's colour picker), then the
      flow returns to where selection started; the two-modal virtual-creation chain works end to end.
- [ ] Activating a code that is already active edits it rather than erroring/duplicating.
- [ ] Frontend tests cover tier grouping + name sort, and the virtual-creation-from-catalog chain.

## Blocked by

BIZ-048 (the colour picker that `CodeEditor` shows when a Tier 2 code is activated).
