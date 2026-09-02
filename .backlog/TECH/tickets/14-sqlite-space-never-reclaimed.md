# TEC-020 — Walker never reclaims SQLite space after a bulk delete

ID: TEC-020
Status: ⬜ ready
Type: operability
Priority: P3

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Fallout from **TEC-019**, which gave the catalog import the
ability to delete reference codes in bulk for the first time.

## Problem

SQLite never shrinks a database file on its own. Deleted pages go on the free list and are reused by
later inserts, but the file keeps its high-water mark until a `VACUUM` rewrites it. Walker issues no
`VACUUM` anywhere, and until TEC-019 that barely mattered — nothing deleted rows in bulk.

TEC-019 changes that. A complete-catalog import can now delete hundreds of thousands of
`reference_codes` rows in one go, and the file stays exactly as large as the worst import that ever
ran against it.

This is not hypothetical. A botched import on 2026-09-02 (a headerless full-firm export, the
incident behind TEC-017) took a 4 MB `walker.db` to **322 MB**, with a WAL of the same size. That
particular database was restored from a copy, but the same shape happens without any mistake at all:
import the whole firm catalog once, prune it back to the codes you actually use, and the file stays
two orders of magnitude larger than its contents — carried around in every backup, and, for the
standalone `.exe`, sitting in `%APPDATA%\Walker` for good.

The user has no lever: Walker exposes no maintenance action, and there is no reason a time-tracking
app should send someone to a SQLite shell.

## Proposal

Reclaim the space when Walker has just created the waste — after a complete-catalog import that
removed a material number of rows — rather than on a schedule or a button nobody will find.

Points to settle in the ticket, not assumed here:

- **Where.** `VACUUM` cannot run inside a transaction, so it can't sit in `import_reference`'s
  session. It needs its own connection after the commit.
- **How long.** `VACUUM` rewrites the whole file and takes a write lock for the duration. On a
  300 MB database that is seconds, not milliseconds — long enough that doing it synchronously inside
  the import request is a real decision, not an implementation detail. TEC-018's 30 s
  `busy_timeout` makes a concurrent request wait rather than fail, which helps but does not make it
  free.
- **When.** Unconditionally after any prune, or only past a threshold (free pages, or a ratio of
  free to used)? A `VACUUM` after deleting three rows is pure cost.
- **Whether it belongs elsewhere too.** Deleting a code, or a period's worth of entries, frees far
  less; this ticket should not turn into a general autovacuum policy without a reason.
- **`PRAGMA auto_vacuum`** is a plausible alternative but must be set **before** the first table is
  created, so it cannot be turned on for existing databases without a full rebuild. Worth an
  explicit rejection rather than silence.

## Acceptance

- [ ] A complete-catalog import that prunes a large catalog leaves `walker.db` sized in proportion
      to what it now contains, not to its historical peak.
- [ ] The cost is bounded and documented: a small prune does not trigger a full rewrite.
- [ ] No `VACUUM` is attempted inside an open transaction (it would raise).
- [ ] `docs/catalog-import.md` states what the import does to the file on disk.
