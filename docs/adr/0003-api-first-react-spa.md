# API-first: FastAPI (JSON API) + React SPA, single image at first

Walker aims eventually for multi-user and possible integrations / other clients (mobile). A server
that only returned HTML (server-rendered, HTMX) provides no JSON contract: adding an external client
would force retrofitting an API afterwards, which rarely ends clean.

So we chose an **API-first** architecture: **FastAPI exposes a JSON API** that is the source-of-truth
contract, and a **React SPA (Vite + TypeScript)** consumes it. The compiled React bundle is **served
as static files by FastAPI** (single Docker image at first); the API lives under `/api`.

## Considered Options

- **Server-rendered + HTMX (rejected)**: lightest on JS, but no JSON contract → blocks any integration
  / other frontend without a rewrite. Disqualifying given the ambition.
- **Svelte / Vue + Vite (viable)**: lighter than React, less boilerplate. Set aside in favor of React
  for ecosystem and "product / team" scaling. Reconsider only to minimize dependencies.
- **React + Vite + TypeScript (chosen)**: the largest, most standard ecosystem for an API-first SPA;
  the cost (boilerplate) is absorbed in development.

## Consequences

- Introduces a **JS/TS toolchain** (Vite, eslint/prettier, vitest) alongside Python: the quality gate
  and CLAUDE.md will have a separate **frontend section**.
- **Shared types** between the API schemas (Pydantic) and the TS client to set up (generate types from
  the OpenAPI spec, TBD).
- One image at first (FastAPI serves the static bundle); split later (separate front / nginx) only if
  multi-user hosting requires it.
