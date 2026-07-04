# Code catalog import

The catalog is two-tiered:

- **Reference catalog** (`ReferenceCode`) — the full imported list (can be the whole firm catalog).
  The CSV import populates *this* table. It is only searched, never shown in bulk.
- **Active codes** (`TimesheetCode`) — the handful you actually charge to. In the **Code catalog**
  screen you search the reference catalog by number / project / label and click a result to add it
  (with all its activities) to your active codes. Entries, fortnight, and checklist use active codes.

The importer (`walker.services.catalog.parse_catalog_csv`) accepts two CSV layouts:

- **Headered** — first row is `code_number,code_label,code_name,activity_code,activity_label`.
- **Headerless export** — four columns `code_number,code_label,activity_code,activity_label`
  (`code_name` defaults to `code_label`). Quoted fields may contain commas; a UTF-8 BOM is tolerated.

Import upserts by `code_number` (re-importing is idempotent); colors are auto-assigned from a palette.

## Source query (Datahub)

Regenerate the catalog with this query, then export the result to CSV and import it via
**Code catalog → Import from file**. The four output columns line up 1:1 with the headerless format
above, so no header row or post-processing is needed.

```sql
SELECT
    w.Code            AS CodeTimesheet,
    w.Text            AS LibelleWbs,
    a.CodeActivite,
    a.LibelleActivite
FROM TS.Wbs w
INNER JOIN (
    SELECT POSKI, VORNR AS CodeActivite, MIN(LTXA1) AS LibelleActivite
    FROM SAP.AFVC
    WHERE ISNULL(LOEKZ,'') <> 'X'
      AND LTXA1 NOT LIKE '%do not use%'
    GROUP BY POSKI, VORNR
) a ON a.POSKI = w.Code
WHERE w.LockDate >= CAST(GETDATE() AS date)
  AND w.Code LIKE 'N[1,9]/%'
ORDER BY w.Code, a.CodeActivite;
```

Notes:

- `w.Code LIKE 'N[1,9]/%'` keeps `N1/…` and `N9/…` charge codes and **excludes** the `N0/…` training
  catalog (`Attend-…` codes with event-date "activities"), which alone runs to ~50k rows. `w.LockDate
  >= today` keeps active codes.
- Even filtered this is a firm-wide catalog (~9k codes / ~16k rows). Walker's Code catalog and the
  code-picker render a capped slice and rely on **search**, so large imports stay responsive; import
  is a couple of seconds. Narrow the `WHERE` clause further if you only ever charge to a handful of
  engagements.
