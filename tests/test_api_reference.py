"""Tests for the reference catalog: import target, search, and copy-to-active."""

from __future__ import annotations

from fastapi.testclient import TestClient

CSV = (
    "N1/6016508/010,PRJ - Connect,0001,Project management\n"
    "N1/6016508/010,PRJ - Connect,0002,Analysis\n"
    "N9/0007,INT - INTERNAL,0003,Meeting\n"
)


def _import(client: TestClient) -> None:
    response = client.post("/api/catalog/import", files={"file": ("c.csv", CSV.encode(), "text/csv")})
    assert response.status_code == 200


def test_import_populates_reference_not_active_codes(client: TestClient) -> None:
    _import(client)

    assert client.get("/api/codes").json() == []  # the active catalog stays empty
    refs = client.get("/api/reference", params={"q": "Connect"}).json()
    assert len(refs) == 1
    assert refs[0]["number"] == "N1/6016508/010"
    assert [a["label"] for a in refs[0]["activities"]] == ["Project management", "Analysis"]


def test_search_reference_by_number(client: TestClient) -> None:
    _import(client)

    refs = client.get("/api/reference", params={"q": "N9"}).json()

    assert [r["number"] for r in refs] == ["N9/0007"]


def test_import_reimport_is_idempotent(client: TestClient) -> None:
    _import(client)
    _import(client)

    assert len(client.get("/api/reference", params={"q": ""}).json()) == 2


def test_import_malformed_is_rejected(client: TestClient) -> None:
    response = client.post("/api/catalog/import", files={"file": ("bad.csv", b"a,b\n1,2", "text/csv")})

    assert response.status_code == 400


def _import_complete(client: TestClient, csv: str) -> dict[str, object]:
    response = client.post(
        "/api/catalog/import",
        files={"file": ("c.csv", csv.encode(), "text/csv")},
        data={"complete_catalog": "true"},
    )
    assert response.status_code == 200
    return dict(response.json())


def test_complete_import_reports_the_active_codes_it_orphaned(client: TestClient) -> None:
    """A code you still charge to, absent from the complete catalog, is named — not silently kept.

    Its charge line has almost certainly been closed in the Timesheet system, and nothing on screen
    said so before BIZ-092.
    """
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N9/0007"})

    summary = _import_complete(client, SHRUNK_CSV)

    orphaned = summary["orphaned"]
    assert isinstance(orphaned, list)
    assert [o["number"] for o in orphaned] == ["N9/0007"]
    assert orphaned[0]["backing_only"] is False
    assert orphaned[0]["virtual_codes"] == []


def test_complete_import_names_the_virtual_codes_a_missing_backing_supports(client: TestClient) -> None:
    """The case the user cannot see for themselves: the closed code is a *hidden* backing.

    The virtual code looks healthy in the catalog while what it actually charges to is locked.
    """
    _import(client)
    backing = client.post("/api/codes/from-reference", json={"number": "N9/0007", "as_backing": True}).json()
    client.post("/api/codes/virtual", json={"real_code_id": backing["id"], "name": "Interview Planner"})

    summary = _import_complete(client, SHRUNK_CSV)

    orphaned = summary["orphaned"]
    assert isinstance(orphaned, list)
    assert [o["number"] for o in orphaned] == ["N9/0007"]
    assert orphaned[0]["backing_only"] is True
    assert [v["name"] for v in orphaned[0]["virtual_codes"]] == ["Interview Planner"]


def test_complete_import_leaves_the_orphaned_code_alone(client: TestClient) -> None:
    """Reported, never decided: absence from a file can just mean the export was scoped too narrowly."""
    _import(client)
    code = client.post("/api/codes/from-reference", json={"number": "N9/0007"}).json()

    _import_complete(client, SHRUNK_CSV)

    still_there = next(c for c in client.get("/api/codes").json() if c["id"] == code["id"])
    assert still_there["obsolete"] is False
    assert still_there["missing_from_catalog"] is True


def test_a_returning_code_stops_being_reported_as_missing(client: TestClient) -> None:
    """Re-importing a wider export clears the flag — the narrow-scope false alarm must be undoable."""
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N9/0007"})
    _import_complete(client, SHRUNK_CSV)

    summary = _import_complete(client, CSV)

    assert summary["orphaned"] == []
    codes = client.get("/api/codes").json()
    assert all(c["missing_from_catalog"] is False for c in codes)


def test_partial_import_reports_no_orphans(client: TestClient) -> None:
    """A scoped file says nothing about what it omits, so it must not raise the alarm."""
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N9/0007"})

    response = client.post("/api/catalog/import", files={"file": ("c.csv", SHRUNK_CSV.encode(), "text/csv")})

    assert response.json()["orphaned"] == []
    codes = client.get("/api/codes").json()
    assert all(c["missing_from_catalog"] is False for c in codes)


SHRUNK_CSV = "N1/6016508/010,PRJ - Connect,0001,Project management\n"


def _numbers(client: TestClient) -> list[str]:
    return [r["number"] for r in client.get("/api/reference", params={"q": ""}).json()]


def test_complete_import_removes_codes_absent_from_the_file(client: TestClient) -> None:
    """A catalog declared complete prunes what it doesn't contain — a code closed since the last export."""
    _import(client)

    response = client.post(
        "/api/catalog/import",
        files={"file": ("c.csv", SHRUNK_CSV.encode(), "text/csv")},
        data={"complete_catalog": "true"},
    )

    assert response.status_code == 200
    assert response.json()["removed"] == 1
    assert _numbers(client) == ["N1/6016508/010"]


