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
