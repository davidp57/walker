# Walker v1.1.0

**Walker goes mobile and gains a light theme.** This release ships a complete responsive phone
layout and a per-user dark/light/system theme, so Walker is comfortable to use on a phone and adapts
to how you like to look at it.

## Added

- **Per-user theme (dark / light / system).** Pick a theme in Settings; it's persisted server-side
  and follows your OS `prefers-color-scheme` by default. A full light palette now sits alongside the
  original dark one.
- **Responsive phone layout.** Walker is now fully usable on a phone:
  - a **bottom tab bar** for navigation in portrait,
  - the **Timesheet period grid reflows into day cards** instead of a wide matrix,
  - **touch-capable** timer, entry editing, and kanban drag-and-drop.

## Fixed

- The dark background is now painted on `html`/`body` with the correct `color-scheme`, removing a
  rendering defect at the page edges.

## Upgrading

No breaking changes, no manual migration steps — upgrade in place.
