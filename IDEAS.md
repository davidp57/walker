# Ideas inbox

Raw, unsorted improvement/fix ideas — captured here as they come up in conversation, not triaged or
acted on immediately. Periodically reviewed: worked ideas become `.backlog/` tickets (or an ADR, or
get closed as wontfix) and are removed from this file. See `CLAUDE.md`.

- 2026-07-09 — Re-scope the code catalog (supersedes ADR-0010). Make the **imported reference**  
**catalog** (`ReferenceCode`) Organization-scoped (import once per org, no redundant re-import), but  
make the **activated real codes** (`TimesheetCode` with `real_code_id IS NULL`) User-scoped again —  
each user activates/imputes against their own subset. Virtual codes stay per-user. Rationale:  
ADR-0010 conflated "the catalog" — the redundant-import problem it solved is really about the  
*reference*, not the *activated* set; sharing the reference while personalizing activation solves  
redundancy without forcing a shared activated set. Needs a new ADR superseding ADR-0010 + a  
migration (`ReferenceCode.user_id`→`organization_id`, active real `TimesheetCode.organization_id`→  
`user_id`) + glossary updates. Separate lot — decoupled from the colour-automation feature.
- 2026.07.09 - persister les réglages UX dans le profil user (également le profil user *virtuel* de la version .exe) ; par exemple le groupage des tasks, le dernier mode utilisé dans les écrans multimode (tasks, timesheet period)
- 2026.07.09 - rendre éditable l'activité "en cours" dans la liste "activity" - ça modifie le timer aussi ; en passant c'est pas clair qu'on peut éditer la description dans le timer, parce que c'est séparé dans l'UI du timer (il est en encadré alors que la description est en non encadré, on pense que c'est pas un champ éditable du timer)
- 2026-07-09 - lien global vers la doc (site publié) accessible depuis l'app — pas seulement le lien contextuel « catalog-import » déjà présent dans CodeCatalogScreen. Emplacement à décider (nav latérale ? footer ? icône aide ?).

 