# Walker is a dockerized web app with a database and a persistent timer

Walker is a daily tracking tool: always-visible timer, fast task switching, military time entry. These
UX expectations (inherited from Clockify) call for a reactive, always-available interface.

We chose to ship Walker as a **dockerized web app**, backed by a **database**, with a **server-side
persistent timer** (the in-progress entry survives a container or browser restart), rather than a
terminal TUI or a CLI + daemon.

## Considered Options

- **TUI (Textual) — rejected**: lightweight and all-Python, but less faithful to the Clockify UX and
  tied to the terminal; persisting the timer still needs storage.
- **CLI + daemon — rejected**: simplest, but the "visible timer / click to switch" UX is poorest.
- **Dockerized web app — chosen**: closest to Clockify (timer bar in the browser, reachable
  anywhere), at the cost of a real frontend and a server stack.

## Consequences

- Needs a server stack (API) — specified in ADR-0003 — and a database engine — specified in ADR-0004.
- Because the timer is persistent and server-side, the in-progress entry state lives in the DB, not
  just the browser.
- Deployment via Docker (image + volume for the database).
