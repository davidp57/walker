# Ideas inbox

Raw, unsorted improvement/fix ideas — captured here as they come up in conversation, not triaged or
acted on immediately. Periodically reviewed: worked ideas become `.backlog/` tickets (or an ADR, or
get closed as wontfix) and are removed from this file. See `CLAUDE.md`.

- 2026-08-06 — Settings has no task-states editor: a persistent per-user configuration (ADR-0011 /
  BIZ-056) is editable only inside the kanban, absent from the screen literally titled "Settings".
  Worth revisiting as an IA decision.
- 2026-08-06 — Mono is used for prose and control labels, not just data: `.wk-screen-sub` sets
  descriptions in JetBrains Mono, and segmented-control / day-toggle word-labels ("Comfortable",
  "Weekly", "System") are mono too. Tension with the Monospace-Data Rule — is a segmented control
  data or UI?
- 2026-08-06 — Settings offers no "reset to defaults", and work rhythm has no "weekdays" preset
  shortcut.
- 2026-08-06 — Absences are described as "manual for now — will reflect from the Timesheet system
  later" but render as permanent cards. Should they use the design system's dashed-border
  *provisional* affordance instead?
- 2026-08-06 — "No absences yet." is the last generic empty state; the others got their western wink
  ("Adios, backlog."). Missed brand beat.
- 2026-08-06 — "⇪ Import reference" is a co-equal header button on the Code catalog forever, though
  importing the reference catalog is a one-time setup action. Also the only place using an ad-hoc
  glyph set (`⇪`, `+`) with no consistent icon language.
- 2026-08-06 — The Code catalog is capped to form width (`.wk-screen.is-narrow`, 820px) yet lists
  28+ rows, and it's the one long list in the app rendered without zebra, hover, or a colour bar. Is
  form-width the right container for a ledger?
- 2026-08-06 — The activities collapse toggle ("N activities ▸") is very quiet `text-lo` mono — easy
  to miss on a fast scan.

 - 2026-09-03 — Les Switch blocks (BIZ-093) disparaissent parfois pendant qu'un timer tourne : la queue
  de la barre (pastille + horloge + ✕ + pause + Stop) passe de ~500 à ~750px une fois le minuteur
  lancé, donc sur une fenêtre de largeur moyenne la bande s'efface exactement au moment où on veut
  basculer. Constaté à ~890px de barre. Piste : réduire la pastille pendant que ça tourne (l'entrée en
  cours est déjà visible dans la liste juste dessous), ou laisser les blocs tronquer plus agressivement
  au lieu de disparaître.

 - 2026-08-21 — The CI quality gate runs `ruff check`/`ruff format --check` on `src tests` only, so
  `alembic/` is unchecked — and `alembic/versions/d7a1b2c3e4f5_backing_only_codes.py` is already
  unformatted on `develop` without anything failing. Migrations are production code; either widen the
  gate (and reformat the offender) or say explicitly why they're out.
