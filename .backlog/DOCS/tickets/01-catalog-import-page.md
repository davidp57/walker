# CHR-011 — Public catalog-import page (generic CSV format, EN/FR)

ID: CHR-011
Status: ✅ done
Type: chore
Priority: P2

## Parent

Lot DOCS — `.backlog/DOCS/PRD.md`.

## What to build

The published docs site alluded to importing a code catalog (in the day-to-day guide) but had no page
explaining the CSV format. Add a user-facing **Importing your code catalog** page to `docs-site/`,
bilingual EN/FR, covering:

- the two-tier model (reference catalog vs active codes),
- the accepted CSV layouts (headered `code_number,code_label,code_name,activity_code,activity_label`,
  and the headerless 4-column export), quoting/BOM tolerance, one row per code × activity,
- how to import (**Code catalog → Import from file**), idempotent upsert by `code_number`,
- a generic "producing the CSV" note (export/query from your timesheet/ERP system).

Wire it into the nav (+ `nav_translations`), and cross-link it from the guide's charge-codes section.

**Explicitly generic**: no organization-internal specifics (e.g. a particular employer's SAP/Datahub
SQL query). That detail stays in the internal `docs/catalog-import.md`, which is not published.

## Acceptance criteria

- [x] `docs-site/catalog-import.md` and `catalog-import.fr.md` exist and describe both CSV layouts.
- [x] The page is in the nav with a translated French label; the guide links to it (EN + FR).
- [x] No employer-internal SQL/schema on the public site (kept in internal `docs/`).
- [x] `mkdocs build --strict` passes; both language variants build.

## Blocked by

None.
