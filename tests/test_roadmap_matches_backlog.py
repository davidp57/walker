"""ROADMAP's open-ticket list must match ``.backlog/`` (CHR-014).

ROADMAP names which tickets are open; each ticket's ``Status:`` line holds the truth. Nothing
compared the two, so the file drifted silently — on 2026-08-07 it listed three already-merged
tickets among the open ones and asserted that one ticket was "the only ticket left open" when three
were.

Deliberately narrow: **ticket IDs and their open/closed state only**. That is the part with a
machine-readable truth; checking prose for staleness would produce false failures and get ignored.
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROADMAP = REPO_ROOT / "ROADMAP.md"
BACKLOG = REPO_ROOT / ".backlog"

# The five statuses (see .backlog/README.md); the first three mean the ticket is still open.
OPEN_STATUSES = ("⬜", "🔄", "🧑")

_ID = r"(?:BIZ|TEC|CHR)-\d{3}"
# A ROADMAP "Next" entry: a top-level list item whose first token is a bold ticket id. Keying on
# *that* shape rather than on any id in the text is what lets the prose keep citing closed tickets
# ("amends the BIZ-030 guard") without being mistaken for a claim that they are open.
_NEXT_ENTRY = re.compile(rf"^- \*\*({_ID})\*\*", re.MULTILINE)
_STATUS_LINE = re.compile(r"^Status:\s*(\S+)", re.MULTILINE)
_ID_LINE = re.compile(rf"^ID:\s*({_ID})", re.MULTILINE)


def _open_backlog_ids() -> dict[str, Path]:
    """Every ticket in an active lot whose ``Status:`` is not done/wontfix, by id."""
    open_ids: dict[str, Path] = {}
    for ticket in sorted(BACKLOG.glob("*/tickets/*.md")):
        text = ticket.read_text(encoding="utf-8")
        id_match = _ID_LINE.search(text)
        status_match = _STATUS_LINE.search(text)
        assert id_match is not None, f"{ticket.name} has no `ID:` line"
        assert status_match is not None, f"{ticket.name} has no `Status:` line"
        if status_match.group(1) in OPEN_STATUSES:
            open_ids[id_match.group(1)] = ticket
    return open_ids


def _roadmap_next_ids() -> set[str]:
    """The ticket ids ROADMAP's "Next" section presents as open."""
    text = ROADMAP.read_text(encoding="utf-8")
    start = text.index("\n## Next")
    rest = text[start + 1 :]
    end = rest.find("\n## ")
    section = rest if end == -1 else rest[:end]
    return set(_NEXT_ENTRY.findall(section))


def test_every_open_ticket_is_sequenced_in_the_roadmap() -> None:
    """An open ticket absent from ROADMAP is work nobody sequenced."""
    backlog = _open_backlog_ids()
    missing = sorted(set(backlog) - _roadmap_next_ids())

    assert not missing, (
        "These tickets are open in .backlog/ but absent from ROADMAP.md's 'Next' section — "
        "add a `- **ID** (priority, LOT) — …` entry for each:\n"
        + "\n".join(f"  {ticket_id}  ({backlog[ticket_id].relative_to(REPO_ROOT)})" for ticket_id in missing)
    )


def test_the_roadmap_lists_no_closed_ticket_as_open() -> None:
    """The stale-by-three-tickets failure: ROADMAP still sequencing shipped work."""
    stale = sorted(_roadmap_next_ids() - set(_open_backlog_ids()))

    assert not stale, (
        "ROADMAP.md's 'Next' section lists these as open, but .backlog/ marks them ✅ done or "
        "🚫 wontfix — remove their entries:\n" + "\n".join(f"  {ticket_id}" for ticket_id in stale)
    )


def test_the_roadmap_does_not_restate_release_status() -> None:
    """Release state lives in CHANGELOG.md only (CHR-014).

    ROADMAP is the sequencing source of truth — "what order, with which hard dependencies". It drifted
    precisely because it also claimed which version was cut, while ``/release`` is instructed not to
    touch it.
    """
    text = ROADMAP.read_text(encoding="utf-8").lower()
    forbidden = ["release pending", "has not been cut", "nothing pending"]
    found = [phrase for phrase in forbidden if phrase in text]

    assert not found, (
        "ROADMAP.md restates release status, which lives in CHANGELOG.md and which /release is "
        f"instructed not to update here: {found}"
    )
