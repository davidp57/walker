"""Unit tests for reference-catalog helpers (TEC-011)."""

from __future__ import annotations

from walker.services.reference import normalize_for_search


def test_normalize_folds_case_spaces_punctuation_and_accents() -> None:
    assert normalize_for_search("MNT - HR Hub") == "mnthrhub"
    assert normalize_for_search("HRHUB") == "hrhub"
    assert normalize_for_search("Développement") == "developpement"
    assert normalize_for_search("N9/6149505/010") == "n96149505010"


def test_normalize_of_a_fragment_is_a_substring_of_the_full_key() -> None:
    full = normalize_for_search("MNT - HR Hub")
    assert normalize_for_search("hr hub") in full
    assert normalize_for_search("6149505") in normalize_for_search("N9/6149505/010")
