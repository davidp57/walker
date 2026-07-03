"""Unit tests for the pure catalog CSV parser (BIZ-002)."""

from __future__ import annotations

import pytest

from walker.exceptions import CatalogImportError
from walker.services.catalog import parse_catalog_csv

CSV = """code_number,code_label,code_name,activity_code,activity_label
N9/1042,MNT - PAP V4,Paper V4,0001,Bug fixing
N9/1042,MNT - PAP V4,Paper V4,0002,Change request
N9/0007,INT - INTERNAL / ADMIN,,0003,Communication & Meeting
"""


def test_parse_groups_activities_by_code() -> None:
    parsed = parse_catalog_csv(CSV)

    by_number = {p.number: p for p in parsed}
    assert set(by_number) == {"N9/1042", "N9/0007"}
    assert [(a.code, a.label) for a in by_number["N9/1042"].activities] == [
        ("0001", "Bug fixing"),
        ("0002", "Change request"),
    ]


def test_parse_blank_name_defaults_to_label() -> None:
    parsed = parse_catalog_csv(CSV)

    by_number = {p.number: p for p in parsed}
    assert by_number["N9/1042"].name == "Paper V4"
    assert by_number["N9/0007"].name == "INT - INTERNAL / ADMIN"


PWC_HEADERLESS = (
    "N0/6005003/010,Attend-GO SPA,0001,ENG-08/05/2005-EVT-3431\n"
    "N0/6005003/010,Attend-GO SPA,0002,ENG-19/06/2005-EVT-3651\n"
    'N0/6010218/010,"Attend-HOW TO ATTRACT, SUSTAIN AND DEVEL",0001,FR-10/11/2011\n'
)


def test_parse_headerless_pwc_export() -> None:
    parsed = parse_catalog_csv(PWC_HEADERLESS)

    by_number = {p.number: p for p in parsed}
    assert set(by_number) == {"N0/6005003/010", "N0/6010218/010"}
    # code_name defaults to code_label when the file has no name column
    assert by_number["N0/6005003/010"].name == "Attend-GO SPA"
    assert [(a.code, a.label) for a in by_number["N0/6005003/010"].activities] == [
        ("0001", "ENG-08/05/2005-EVT-3431"),
        ("0002", "ENG-19/06/2005-EVT-3651"),
    ]
    # a quoted field containing a comma stays a single field
    assert by_number["N0/6010218/010"].label == "Attend-HOW TO ATTRACT, SUSTAIN AND DEVEL"


def test_parse_missing_columns_raises() -> None:
    with pytest.raises(CatalogImportError):
        parse_catalog_csv("wrong,header\n1,2")


def test_parse_empty_input_raises() -> None:
    with pytest.raises(CatalogImportError):
        parse_catalog_csv("")