def test_partial_import_leaves_absent_codes_alone(client: TestClient) -> None:
    """The default stays a pure upsert: a scoped file must not wipe the rest of the catalog."""
    _import(client)

    response = client.post("/api/catalog/import", files={"file": ("c.csv", SHRUNK_CSV.encode(), "text/csv")})

    assert response.status_code == 200
    assert response.json()["removed"] == 0
    assert sorted(_numbers(client)) == ["N1/6016508/010", "N9/0007"]


def test_complete_import_does_not_touch_active_codes(client: TestClient) -> None:
    """Pruning clears the reference catalog only — an active code keeps its place in the catalog.

    The file keeps the activated code and drops the other, so the assertion can't be satisfied by
    ``search_reference`` merely hiding already-active codes.
    """
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N9/0007"})
    kept_active = "N9/0007,INT - INTERNAL,0003,Meeting\n"

    response = client.post(
        "/api/catalog/import",
        files={"file": ("c.csv", kept_active.encode(), "text/csv")},
        data={"complete_catalog": "true"},
    )

    assert response.json()["removed"] == 1
    assert [c["number"] for c in client.get("/api/codes").json()] == ["N9/0007"]
    assert _numbers(client) == []  # N1 pruned; N9 hidden from search because it is active


def test_add_from_reference_copies_into_active(client: TestClient) -> None:
    _import(client)

    response = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"})

    assert response.status_code == 201
    body = response.json()
    assert body["number"] == "N1/6016508/010"
    assert [a["label"] for a in body["activities"]] == ["Project management", "Analysis"]
    assert [c["number"] for c in client.get("/api/codes").json()] == ["N1/6016508/010"]

    again = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"})
    assert again.status_code == 201
    assert len(client.get("/api/codes").json()) == 1


ENRICHED_CSV = (
    "code_number,code_label,code_name,customer,code_type,activity_code,activity_label\n"
    "N1/6016508/010,PRJ - Connect,Connect,ACME Corp,C,0001,Project management\n"
)


def test_enriched_import_backfills_active_code_ordering_keys(client: TestClient) -> None:
    """An enriched re-import fills customer/type on an already-active code (BIZ-068)."""
    code_id = client.post("/api/codes", json={"number": "N1/6016508/010", "label": "PRJ - Connect"}).json()["id"]

    resp = client.post("/api/catalog/import", files={"file": ("c.csv", ENRICHED_CSV.encode(), "text/csv")})
    assert resp.status_code == 200

    code = next(c for c in client.get("/api/codes").json() if c["id"] == code_id)
    assert code["customer"] == "ACME Corp"
    assert code["type"] == "C"


def test_legacy_reimport_preserves_enriched_ordering_keys(client: TestClient) -> None:
    """A later non-enriched import must not wipe customer/type loaded from an enriched one (BIZ-068)."""
    code_id = client.post("/api/codes", json={"number": "N1/6016508/010", "label": "PRJ - Connect"}).json()["id"]
    client.post("/api/catalog/import", files={"file": ("e.csv", ENRICHED_CSV.encode(), "text/csv")})

    legacy = "N1/6016508/010,PRJ - Connect,0001,Project management\n"
    client.post("/api/catalog/import", files={"file": ("l.csv", legacy.encode(), "text/csv")})

    code = next(c for c in client.get("/api/codes").json() if c["id"] == code_id)
    assert code["customer"] == "ACME Corp"
    assert code["type"] == "C"


def test_add_from_reference_carries_customer_and_type(client: TestClient) -> None:
    client.post("/api/catalog/import", files={"file": ("c.csv", ENRICHED_CSV.encode(), "text/csv")})

    activated = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"}).json()
    assert activated["customer"] == "ACME Corp"
    assert activated["type"] == "C"


def test_add_from_reference_unknown_is_404(client: TestClient) -> None:
    response = client.post("/api/codes/from-reference", json={"number": "N9/9999"})

    assert response.status_code == 404


def test_search_reference_is_fuzzy_across_spaces_and_punctuation(client: TestClient) -> None:
    """ "prj connect" (spaced) matches "PRJ - Connect" — the old substring ilike could not (TEC-011)."""
    _import(client)

    refs = client.get("/api/reference", params={"q": "prj connect"}).json()

    assert [r["number"] for r in refs] == ["N1/6016508/010"]


def test_search_reference_excludes_already_active_codes(client: TestClient) -> None:
    """A code already in the active catalog is filtered server-side, so it isn't re-suggested (TEC-011)."""
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"})

    # An empty query lists only the still-addable reference codes.
    refs = client.get("/api/reference", params={"q": ""}).json()
    assert [r["number"] for r in refs] == ["N9/0007"]

    # Searching for the now-active code returns nothing to add.
    assert client.get("/api/reference", params={"q": "Connect"}).json() == []


def test_search_reference_limit_applies_after_excluding_active(client: TestClient) -> None:
    """The limit yields add-able results, not ones spent on already-active codes (TEC-011)."""
    _import(client)
    client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"})

    refs = client.get("/api/reference", params={"q": "", "limit": 1}).json()

    assert [r["number"] for r in refs] == ["N9/0007"]
