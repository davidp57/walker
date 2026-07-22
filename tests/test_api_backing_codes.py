"""Tests for backing-only real codes: hidden real codes auto-created to back virtual codes (BIZ-075, ADR-0012)."""

from __future__ import annotations

from fastapi.testclient import TestClient

ENRICHED_CSV = (
    "code_number,code_label,code_name,customer,code_type,activity_code,activity_label\n"
    "N1/6016508/010,PRJ - Connect,Connect,ACME Corp,C,0001,Project management\n"
    "N1/6016508/010,PRJ - Connect,Connect,ACME Corp,C,0002,Analysis\n"
)


def _import(client: TestClient) -> None:
    resp = client.post("/api/catalog/import", files={"file": ("c.csv", ENRICHED_CSV.encode(), "text/csv")})
    assert resp.status_code == 200


def test_add_from_reference_as_backing_creates_a_hidden_real_code(client: TestClient) -> None:
    _import(client)

    resp = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010", "as_backing": True})

    assert resp.status_code == 201
    body = resp.json()
    assert body["is_virtual"] is False
    assert body["backing_only"] is True
    assert body["number"] == "N1/6016508/010"
    # It is a normal real-code row at the data layer (still returned by GET /api/codes so the SPA can
    # resolve a checklist line's number/label by id) — the SPA hides it, not the API.
    listed = client.get("/api/codes").json()
    assert [c["id"] for c in listed] == [body["id"]]


def test_regular_add_from_reference_is_not_backing_only(client: TestClient) -> None:
    _import(client)

    body = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"}).json()

    assert body["backing_only"] is False


def test_virtual_backed_by_a_backing_only_code_resolves(client: TestClient) -> None:
    _import(client)
    backing = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010", "as_backing": True}).json()

    virtual = client.post("/api/codes/virtual", json={"real_code_id": backing["id"], "name": "Sub-project"}).json()

    # The virtual borrows number/label/activities from the hidden backing (resolution is unchanged).
    assert virtual["is_virtual"] is True
    assert virtual["number"] == "N1/6016508/010"
    assert [a["label"] for a in virtual["activities"]] == ["Project management", "Analysis"]
    assert virtual["real_code_id"] == backing["id"]


def test_explicit_add_unhides_a_backing_only_code(client: TestClient) -> None:
    _import(client)
    backing = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010", "as_backing": True}).json()
    assert backing["backing_only"] is True

    # Adding the same code as a normal code promotes it to a first-class tracked code.
    promoted = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"}).json()

    assert promoted["id"] == backing["id"]
    assert promoted["backing_only"] is False


def test_deleting_the_last_virtual_removes_the_orphan_backing(client: TestClient) -> None:
    _import(client)
    backing = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010", "as_backing": True}).json()
    virtual = client.post("/api/codes/virtual", json={"real_code_id": backing["id"], "name": "Sub-project"}).json()

    resp = client.delete(f"/api/codes/{virtual['id']}")

    assert resp.status_code == 204
    # Both the virtual and its now-orphaned hidden backing are gone.
    assert client.get("/api/codes").json() == []


def test_deleting_one_of_two_virtuals_keeps_the_shared_backing(client: TestClient) -> None:
    _import(client)
    backing = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010", "as_backing": True}).json()
    v_a = client.post("/api/codes/virtual", json={"real_code_id": backing["id"], "name": "A"}).json()
    client.post("/api/codes/virtual", json={"real_code_id": backing["id"], "name": "B"})

    client.delete(f"/api/codes/{v_a['id']}")

    ids = {c["id"] for c in client.get("/api/codes").json()}
    assert backing["id"] in ids  # still backing virtual B


def test_deleting_a_virtual_keeps_a_visible_real_backing(client: TestClient) -> None:
    """A normal (non-backing-only) real backing is never garbage-collected when its virtual goes."""
    _import(client)
    real = client.post("/api/codes/from-reference", json={"number": "N1/6016508/010"}).json()
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Sub-project"}).json()

    client.delete(f"/api/codes/{virtual['id']}")

    ids = {c["id"] for c in client.get("/api/codes").json()}
    assert real["id"] in ids
