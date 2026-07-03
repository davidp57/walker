# UX — Post-MVP UX improvements (archived)

Status: ✅ done
Branch: feature/ux-* per slice → PR → develop

## Summary

A set of independently-shippable UX improvements surfaced by a UX review of the running MVP: a
faster, keyboard-first daily loop; a persistent uncategorized-Entry count; a safety net against
mis-clicks (undo delete, deferred add); a WCAG-AA readability pass; consistent nav/screen labels;
visible API errors and loading feedback; and a unified Fortnight grid merging Review and Enter in T&E
into one screen with a header toggle (ADR-0008-aware row grouping). Frontend-only — no API, schema, or
domain change; durations remain recorded and aggregated exactly as before (ADR-0005).

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-007 | Unified Fortnight grid with Review / Enter in T&E toggle | P2 | ✅ done |
| BIZ-008 | Enter-in-T&E checkbox affordance | P2 | ✅ done |
| BIZ-009 | Keyboard-driven timer loop | P2 | ✅ done |
| BIZ-010 | Uncategorized-Entry count | P2 | ✅ done |
| BIZ-011 | Entry mutation safety (undo delete, deferred add, clearer row actions) | P2 | ✅ done |
| BIZ-016 | Copy the T&E code from the Enter in T&E screen | P3 | ✅ done |
| TEC-001 | Running-Timer elapsed correct across midnight | P3 | ✅ done |
| TEC-002 | Visible API errors + loading feedback | P2 | ✅ done |
| TEC-003 | WCAG-AA contrast + minimum functional text sizes | P2 | ✅ done |
| CHR-001 | Label consistency + de-duplicate Code/Activity display | P3 | ✅ done |

## Verified against

- Frontend: 137 Vitest tests passing (up from 51 at VCODE); `eslint`, `prettier --check`, and
  `tsc --noEmit && vite build` clean on `develop` after every merge.
- Each ticket shipped on its own `feature/ux-*` branch → PR → `develop`, reviewed (Sourcery) and merged
  individually; cross-ticket merge conflicts (several tickets touched the shared `App.tsx`/
  `AppShell.tsx`/`FortnightGrid.tsx`) were resolved by hand at merge time, re-running the full quality
  gate after each resolution.
- Not done: a manual browser walkthrough of the merged result. All verification is automated
  (unit/component tests + build); a human pass over the daily loop, the unified grid's two modes, and
  the contrast/size changes in an actual browser is still worth doing before calling the lot fully
  trustworthy.

## Key implementation notes

- `FortnightScreen.tsx` now owns a local `mode` state (`review` / `enter`, default `review`, not
  persisted); the former `ChecklistScreen.tsx` was deleted, its fill-order/toggle/progress logic folded
  in. `FortnightGrid.tsx` is shared between modes — row grouping differs (Review: by code, virtual codes
  as their own rows; Enter in T&E: resolved to the real code, ADR-0008) but geometry, the Total column,
  weekend/absence styling, and the tinted read-only running-Timer cell are shared.
- The running Timer's cell needed virtual→real code resolution to correctly match Enter-in-T&E's
  merged rows (`enterRunningCell` in `FortnightScreen.tsx`, resolved in `App.tsx`); `checklistRows` is
  built from `gridRows` (live-minutes-folded) rather than the raw matrix so a timer running on a virtual
  code is still visible/read-only there.
- `elapsedSecondsSince(date, startMinute, nowMs)` (`lib/time.ts`) replaced local-midnight-based elapsed
  math, anchoring on the Entry's actual start so a Timer crossing midnight stays correct.
- Entry delete is now undoable (`deleteEntryWithUndo`/`undoDelete` in `App.tsx`, 6s window, recreates via
  the existing create endpoint — no dedicated restore endpoint); `+ Add entry` composes a local
  `addDraft`, persisting only on Save.
- A small `ToastProvider`/`useToast` (`lib/toast.tsx`, `lib/toastContext.ts`) surfaces API failures
  across the app instead of silent `.catch(() => {})`/`.catch(() => reload())` swallowing; screens gate
  their empty state on a `loading` flag so it no longer flashes before first data.
- `--wk-text-lo` lightened from ~3.2:1 to 4.68–5.38:1 against all dark-theme surfaces it's used on
  (WCAG AA ≥4.5:1); functional font-size tokens floored at 11px.
