# Code colour automation + unified code-selection UX — PRD

Status: ⬜ ready
Lot: CODEUX
Branch: feature/* per ticket → PR → develop

## Problem Statement

Two rough edges around how codes are coloured and picked:

1. **Colour is a chore and never distinct.** Every new code (real or virtual) opens with the same
   default blue; there's no help avoiding a colour a sibling code already uses. The backend
   `_auto_color` only cycles an 8-colour palette by index (modulo, no avoidance), and the frontend
   keeps *two* more palettes that disagree with it and with each other. The user wants colours picked
   **automatically at random, avoiding those already in use**, while still being free to choose.

2. **Code selection is inconsistent.** The rich `CodePicker` (search, colour dot, reference-catalog
   lookup, create-on-the-fly) is used to categorize entries and set a task's code, but creating a
   **virtual code** picks its backing real code through a bare `<select>` — no search, unusable with
   many codes. Search behaviour also differs surface to surface (ordering, whether the reference
   catalog is searched at all).

## Solution

A single curated **64-colour palette** (one source of truth, mirrored backend/frontend with a
contract test), an automatic **least-used-first** colour suggestion, and a **rich colour picker**
(swatch grid + used-markers + analog selector) shown wherever a code is created — plus a **unified,
tiered code search** applied to *every* code picker, including virtual-code creation.

Two tickets, sequenced BIZ-048 → BIZ-049:

- **BIZ-048** — Automatic colour suggestion + rich colour picker.
- **BIZ-049** — Unified tiered code search across all pickers + rich backing-code selector for
  virtual codes.

## Out of Scope

- **Re-scoping the catalog** (reference → Organization, activated real codes → User). A separate,
  larger decision that supersedes ADR-0010 and needs a migration; parked in `IDEAS.md`. This lot is
  deliberately **model-agnostic**: the colour avoidance set and the search's user-scope tier are both
  defined as "the codes `list_codes(user)` returns", which stays correct under either scoping.
- **Deriving a virtual code's colour from its real parent** (shades of one hue). Considered and
  dropped — the single random-from-palette mechanism applies to real and virtual codes alike.
- **Recolouring or migrating existing codes.** Existing colours are left untouched; the new logic
  only governs new assignments and suggestions.
