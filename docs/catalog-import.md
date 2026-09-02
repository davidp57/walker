# Code catalog import

The catalog is two-tiered:

- **Reference catalog** (`ReferenceCode`) — the full imported list (can be the whole firm catalog).
  The CSV import populates *this* table. It is only searched, never shown in bulk.
- **Active codes** (`TimesheetCode`) — the handful you actually charge to. In the **Code catalog**
  screen you search the reference catalog by number / project / label and click a result to add it
  (with all its activities) to your active codes. Entries, the Timesheet period view, and checklist
  use active codes.

The importer (`walker.services.catalog.parse_catalog_csv`) accepts three CSV layouts:

- **Enriched headered** (BIZ-068) — first row is
  `code_number,code_label,code_name,customer,code_type,activity_code,activity_label`, carrying the
  T&E grid-ordering keys (`customer` client name, `code_type` a single char C/N/A).
- **Headered** — first row is `code_number,code_label,code_name,activity_code,activity_label`
  (`customer`/`code_type` stay unset).
- **Headerless export** — four columns `code_number,code_label,activity_code,activity_label`
  (`code_name` defaults to `code_label`). Quoted fields may contain commas; a UTF-8 BOM is tolerated.

Only the four-column layout may omit its header. A file whose rows are *uniformly* five or seven
fields wide but whose first row isn't a recognised header is **rejected** rather than parsed: it is a
headered export whose header line was dropped (a SQL client with column names turned off), and read
as headerless every field shifts left — `code_name` becomes `activity_code` and the trailing columns
collapse into one activity label, silently corrupting the catalog. A *ragged* file is still accepted:
that is the genuine headerless layout with unquoted commas in its labels.

Import upserts by `code_number` (re-importing is idempotent); colors are auto-assigned from a palette.

## Complete-catalog import (TEC-019)

The import never removes anything by default, which is right for a scoped extract and wrong for a
full export: a charge code closed in the source system since the previous import stays in the
reference catalog for ever and keeps being suggested. `POST /api/catalog/import` therefore takes a
`complete_catalog` form flag (surfaced as a checkbox on the import dialog). When set,
`reference.import_reference` additionally deletes the reference codes the file omits.

The pruning is confined to `ReferenceCode`. `TimesheetCode` rows and their Entries are never touched:
activating a code copies it, so an active code outlives its reference row. The flag defaults to off
because a partial file plus pruning empties the catalog.

### Codes the complete catalog no longer contains (BIZ-092)

Leaving active codes alone is right, and it is not the whole job: a code you still charge to that the
complete catalog omits has almost certainly been closed in the Timesheet system, and Walker used to
say nothing. `import_reference` therefore also **reconciles the active codes** when
`complete_catalog` is set:

- real codes whose number the file carries have `missing_from_catalog_at` cleared;
- real codes it omits get the timestamp set (first occurrence only — re-importing the same narrow
  file must not make an old problem look new) and are returned in `ImportOutcome.orphaned`, each with
  the virtual codes it backs.

The dependent virtual codes matter most for a `backing_only` row: the user sees a healthy virtual
code while what it actually charges to is locked, and the backing is by construction not inspectable.

Nothing is retired or repointed automatically, and a *partial* import reconciles nothing at all.
Absence from a scoped file is not evidence: `N0/6061169/010` was reported missing on 2026-09-02 only
because the export's scope was `N9`/`N1`, while the code was perfectly open. `CodeRead` exposes the
state as `missing_from_catalog` (a virtual code reports its backing's) so the catalog can show it
after the import message is gone.

## Example source query

The exact query depends on your own system; the one below is **illustrative only** — adjust the
table and column names to match your catalog. It produces the four headerless columns above, in
order, ready to export to CSV and import via **Code catalog → Import from file**.

```sql
-- Illustrative example only — will not run as-is; adapt names to your own system.
SELECT
    w.wbs_code        AS code_number,
    w.wbs_text        AS code_label,
    a.activity_code,
    a.activity_label
FROM erp_wbs w
JOIN erp_activities a ON a.wbs_code = w.wbs_code
WHERE w.locked = 'N'
ORDER BY w.wbs_code, a.activity_code;
```

Notes:

- Filter to just the codes you actually charge to — a firm-wide catalog can run to thousands of
  codes and rows. Walker's Code catalog and code-picker render a capped slice and rely on **search**,
  so even large imports stay responsive; import is a couple of seconds.
