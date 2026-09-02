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


ENRICHED = """code_number,code_label,code_name,customer,code_type,activity_code,activity_label
N9/1042,MNT - PAP V4,Paper V4,PricewaterhouseCoopers,N,0001,Bug fixing
N9/1042,MNT - PAP V4,Paper V4,PricewaterhouseCoopers,N,0002,Change request
C1/500,Client work,,ACME Corp,c,0001,Analysis
"""


def test_parse_enriched_reads_customer_and_type() -> None:
    parsed = parse_catalog_csv(ENRICHED)

    by_number = {p.number: p for p in parsed}
    assert by_number["N9/1042"].customer == "PricewaterhouseCoopers"
    assert by_number["N9/1042"].code_type == "N"
    # code_type is normalised to a single upper-case char (matches T&E's C/N/A).
    assert by_number["C1/500"].code_type == "C"
    assert by_number["C1/500"].customer == "ACME Corp"
    # activities still group correctly under the enriched layout
    assert [(a.code, a.label) for a in by_number["N9/1042"].activities] == [
        ("0001", "Bug fixing"),
        ("0002", "Change request"),
    ]


def test_parse_legacy_layouts_leave_customer_and_type_null() -> None:
    for parsed in (parse_catalog_csv(CSV), parse_catalog_csv(PWC_HEADERLESS)):
        assert all(p.customer is None and p.code_type is None for p in parsed)


def test_parse_missing_columns_raises() -> None:
    with pytest.raises(CatalogImportError):
        parse_catalog_csv("wrong,header\n1,2")


ENRICHED_HEADERLESS = (
    "N9/1042,MNT - PAP V4,Paper V4,PricewaterhouseCoopers,N,0001,Bug fixing\n"
    "N9/1042,MNT - PAP V4,Paper V4,PricewaterhouseCoopers,N,0002,Change request\n"
    "C1/500,Client work,Client work,ACME Corp,C,0001,Analysis\n"
)

HEADERED_HEADERLESS = (
    "N9/1042,MNT - PAP V4,Paper V4,0001,Bug fixing\nN9/1042,MNT - PAP V4,Paper V4,0002,Change request\n"
)


@pytest.mark.parametrize("text", [ENRICHED_HEADERLESS, HEADERED_HEADERLESS])
def test_parse_wide_file_without_header_raises(text: str) -> None:
    """A 5- or 7-column export stripped of its header is rejected, not read as the 4-column layout.

    Without this guard the headerless fallback shifts every field left: ``code_name`` is taken for
    ``activity_code`` and the remaining columns are glued into one activity label. That produces a
    silently corrupt catalog rather than an error.
    """
    with pytest.raises(CatalogImportError, match="header"):
        parse_catalog_csv(text)


def test_parse_headerless_tolerates_an_occasional_wide_row() -> None:
    """The 4-column layout still parses when an unquoted comma widens *some* rows.

    Only a file whose rows are *uniformly* 5 or 7 fields wide looks like a decapitated export; a
    ragged file is the legitimate headerless layout with commas in the labels.
    """
    ragged = (
        "N0/6005003/010,Attend-GO SPA,0001,ENG-08/05/2005\nN0/6005003/010,Attend-GO SPA,0002,ENG-19/06/2005,EVT-3651\n"
    )

    parsed = parse_catalog_csv(ragged)

    assert [(a.code, a.label) for a in parsed[0].activities] == [
        ("0001", "ENG-08/05/2005"),
        ("0002", "ENG-19/06/2005,EVT-3651"),
    ]


def test_parse_empty_input_raises() -> None:
    with pytest.raises(CatalogImportError):
        parse_catalog_csv("")
