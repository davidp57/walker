# BIZ-092 — A complete-catalog import says nothing about the active codes it just orphaned

ID: BIZ-092
Status: ⬜ ready
Type: correctness
Priority: P1

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Direct follow-up to **TEC-019**, which gave the import the
ability to prune the reference catalog. Reuses the retire flow from **BIZ-090** and the virtual-code
backing from **ADR-0012** / **BIZ-075**.

## Problem

TEC-019 lets an import declare itself the complete catalog, after which reference codes the file
omits are deleted. Active codes are deliberately left alone: activating a code *copies* it into
`timesheet_codes`, so it outlives its `reference_codes` row, and the Entries booked to it are real
captured time that must not vanish.

That is the right call, and it is also where the story stops. Nothing tells the user that a code
they are still charging to **no longer exists in the catalog they just imported**. The import knows
— it has the full set of imported numbers in hand — and stays silent.

Observed on the real database, 2026-09-02, immediately after the first complete-catalog import
(1 647 added, 8 711 updated, 420 removed). Four active real codes were left with no reference row:

| Code | Name | In Datahub |
| --- | --- | --- |
| `N9/6029442/010` | Mnt - ScanUp | closed 2026-08-25 |
| `N9/6234539/010` | Prj - Techno Transfo - Migration .Net | closed 2026-08-25 |
| `N9/6183466/040` | Prj - Techno Transfo - Cloud Migration | closed 2026-07-16 |
| `N0/6061169/010` | Attend - eLearning (generic code) | **open** — the export's scope was too narrow |

The worst case is the third: it is `backing_only`, the **hidden** real code behind the virtual code
*PRJ - Workday Interview Planner*. The user sees a healthy virtual code in their catalog; what it
actually charges to has been locked in the Timesheet system since July. Nothing on screen says so,
and the hidden backing is by construction not something they can inspect.

The fourth row matters for the design: **absence from the file does not prove the code was closed.**
A scoped export produces exactly the same signal. Whatever Walker does here must therefore be a
prompt, never an automatic decision.

## Proposal

Three connected pieces, in the order they matter:

1. **Report it.** A complete-catalog import returns the active codes whose number the file did not
   contain — real codes and `backing_only` backings alike, with the virtual codes each backing
   supports, since that is the part the user cannot see.
2. **Offer the two real remedies from the alert**, rather than sending the user off to find them:
   - **Retire** the code (BIZ-090) — right when it really is closed. Its Entries stay untouched.
   - **Repoint** it — for a backing, pick a new real code for the virtual codes that depend on it;
     the successor is usually right there in the freshly imported catalog. This is the case the user
     actually hit, and today it is only reachable by editing the virtual code and knowing to look.
3. **Mark it in the Code catalog**, so the information survives the toast. The screen already has a
   `Retired (n)` chip; an equivalent affordance for "no longer in your catalog" keeps a code that was
   dismissed once from silently becoming normal again.

Do **not** auto-retire. See the `N0` row above: the same signal is produced by a narrow export, and
retiring a code the user still books to would be a worse failure than staying quiet.

## Open questions

- Is "not in the imported catalog" **state** (a column, set at import) or a **derived** fact
  (computed by joining `timesheet_codes` to `reference_codes`)? Derived is cheaper and cannot go
  stale, but it silently changes meaning if the reference catalog is ever empty or partial. State
  survives that, at the cost of a migration and of deciding when it gets cleared.
- Does a *partial* import (the default) report anything? It has no basis to: absence from a scoped
  file means nothing. Probably strictly a complete-catalog concern — say so explicitly.
- Where does the alert live so it isn't lost? The current import feedback is a one-line message that
  the next action wipes.
- Repointing a backing affects every virtual code that shares it. Show them, and confirm once for
  all of them rather than one at a time.

## Acceptance

- [ ] After a complete-catalog import, active real codes absent from the file are listed, each with
      the virtual codes it backs when it is a hidden backing.
- [ ] Retiring and repointing are both reachable from that list; neither happens on its own.
- [ ] The state is visible in the Code catalog after the message is gone.
- [ ] A partial (non-complete) import reports nothing of the sort.
- [ ] Entries booked to an affected code are untouched in every path.
