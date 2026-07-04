# Walker v1.0.0

Walker's first release: a personal time-tracking app built to make filling out a Timesheet system
painless — now ready to run standalone (Docker or a Windows `.exe`) or hosted for a small team.

## Time tracking

- Capture-first Timer: start in one click with no input, categorize later.
- A Timesheet period view (weekly / semi-monthly / monthly, configurable per user) mirrors what
  you'll key into your Timesheet system, with an entry checklist to track what's already been
  entered.
- Virtual codes: create your own finer-grained codes that resolve back to a real Timesheet code
  when it's time to report.
- Real-code catalog import via CSV.

## Task management

- Tasks with markdown descriptions, status, priority, due date, tags, and an optional linked code.
- List and kanban views, with drag-and-drop between columns.
- Start a Timer directly from a Task; stop-and-complete in one action.
- Recurring tasks that roll their due date forward on completion.

## Multi-tenant & sign-in (hosted deployments)

- Organizations: teammates on the same email domain automatically share one real-code catalog.
- Sign in with Google, Apple, or Microsoft on the hosted instance.
- Standalone Docker/`.exe` installs stay login-free, exactly as before.

## Deployment

- A self-migrating Docker image, published to `ghcr.io/davidp57/walker` on every version tag.
- A standalone Windows `.exe` (no Python/Node install required), attached to each GitHub Release.
- A public documentation site.

## Under the hood

- SQLite WAL mode for better concurrent access on hosted deployments.
- CI quality gates (backend + frontend) required before every merge to `develop`/`main`.
