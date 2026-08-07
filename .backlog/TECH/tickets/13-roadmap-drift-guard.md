# CHR-014 — ROADMAP silently drifts from the backlog and the changelog

ID: CHR-014
Status: ✅ done
Type: chore
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

On 2026-08-07 `ROADMAP.md` still claimed:

> ## Now — batch shipped to develop, release pending
> The queued batch (BIZ-063 … BIZ-066) is merged to `develop`; the next version has not been cut yet.

`v1.10.0` had been cut on **2026-07-31**, and `[Unreleased]` in the CHANGELOG was empty. The "Next"
section was equally stale: it listed three *shipped* tickets among the open ones and closed with
"**BIZ-084** … **The only ticket left open.**", which had stopped being true.

Two distinct causes, both mechanical:

1. **Release state is duplicated.** ROADMAP's own header says it is the "Sequencing source of truth:
   **what order, with which hard dependencies**" — yet its "Now" heading asserts *release* status,
   which lives in `CHANGELOG.md`. Worse, `.claude/commands/release.md` step 4.4 says in as many
   words: *"Do **not** touch `ROADMAP.md`"*. So the one procedure that changes release state is
   explicitly forbidden from updating the file that restates it. The drift is not an oversight — it
   is what the process instructs.
2. **Nothing checks the open-ticket list.** ROADMAP names which tickets are open; `.backlog/`
   holds the truth in each ticket's `Status:` line. No test compares them, so a ticket opened or
   closed without a ROADMAP edit goes unnoticed until someone reads both.

## Solution

**Stop duplicating release state.** ROADMAP's "Now" section describes *what is in flight*, not which
version was cut; the released-version question is answered by `CHANGELOG.md` and nothing else. The
`/release` instruction stays "do not touch `ROADMAP.md`" — which becomes correct once ROADMAP no
longer claims anything a release changes.

**Check the open-ticket list mechanically.** A test in the existing backend suite (so it runs in the
current quality gate, with no new CI wiring) parses every `.backlog/*/tickets/*.md` `Status:` line
and asserts that the set of **open** ticket IDs (⬜ / 🔄 / 🧑) is exactly the set of IDs the ROADMAP's
"Next" section presents as open. Either direction failing is a real defect:

- open ticket missing from ROADMAP → work nobody sequenced;
- ROADMAP listing a closed ticket → the stale-by-three-tickets state above.

A test rather than a script because it needs no new entry point and fails where the developer is
already looking.

## Out of scope

Checking prose for staleness in general. The guard is deliberately narrow — ticket IDs and their
open/closed state — because that is the part with a machine-readable truth. Anything looser would
produce false failures and get ignored.

## Acceptance criteria

- [x] `ROADMAP.md` no longer asserts which version was cut or whether a release is pending; that
      question is answered by `CHANGELOG.md`.
- [x] A test fails when an open `.backlog/` ticket is absent from ROADMAP's "Next" section.
- [x] The same test fails when ROADMAP presents a ✅ done / 🚫 wontfix ticket as open.
- [x] The failure message names the offending IDs and which direction is wrong — a bare assertion
      would leave the reader to diff two files by hand.
- [x] The test passes on the current tree, i.e. the drift is actually repaired, not just detectable.
- [x] `.claude/commands/release.md` and `CLAUDE.md` agree with the new division of responsibility.

## Blocked by

None.

## Delivery

Shipped in [PR #152](https://github.com/davidp57/walker/pull/152) -> `develop`.
