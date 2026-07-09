# BIZ-048 — Automatic colour suggestion + rich colour picker

ID: BIZ-048
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot CODEUX — `.backlog/CODEUX/PRD.md`.

## Problem

Every new code (real or virtual) opens on the same default blue, and nothing helps avoid a colour a
sibling code already uses. Today the backend `_auto_color` cycles an 8-colour palette by index
(`PALETTE[count % 8]`) — a modulo cycle, not avoidance, that repeats from the 9th code — while the
frontend carries *two* further palettes (in `CodeEditor` and `VirtualCodeEditor`) whose hexes differ
from the backend's and from each other. The user wants colours chosen automatically at random,
avoiding those in use, and still be free to pick their own.

## What to build

**One curated palette of 64 colours**, all legible in both light and dark themes, as the single
source of truth: a constant mirrored backend (Python) / frontend (TS) with a **contract test**
asserting the two are identical (same pattern as `resolveTheme`/`resolve_theme` and
`virtualCodeResolution.contract.test.ts`). It **replaces** the backend `PALETTE`/`_auto_color` and
both frontend palettes. Display order is by hue (an 8×8 grid reads as a spectrum) — display ordering
only, no "family" semantics.

**Suggestion algorithm — least-used-first** (pure function, mirrored, contract-tested): pick
uniformly at random among the palette colours with the **minimal usage count** across the avoidance
set. While free colours remain, that's count 0 (= "avoid already chosen"); once all 64 are used it
degrades to count 1, then 2, … (graceful saturation). This one rule unifies avoidance and
saturation.

- **Avoidance set** = the colours of `list_codes(user)` (the user's visible codes — real + virtual).
  Model-agnostic w.r.t. the parked catalog re-scoping.
- **Counting is palette-only.** A colour not in the 64 (a legacy `_auto_color` hex, or one chosen via
  the analog selector) is displayed but does **not** count and lights **no** swatch.
- **In edit mode, exclude the edited code itself** — its own colour shows as *selected*, not as
  "already taken by another".

**Rich colour picker** (used in `CodeEditor` and `VirtualCodeEditor`), computed client-side from the
mirrored palette + the codes already loaded:

- Opens with the **suggested** colour pre-selected; a **🎲 button** re-rolls another colour from the
  current least-used set.
- A **grid of the 64 swatches**, hue-ordered; the selected swatch has an accent ring.
- A **used swatch** carries a small corner marker (dot/✓) and a hover **tooltip naming the code(s)**
  that use it. Used colours **remain selectable** — deliberate reuse is allowed, the marker only
  warns.
- The native **analog `<input type="color">`** stays alongside for any arbitrary hex.

Backend still assigns a least-used colour for any create path that omits a colour (e.g. an API
create with `color=None`), using the same mirrored function — so pickerless creation stays correct.

## Acceptance criteria

- [x] A single 64-colour palette exists once per side (Py + TS) with a contract test proving equality;
      the old backend `PALETTE`/`_auto_color` and both frontend palettes are gone.
- [x] Suggestion picks uniformly at random among minimal-usage-count palette colours; with free
      colours left it never repeats an in-use colour. Unit-tested incl. the all-64-used case.
- [x] Avoidance/counting is over `list_codes(user)`, palette-only, and excludes the edited code when
      editing. Covered by tests.
- [x] Both editors open on the suggested colour; 🎲 re-rolls; the swatch grid marks used colours with
      a marker + tooltip naming the code(s); used colours stay selectable; analog picker still works.
- [x] Selected swatch is visually distinct (ring); grid and markers read correctly in both themes.
- [x] Existing codes are not recoloured or migrated.

## Blocked by

None.
