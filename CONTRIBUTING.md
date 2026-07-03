# Contributing to Walker

## Development setup

**Prerequisites:** Python 3.13+ and Node 22+.

```powershell
git clone <repo-url>
cd walker

# Backend
Copy-Item pip.conf.example pip.conf   # PwC only: fill in your Artifactory API key
$env:PIP_CONFIG_FILE = ".\pip.conf"   # so pip uses it (or rely on your global pip config)
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
Copy-Item .env.example .env      # adjust if needed
walker                            # serves API (+ SPA if built) on http://localhost:8000
pytest                            # all tests green

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev                       # Vite dev server, proxies /api to the backend
```

---

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production — reflects the latest release |
| `develop` | Integration — all PRs target this branch |
| `feature/<ticket>` | One branch per ticket (e.g. `feature/BIZ-003`) |

Workflow: `feature/<ticket>` → PR → `develop` → release PR → `main`. Administrative changes (backlog,
docs) may be committed directly on `develop` with explicit confirmation.

---

## Development workflow (TDD)

1. Write a failing test
2. Run the test — confirm it fails
3. Implement the minimum to pass
4. Run the test — confirm it passes
5. Refactor; keep tests green
6. Run the quality checks (below)

---

## Quality checks

Run before every push — all clean:

```powershell
# Backend
ruff check src tests
ruff format --check src tests
mypy src
pytest

# Frontend
cd frontend
npm run lint
npm run format:check
npm run build
npm run test
```

Coverage gate: global ≥ 80% (`fail_under` in `pyproject.toml`).

---

## Project structure

```text
src/walker/
  api/                  # FastAPI JSON API (thin adapter over services)
    app.py              # application factory (mounts /api, serves the built SPA)
    routers/            # one module per resource (health, …)
    schemas.py          # Pydantic schemas = the JSON contract
  services/             # domain logic, web-independent (imputation, aggregation, import…)
  models/               # SQLAlchemy models (base.py, user.py, …)
  config.py             # Settings (pydantic-settings, WALKER_* env)
  db.py                 # engine + session + FastAPI dependency
  exceptions.py         # WalkerError hierarchy
alembic/                # migrations (engine-agnostic)
tests/                  # pytest suite (mirrors src/); test_api_*.py for endpoints
frontend/               # React + Vite + TypeScript SPA
docs/adr/               # architecture decision records
docs/design/            # UI design brief (handoff.md)
CONTEXT.md              # ubiquitous language (glossary)
.backlog/               # per-lot planned work
```

---

## Error handling

Use typed exceptions from `walker.exceptions`. Always chain:

```python
from walker.exceptions import CatalogImportError

raise CatalogImportError("could not parse the catalog file") from e
```

---

## Commit messages

Conventional Commits, in English:

```
feat(BIZ-003): add one-click timer start

- POST /api/timer/start creates an uncategorized running entry
- switch closes the current entry and opens a new one
- unit + API tests
```

Update `CHANGELOG.md` and the ticket's `Status:` under `.backlog/` when a ticket is done.
