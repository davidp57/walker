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


def test_add_from_reference_unknown_is_404(client: TestClient) -> None:
    response = client.post("/api/codes/from-reference", json={"number": "N9/9999"})

    assert response.status_code == 404
