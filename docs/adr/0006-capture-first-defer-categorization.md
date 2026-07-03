# One-click immediate capture, deferred categorization, editable entries

You're often interrupted (a colleague drops by, a call). You must be able to **start a timer in one
click, with no input**, to respond right away — no fiddling in Walker before handling the
interruption.

Categorization (Code, Activity, description) therefore happens **afterwards**: while the timer runs,
or later, including via a **matrix view**. Corollary: **all entries are editable** after creation
(times, duration, imputation, description).

## Considered Options

- **Require Code + Activity at start (rejected)**: imposes friction at the worst moment (an
  interruption) and discourages tracking.
- **Capture-first, deferred categorization (chosen)**: never lose time, at the cost of temporarily
  incomplete entries.

## Consequences

- The data model allows **incomplete / uncategorized Entries** (Code and Activity optional until
  completed).
- Need an **editing view**, including a **matrix** (Day × … grid) to complete/fix quickly.
- The timer must be **startable empty**; visually distinguish entries "to complete".
