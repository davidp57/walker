# Walker v1.6.0

**Headline:** timesheet entry that lines up with the Timesheet system. The *Enter in Timesheet
system* view now lists rows in the **same order as the Timesheet system's weekly grid**, and you can
**create a task straight from a project section**. The rest of the release hardens reliability — no
more crash when deleting a code, several UI fixes, and a packaging fix that restores the standalone
`.exe`.

## Highlights

### Enter view ordered like the Timesheet system's grid
- Rows in *Enter in Timesheet system* are now sorted the way the Timesheet system's weekly grid sorts
  them — by type block (Chargeable → Non-chargeable → Absence), then customer, then code label, then
  activity — so you can key Walker's checklist and the Timesheet system in lockstep.
- **Visible once your catalog carries the ordering data:** re-import an enriched catalog CSV providing
  the new `customer` and `code_type` columns (a re-import also backfills your already-active codes).
  Codes without that data still show, ordered by label.

### Add a task from a project section
- When tasks are grouped by project, each list section header and each kanban swimlane gets an **Add**
  button that opens the new-task panel with that project's code already filled in.

### Reliability & UI fixes
- Deleting a code that a task or a checklist tick referenced no longer errors — the tasks are kept
  (their code cleared) and the stale ticks removed. Codes still in use by tracked time stay protected.
- The code selector now opens **above** the cell drill-down dialog in the Timesheet-period view,
  instead of behind it.
- The task description no longer keeps its placeholder text visible after you paste into it.
- Removed the second, unintended vertical scrollbar.

## Upgrade notes
- **Database migration required.** Run `alembic upgrade head` (revision `b1c2d3e4f5a6`); it adds two
  **nullable** columns (`customer`, `code_type`) to the code tables. Backward-compatible — existing
  codes keep loading (keys `NULL`, sorted last), no data touched. The standalone `walker.exe` applies
  this automatically on startup.
- **Catalog import format extended (backward-compatible).** A new 7-column layout
  `code_number,code_label,code_name,customer,code_type,activity_code,activity_label` is accepted; the
  previous 5-column (headered) and 4-column (headerless) layouts still work. `customer`/`code_type`
  are optional.
- **Standalone `.exe` startup fix.** A packaging issue prevented a freshly built `walker.exe` from
  running its startup migration. Rebuild from 1.6.0 to get a working executable.
- No breaking API or behaviour changes.
