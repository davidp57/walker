# No authentication for the POC, but data scoped to a user from day one

Walker is a single-user POC, used 99% locally. Adding a login now would be needless friction.

We implement **no authentication** for the POC, but we scope data (Entries, Code catalog,
Fortnight-view personalization) to a **`user_id` from the very first model**. That way opening up to
multi-user (a few colleagues, then a possible product) will be **adding an auth layer**, not a
**schema migration**.

## Considered Options

- **No user notion (rejected)**: simplest now, but forces a painful migration when multi-user arrives.
- **Full auth from the start (rejected)**: over-engineering for a solo POC.
- **`user_id` without login (chosen)**: near-zero cost now, no migration later.

## Consequences

- An **implicit default user** for the POC (no login screen).
- The API and queries already carry the **user dimension** (filter by `user_id`).
- Auth (login, sessions, possible multi-tenant) will be added as a **later layer**.
