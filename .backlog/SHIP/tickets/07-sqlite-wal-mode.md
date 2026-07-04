# TEC-005 — Enable SQLite WAL mode for the hosted deployment

ID: TEC-005
Status: ⬜ ready
Type: technical
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Enable SQLite's WAL (Write-Ahead Logging) journal mode and foreign-key enforcement at application
startup, using an async SQLAlchemy engine — the same pattern already proven in production by the
author's Solde app (`backend/database.py`'s `init_db()`: `PRAGMA journal_mode=WAL`, `PRAGMA
foreign_keys=ON`). WAL lets concurrent readers proceed without blocking on a writer (SQLite still
allows only one writer at a time — this doesn't change that), which matters once the hosted,
multi-tenant instance (BIZ-028/029/030) has more than one active User. This is sized for this lot's
scale (a handful of Organization members) — not a substitute for an external DBMS if real
concurrent-write throughput is ever needed (tracked separately in `ROADMAP.md`).

## Acceptance criteria

- [ ] `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON` are issued at startup for the hosted
      deployment.
- [ ] The engine/session setup is async-compatible (matching Solde's `create_async_engine` +
      `check_same_thread: False` pattern), without regressing existing sync call sites unnecessarily.
- [ ] A test asserts the startup PRAGMA calls actually run (prior art: Solde's
      `tests/unit/test_database.py::test_init_db_does_not_create_tables`) — a regression guard, not a
      concurrency stress test.

## Blocked by

None — can start immediately.
