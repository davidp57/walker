# Walker

Walker is a personal time tracker whose job is to make filling the PwC **Time & Expenses** (T&E)
timesheet painless. You track your time during the day against the real PwC charge codes; at the end
of each Timesheet period Walker shows you exactly what to enter into T&E — a T&E-shaped grid plus a
tick-as-you-go checklist.

The name is a nod to *Walker, Texas Ranger* (the previous internal tool was called "Texas").

> Status: **POC**, single user. Web app (FastAPI JSON API + React SPA), dockerized, SQLite.

## Documentation

| Topic | Document |
|---|---|
| Ubiquitous language (glossary) | [CONTEXT.md](CONTEXT.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| UI design brief (handoff) | [docs/design/handoff.md](docs/design/handoff.md) |
| Contributing / dev setup | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Backlog (per-lot) | [.backlog/README.md](.backlog/README.md) |
| Roadmap (sequencing) | [ROADMAP.md](ROADMAP.md) |

## Quickstart

```powershell
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -e .[dev]
walker                 # http://localhost:8000  (API under /api)
```

Frontend dev server: `cd frontend && npm install && npm run dev`.
Container: `docker compose up --build`.

## Standalone instance

For a stable instance you can leave running while another checkout is being actively worked on
(no `--reload`, no Vite dev server, own venv/`node_modules`/database):

```powershell
.\scripts\deploy-local.ps1 -Path C:\dev\walker-run
```

Then just double-click `C:\dev\walker-run\start-walker.bat` — it starts the server; open
`http://localhost:8000` yourself. Close its console window (or Ctrl-C) to stop it.

Then run the two commands it prints (`.venv\Scripts\Activate.ps1` + `uvicorn walker.api.app:app
--port 8000`) — this serves the API and the built SPA on one port. Re-run the script against the
same `-Path` later to pick up newer commits.

## License

Proprietary — All rights reserved.
