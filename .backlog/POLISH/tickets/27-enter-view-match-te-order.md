# BIZ-068 — "Enter in Timesheet system" view: order rows to match the T&E grid

ID: BIZ-068
Status: 🧑 waiting-human
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Larger than a typical polish item (schema + import + migration);
may warrant its own ADR — see Open questions.

## Goal

Make data entry into the PwC Timesheet (T&E) painless by displaying Walker's **Enter in Timesheet
system** rows in the **same order as the T&E weekly grid**, so the user can go down Walker's checklist
and the T&E grid in lockstep.

## How T&E orders its grid (reverse-engineered)

From the T&E web app JS (`GlobalFunction.js` `SortAssignment`, reused in `TimeGrid.js`,
`TimeLines.js`, `WebServicesCall.js`). The grid rows are sorted by:

1. **Type block, fixed order:** `C` (Chargeable) < `N` (Non Chargeable) < `A` (Absence). Never
   intermixed — this produces the visible "Chargeable / Non Chargeable / Non Controlable" blocks.
2. **Within a Type:** alphabetical by `Customer.Name`, then by `Text` (the code label). **Case-
   sensitive** native JS string comparison — an uppercase letter sorts before a lowercase one at the
   same position; **no accent/locale normalization**.
3. **Tie-break (same ChargeCode):** by `ChargeActivity.Text` (activity label), alphabetical.

The comparator:

```js
function SortAssignment(a, b) {
  var result = 0;
  if (a.Type == b.Type) {
    if (a.Customer != null && b.Customer != null)
      result = a.Customer.Name == b.Customer.Name ? 0 : a.Customer.Name > b.Customer.Name ? 1 : -1;
    if (result == 0)
      result = a.Text == b.Text ? 0 : a.Text > b.Text ? 1 : -1;
  } else
    result = a.Type == "C" ? -1 : a.Type == "A" ? 1 : b.Type == "C" ? 1 : -1;
  return result;
}
```

Notes from the analysis:

- `ChargeCode.Order` (present in the `SearchChargeCodes` API) is **not** used for grid ordering
  (grep-confirmed) — do not rely on it.
- Rows can appear at 0h: those are the user's "favourite" codes, not real entries.
- A same code can appear twice (normal hours + `IsExtraHour` line) — out of scope here (Walker records
  real durations, ADR-0005; no extra-hour concept).

## Feasibility finding (why this needs new data)

Walker today stores, per code (`TimesheetCode` / `ReferenceCode`): `number`, `label`, `name`,
`color`, activities. It has **no `Type` (C/N/A) and no `Customer`** — the two primary T&E sort keys.
The catalog import CSV columns are `code_number, code_label, code_name, activity_code,
activity_label` (no type/customer). So the exact T&E order **cannot** be reproduced from current data.
The Enter view currently renders in the arbitrary order returned by the period aggregation
(`resolveChecklistRows` preserves insertion order; insertion follows the server's `minutes` map).

## Chosen approach — faithful order (data extension)

Decision (with the user): reproduce the **full** comparator, which requires capturing the missing
data rather than approximating.

Proposed design:

1. **Data model** — add nullable `type` (`C`/`N`/`A`) and `customer` (string) to the code catalog
   (`ReferenceCode`, and `TimesheetCode` real codes). Nullable so pre-extension codes still load; a
   missing key sorts last within its comparison step. Alembic migration.
2. **Catalog import** — extend the CSV format with optional `code_type` and `customer` columns,
   backward-compatible (absent columns → `NULL`). Update `services/catalog.parse_catalog_csv` +
   the API schema. Document the new columns.
3. **Sort** — implement the comparator (Type block C<N<A → `customer` → `label` → activity label),
   **case-sensitive, no locale/accent normalization** to match T&E exactly, and apply it to the
   Enter-in-Timesheet-system rows (after `resolveChecklistRows`). Review mode ordering is unchanged.
4. Codes missing `type`/`customer` degrade gracefully (grouped last / by label only) so the view is
   never worse than today.

## Open questions (resolve before building)

- **Source of `type` + `customer` values.** T&E's own API is the natural source but scraping/
  automating T&E is excluded by ADR-0005. Options: (a) an enriched catalog CSV the user fills in
  once; (b) a one-off manual/paste import; (c) revisit ADR-0005 for a read-only lookup. **This is the
  blocking decision** — the schema/import/sort work only pays off once values exist.
- Whether the schema change warrants a short ADR (new persisted fields + import-format change are
  moderately hard to reverse).

## Acceptance criteria (once the data source is settled)

- [ ] Codes can carry `type` (C/N/A) and `customer`; catalog import accepts the new optional columns;
      migration in place.
- [ ] The Enter-in-Timesheet-system view orders rows by Type block (C<N<A) → customer → label →
      activity, case-sensitive with no locale normalization, matching T&E.
- [ ] Codes lacking the new fields still render (degraded ordering), never crashing or hiding rows.
- [ ] Tests cover the comparator (incl. case-sensitivity and Type-block ordering) and the import of
      the new columns.
- [ ] Backend + frontend quality gates clean.

## Blocked by

Decision on the source of `type`/`customer` data (see Open questions) — do not build until settled.
