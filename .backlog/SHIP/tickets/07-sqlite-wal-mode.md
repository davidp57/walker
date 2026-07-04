# TEC-005 — Enable SQLite WAL mode for the hosted deployment

ID: TEC-005
Status: ✅ done
Type: technical
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Enable SQLite's WAL (Write-Ahead Logging) journal mode and foreign-key enforcement at application
startup — the same PRAGMAs already proven in production by the author's Solde app
(`backend/database.py`'s `init_db()`: `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`). WAL lets
concurrent readers proceed without blocking on a writer (SQLite still allows only one writer at a
time — this doesn't change that), which matters once the hosted, multi-tenant instance
(BIZ-028/029/030) has more than one active User. This is sized for this lot's scale (a handful of
Organization members) — not a substitute for an external DBMS if real concurrent-write throughput is
ever needed (tracked separately in `ROADMAP.md`).

**Correction vs. the PRD's wording**: Solde uses an async SQLAlchemy engine, but Walker's existing
`src/walker/db.py` is entirely **sync** (`create_engine`/`Session` throughout every router and
service). Do **not** port Walker to async SQLAlchemy for this ticket — that would be a large,
unrelated rewrite far outside this ticket's scope. The two WAL/foreign-key PRAGMAs work identically on
a sync connection; issue them against Walker's existing sync `engine` (e.g. via a `sqlalchemy.event`
listener on `connect`, or an explicit call during app startup) without changing the engine's
sync/async nature.

## Acceptance criteria

- [x] `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON` are issued on Walker's existing sync engine
      at startup (or per-connection), with no change to its sync nature.
- [x] A test asserts the PRAGMA calls actually run and take effect (prior art for the *intent*, adapted
      to a sync test: Solde's `tests/unit/test_database.py::test_init_db_does_not_create_tables`) — a
      regression guard, not a concurrency stress test.

## Blocked by

None — can start immediately.
