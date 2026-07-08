# Importing your code catalog

Walker's charge codes come from your own timesheet system's catalog. You import that list once — and
re-import whenever it changes — and Walker keeps it as a searchable **reference catalog**. From there
you pick the handful of codes you actually charge to into your **active codes**.

## Two tiers: reference catalog vs active codes

- **Reference catalog** — the full list you import. It can be your whole organization's catalog
  (thousands of codes); Walker only ever searches it, never shows it in bulk.
- **Active codes** — the codes you actually track time against. In the **Code catalog** screen you
  search the reference catalog by number, project, or label and click a result to add it — with all
  its activities — to your active codes. The Timer, the Timesheet period view, and the checklist all
  work from your active codes.

## The CSV format

Import a CSV file with one row per **code × activity** (a code with several activities has several
rows). Two layouts are accepted:

- **With a header row** — the first row is exactly:

  ```csv
  code_number,code_label,code_name,activity_code,activity_label
  ```

- **Headerless export** — four columns, no header row:

  ```csv
  code_number,code_label,activity_code,activity_label
  ```

  Here `code_name` defaults to `code_label`.

| Column | Meaning |
| --- | --- |
| `code_number` | The charge code as your timesheet system knows it (e.g. `N9/1042`) |
| `code_label` | The code's technical label |
| `code_name` | A friendlier display name (optional; defaults to the label) |
| `activity_code` | The activity's code under that charge code |
| `activity_label` | The activity's label |

Quoted fields may contain commas, and a UTF-8 byte-order mark (BOM) is tolerated — so a raw export
from a spreadsheet or database tool usually imports as-is.

## Importing

In the **Code catalog** screen, choose **Import from file** and pick your CSV. Import **upserts by
`code_number`**, so re-importing an updated export is idempotent: existing codes are updated in place,
new ones are added, and a color is auto-assigned to each. Large catalogs (thousands of codes) import
in a couple of seconds and stay responsive, because the catalog and the code picker render a capped
slice and rely on search.

## Producing the CSV

How you produce the file depends on your timesheet or ERP system — typically an export, or a query
against its catalog tables, that yields the columns above in order. Any tool that can output CSV
works; if you use the four-column layout, no header row is needed. Narrow the export to just the
codes you might charge to if the full catalog is very large.
