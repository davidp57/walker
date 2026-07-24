# BIZ-082 — Settings screen refinement pass (impeccable critique)

ID: BIZ-082
Status: ✅ done
Type: refinement
Priority: P1

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. UI refinement of the Settings screen driven by an `impeccable`
design critique (27/40; snapshot in `.impeccable/critique/`).

## Problem

The segmented controls (Density / Period scheme / Theme) and the workday toggles were plain buttons —
invisible to assistive tech: no roles, selected state conveyed by colour alone, no focus ring, and no
headings anywhere for an outline. Changes saved silently and irreversibly (the period-scheme change
reshapes the whole grid with no acknowledgement), the screen overflowed horizontally on mobile, a
multi-day absence showed only its start day, and an internal "(ADR-0009)" reference leaked into copy.

## Solution (frontend-only)

- **Accessibility** — a `SegmentedControl` exposes each group as a labelled `radiogroup` with
  `aria-checked` radios and Arrow-key roving selection; day toggles get `role=group` + `aria-pressed`
  and a weight cue (not colour alone); accent `:focus-visible` rings added. Screen title → `h1`,
  section titles → `h2`.
- **Save feedback** — a transient "✓ Saved" readout beside each changed control; a heads-up on the
  period-scheme that changing it reshapes the period view immediately.
- **Responsive** — the absence add-row wraps and the two-column cards stack under 640px (no sideways
  scroll).
- **Absence ranges** — consecutive same-reason days re-collapse into one "start → end" chip whose ✕
  removes the whole range; the end date is labelled "to (optional)".
- **Copy** — the "(ADR-0009)" developer reference removed.

## Acceptance criteria

- [x] Each segmented control is a labelled radiogroup with a checked radio and Arrow-key nav.
- [x] Day toggles expose `aria-pressed`; "on" isn't colour-only; controls have focus rings.
- [x] Heading outline present (h1 + section h2s).
- [x] A preference change flashes "✓ Saved"; period-scheme carries a reshape note.
- [x] No horizontal overflow at 375px; multi-day absences show and remove as a range.
- [x] Frontend quality gate clean; settings tests updated (a11y, feedback, ranges).
- [x] Verified live on prod-shaped data (incl. 375px mobile).

## Delivery

Shipped via the `feature/redesign-tasks-catalog-settings` redesign PR → `develop`.

## Blocked by

None.
