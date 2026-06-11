import pytest
from app.constants import Visibility

from tests.conftest import auth_headers

RECORD_CASES = [
    ("/api/publications", {"title": "Paper A"}, {"title": "Paper B"}, "title"),
    ("/api/projects", {"title": "Project A"}, {"title": "Project B"}, "title"),
    ("/api/proposals", {"title": "Proposal A"}, {"title": "Proposal B"}, "title"),
    (
        "/api/experiences",
        {"organization": "Org A", "role_title": "Researcher"},
        {"organization": "Org B"},
        "organization",
    ),
]


@pytest.mark.parametrize("prefix,create_payload,update_payload,field", RECORD_CASES)
async def test_crud_lifecycle(
    client, make_user, prefix, create_payload, update_payload, field
):
    user = await make_user()
    headers = auth_headers(user)

    resp = await client.post(prefix, json=create_payload, headers=headers)
    assert resp.status_code == 201
    record = resp.json()
    assert record["user_id"] == str(user.id)
    assert record["visibility"] == Visibility.INSTITUTION.value
    record_id = record["id"]

    resp = await client.get(prefix, headers=headers)
    assert resp.status_code == 200
    assert [r["id"] for r in resp.json()] == [record_id]

    resp = await client.get(f"{prefix}/{record_id}", headers=headers)
    assert resp.status_code == 200

    resp = await client.put(
        f"{prefix}/{record_id}", json=update_payload, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()[field] == update_payload[field]

    resp = await client.delete(f"{prefix}/{record_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"{prefix}/{record_id}", headers=headers)
    assert resp.status_code == 404


async def test_cannot_touch_foreign_record(client, make_user):
    owner = await make_user()
    intruder = await make_user()
    resp = await client.post(
        "/api/publications", json={"title": "Owner paper"}, headers=auth_headers(owner)
    )
    record_id = resp.json()["id"]

    headers = auth_headers(intruder)
    resp = await client.get(f"/api/publications/{record_id}", headers=headers)
    assert resp.status_code == 404
    resp = await client.put(
        f"/api/publications/{record_id}", json={"title": "Hijack"}, headers=headers
    )
    assert resp.status_code == 404
    resp = await client.delete(f"/api/publications/{record_id}", headers=headers)
    assert resp.status_code == 404


async def test_set_record_visibility(client, make_user):
    user = await make_user()
    headers = auth_headers(user)

    resp = await client.post(
        "/api/publications",
        json={"title": "Toggle", "visibility": "private"},
        headers=headers,
    )
    assert resp.json()["visibility"] == Visibility.PRIVATE.value
    record_id = resp.json()["id"]

    resp = await client.put(
        f"/api/publications/{record_id}",
        json={"visibility": "institution"},
        headers=headers,
    )
    assert resp.json()["visibility"] == Visibility.INSTITUTION.value

    resp = await client.put(
        f"/api/publications/{record_id}",
        json={"visibility": "private"},
        headers=headers,
    )
    assert resp.json()["visibility"] == Visibility.PRIVATE.value
