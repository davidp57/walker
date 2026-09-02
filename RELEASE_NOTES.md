# Walker 1.14.0 — the catalog import learns to say no, and to forget

Importing your code catalog becomes trustworthy in both directions. Walker now refuses a file it
cannot read correctly instead of swallowing it sideways and reporting success — and it finally knows
how to *forget*: a charge code closed since your last export can be dropped from the catalog rather
than being offered for ever.

If you never import a catalog, this release changes nothing for you.

## Your catalog can forget a closed code

Until now an import only ever added and refreshed. A charge code closed in the Timesheet system
after your last export stayed in Walker's reference catalog permanently — struck through and
padlocked over there, perfectly live here, and suggested every single time you went looking for a
code. Re-importing could not remove it, because import had no notion of removal at all.

**Import from file** now opens a short dialog carrying one decision: **"This file is my complete
catalog"**. Tick it, and the reference codes your file doesn't contain are removed.

The pruning stops at the reference catalog. Codes you have already added to your own list stay
exactly where they are, along with every minute booked to them — adding a code *copies* it, so it
outlives the reference entry it came from.

The box is off by default, and should stay off whenever your export covers only part of your
catalog: combined with pruning, a partial file removes everything it doesn't mention.

## A file Walker can't read is refused, not misread

Most SQL clients only emit column names if you explicitly ask them to, and the five- and
seven-column layouts cannot be recognised without them. Walker used to fall back to the four-column
headerless layout, which shifts every field one place to the left: the project name was read as the
activity number, and everything after it collapsed into a single activity label.

Nothing failed. The import reported success, and the catalog quietly filled with codes labelled
after countries and activities named after customers.

Such a file is now rejected, with a message naming the exact header line to add. Genuinely
headerless four-column exports are unaffected, including those with unquoted commas inside labels.

## A long import no longer trips over itself

SQLite allows one writer at a time, and a bulk catalog import holds the write lock for far longer
than the five seconds the database driver waits by default — so anything else touching Walker at
that moment gave up with *"database is locked"* rather than waiting its turn. Walker now waits
thirty seconds.

## Before you upgrade

**No migration.** No model changed in this release, so there is no new Alembic revision to run.

**One behaviour change.** A five- or seven-column CSV *without* a header line used to be accepted
(and imported incorrectly); it is now rejected with a `400`. If you have scripted the import around
a raw SQL-client export, add the header line to it:

```csv
code_number,code_label,code_name,customer,code_type,activity_code,activity_label
```

The historical four-column headerless layout still imports exactly as before.

**One thing to be careful with.** Ticking "This file is my complete catalog" on a partial file
deletes the rest of your reference catalog. Your active codes and your tracked time are never
affected, but the reference catalog is.

## Also worth knowing

The published documentation is up to date in both English and French — the accepted CSV layouts,
when the header row is mandatory, and what the complete-catalog box does.

If an earlier bad import inflated your database file, note that **pruning it back does not shrink
the file**. SQLite reuses the freed pages for future writes but never returns the space to disk
without a `VACUUM`, which Walker does not run. A database that ballooned during a mistaken import
stays that size; restore a backup, or run a `VACUUM` by hand. Teaching Walker to reclaim the space
itself is tracked as TEC-020.
