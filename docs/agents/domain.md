# Domain docs

Single-context repo.

- Domain language / glossary: `CONTEXT.md` at the repo root.
- Architectural decisions: `docs/adr/`.

Skills that read domain context (`to-prd`, `to-issues`, `improve-codebase-architecture`,
`diagnosing-bugs`, `tdd`) should read `CONTEXT.md` and consult `docs/adr/` for prior decisions in the
area being changed. Use the glossary's exact vocabulary (don't drift to synonyms it lists under
_Avoid_). If your output contradicts an ADR, surface it explicitly rather than silently overriding.
