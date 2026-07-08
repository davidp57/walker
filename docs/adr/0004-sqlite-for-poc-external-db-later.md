# Database: embedded SQLite for the POC, engine-agnostic for an external DB later

Walker is first a single-user POC, used 99% locally. Medium-term it might be deployed for a small team,
even become a real product — without wanting to block ourselves.

We start with **embedded SQLite** (a file on a Docker volume) for the POC, but data access stays
**engine-agnostic** (SQLAlchemy + Alembic), so we can later switch to an **external SQL DBMS** —
PostgreSQL, or likely **SQL Server** given a Microsoft-stack context.

## Considered Options

- **External DBMS from day one (rejected for now)**: avoids any migration, but it's too much ops for a
  single-user POC.
- **Embedded SQLite, engine-agnostic code (chosen)**: trivial ops now; switching to an external engine
  = config change + migration, no rewrite.

## Consequences

- **SQLAlchemy + Alembic** from the start; avoid dialect-specific SQL.
- Keep the connection string / dialect configurable (env var).
- The SQLite file lives on a Docker volume (persistence + backup = file copy).
