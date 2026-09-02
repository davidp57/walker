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

!!! warning "Only the four-column layout may omit its header"

    If your export has five columns, it needs the header row. Walker refuses a headerless file that
    wide instead of misreading it — without the header every field shifts left, `code_name` is taken
    for `activity_code`, and the catalog is quietly filled with nonsense. Most SQL clients omit
    column names unless asked: in SSMS that is *Include column headers* in the results options.

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

### Getting rid of codes that no longer exist

An import adds and refreshes, but by default it removes nothing — so a charge code that has since
been **closed in your timesheet system** stays in Walker's reference catalog and keeps being
suggested, long after you can still book to it.

To clear those out, tick **"This file is my complete catalog"** on the import dialog. Codes absent
from the file are then removed from the reference catalog. Only the reference catalog is pruned:
codes you have already added to your own list stay, along with all the time booked to them.

Leave it unticked whenever the file covers only part of your catalog — combined with pruning, a
partial file would wipe everything it doesn't mention.

### Codes you charge to that the catalog no longer lists

Pruning never touches the codes in your own list, which is why a charge code **closed in your
timesheet system** used to stay in Walker for good, offered in every picker with nothing saying it
was dead.

After a complete-catalog import, Walker now tells you which of your codes the file didn't contain,
and offers the two things worth doing about it:

- **Retire it** — right when the charge line really has closed. Time already booked to it is
  untouched; the code simply stops being offered.
- **Repoint it** — when other codes of yours charge *through* it. Pick the replacement and every one
  of them follows in a single step.

This matters most for a code you cannot see. When you create a code that charges to an existing one,
Walker keeps that underlying code hidden — so your code can look perfectly healthy in the catalog
while what it actually charges to has been locked for months. Walker names those dependent codes
explicitly for that reason.

**Nothing is changed for you.** A code can be missing simply because your export covered part of the
catalog rather than all of it, and retiring a code you still book to would be the worse mistake. The
note stays on the code in the **Code catalog** afterwards, so a decision you postpone doesn't quietly
disappear.

## Producing the CSV

How you produce the file depends on your timesheet or ERP system — typically an export, or a query
against its catalog tables, that yields the columns above in order. Any tool that can output CSV
works; if you use the four-column layout, no header row is needed. Narrow the export to just the
codes you might charge to if the full catalog is very large.
