# User-defined task states with positional roles

Task status was a hardcoded enum (`todo → in_progress → waiting → test → done`) that both drove the
kanban columns and carried behaviour: `done` is the target of the Timer's **Complete** and the
kanban "✓ Done", the trigger of recurrence **roll-forward** (a recurring Task never lands in Done —
it resets), and the collapsible column (BIZ-044); `todo` is the default for new Tasks, the
recurrence **reset** target, and the origin of the start-timer nudge (BIZ-050). Users want to
customize the columns (add/rename/move/delete).

**Decision.** Task states become a **per-user, ordered list** — each state an **opaque stable `id`**
plus an **editable `label`**, ordered by list position — stored as a JSON list. `Task.status` holds
the `id`. The two behavioural roles are **positional, not flagged**: the **first** state is
`initial`, the **last** is `terminal`. Everything that used to name `todo`/`done` now resolves
through position: new-Task default and recurrence reset use the first state; Complete, roll-forward,
and done-collapse use the last; the BIZ-050 nudge is first → second.

## Considered options

- **Keep the hardcoded enum (rejected):** no customization, which is the whole ask.
- **Explicit reserved-role flags on states (rejected):** robust to reordering, but adds role-assignment
  UI and an invariant to maintain (exactly one state per role). Positional roles need no flags and
  match the kanban's left→right start→done mental model; the cost is that reordering/adding at the
  ends re-points behaviour (accepted — "add" inserts *before* the terminal by default so it can't
  silently hijack the `done` role).
- **Key = label slug with cascade-on-rename (rejected):** keeps stored values human-readable, but a
  rename becomes a bulk update of every referencing Task plus slug-collision handling. An **opaque
  id** makes the label the single source of meaning, so rename and reorder stay O(1) and no
  identifier can drift out of sync with its label. Status is internal (never exported to the
  Timesheet system), so the id's illegibility costs nothing.

## Consequences

- `Task.status` migrates from a DB `Enum` to a `String` (opaque id). A data migration seeds each
  user's list with the five current defaults (opaque ids, existing labels, in order) and rewrites
  existing Task statuses to the corresponding ids.
- Reordering or adding at the ends changes what `initial`/`terminal` mean, re-pointing
  Complete/recurrence/nudge. This is deliberate and accepted.
- A minimum of **2 states** is enforced (so `initial ≠ terminal`). Deleting a state is blocked at 2;
  deleting a non-empty state prompts to reassign its Tasks to a chosen state (default: the neighbour);
  an empty state deletes outright.
- Frontend status ordering, labels, group-by-status and sort-by-status all become **dynamic** from
  the user's list rather than a hardcoded order.
- The list of states is per-user **configuration data** (Tasks reference it, deletion is guarded) —
  distinct from the ephemeral view preferences of BIZ-053, even though both use JSON storage.
