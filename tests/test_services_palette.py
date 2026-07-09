"""Palette contract + least-used-first suggestion (BIZ-048)."""

from __future__ import annotations

import json
import random
from pathlib import Path

from walker.services.palette import PALETTE, least_used_colors, suggest_color

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "palette.json"


def _fixture_palette() -> list[str]:
    return list(json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))["palette"])


def test_palette_matches_shared_fixture() -> None:
    """Contract: the backend palette must equal the shared fixture (mirrored on the frontend)."""
    assert _fixture_palette() == PALETTE


def test_palette_is_64_unique_colors() -> None:
    assert len(PALETTE) == 64
    assert len(set(PALETTE)) == 64


def test_least_used_avoids_used_colors_while_free_remain() -> None:
    """With free colours left, the minimal-count set excludes every used colour (count 0)."""
    used = PALETTE[:3]
    candidates = least_used_colors(used)
    assert len(candidates) == 61
    assert not (set(candidates) & set(used))


def test_least_used_ignores_non_palette_colors() -> None:
    """A colour outside the 64 (legacy hex / analog pick) is not counted and lights no swatch."""
    candidates = least_used_colors(["#000000", "#ffffff", "not-a-color"])
    assert candidates == PALETTE  # every palette colour is still at count 0


def test_least_used_is_case_insensitive() -> None:
    used = [PALETTE[0].upper()]
    assert PALETTE[0] not in least_used_colors(used)


def test_least_used_degrades_to_count_one_when_all_used() -> None:
    """Once all 64 are used, the minimum is 1; using one twice drops it out of the set."""
    assert set(least_used_colors(PALETTE)) == set(PALETTE)
    twice = [*PALETTE, PALETTE[0]]
    candidates = least_used_colors(twice)
    assert PALETTE[0] not in candidates
    assert len(candidates) == 63


def test_suggest_color_is_from_least_used_set() -> None:
    used = PALETTE[:60]
    rng = random.Random(0)
    for _ in range(20):
        assert suggest_color(used, rng=rng) in PALETTE[60:]


def test_suggest_color_never_repeats_while_free_remain() -> None:
    used = [PALETTE[0]]
    rng = random.Random(1)
    for _ in range(50):
        assert suggest_color(used, rng=rng) != PALETTE[0]
