# Ideas inbox

Raw, unsorted improvement/fix ideas — captured here as they come up in conversation, not triaged or
acted on immediately. Periodically reviewed: worked ideas become `.backlog/` tickets (or an ADR, or
get closed as wontfix) and are removed from this file. See `CLAUDE.md`.

- 2026-07-09 — Re-scope the code catalog (supersedes ADR-0010). Make the **imported reference
catalog** (`ReferenceCode`) Organization-scoped (import once per org, no redundant re-import), but
make the **activated real codes** (`TimesheetCode` with `real_code_id IS NULL`) User-scoped again —
each user activates/imputes against their own subset. Virtual codes stay per-user. Rationale:
ADR-0010 conflated "the catalog" — the redundant-import problem it solved is really about the
*reference*, not the *activated* set; sharing the reference while personalizing activation solves
redundancy without forcing a shared activated set. Needs a new ADR superseding ADR-0010 + a
migration (`ReferenceCode.user_id`→`organization_id`, active real `TimesheetCode.organization_id`→
`user_id`) + glossary updates. Separate lot — decoupled from the colour-automation feature.
- 2026.07.09 - ajouter une fléche de reprise (comme sur "activity") pour démarrer un timer à partir d'une task
- 2026.07.09 - le lien vers la doc (readme et root FR) est faux : [https://davidp57.github.io/Walker/](https://davidp57.github.io/Walker/) (c'est [https://davidp57.github.io/walker/ pour le root EN)](https://davidp57.github.io/Walker/)

 