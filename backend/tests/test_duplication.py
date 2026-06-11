from app.models import Publication
from sqlmodel import select

from tests.conftest import auth_headers

ORCID_ID = "0000-0002-1825-0097"

IMPORT_PAYLOAD = {
    "orcid_id": ORCID_ID,
    "publications": [{"title": "Imported Paper", "doi": "10.1234/abc"}],
    "projects": [{"title": "Imported Funding"}],
    "experiences": [{"organization": "Imported Org", "role_title": "Researcher"}],
}


async def test_import_creates_records(client, make_user, session):
    user = await make_user()
    resp = await client.post(
        "/api/orcid/import", json=IMPORT_PAYLOAD, headers=auth_headers(user)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["publications_imported"] == 1
    assert body["projects_imported"] == 1
    assert body["experiences_imported"] == 1
    assert body["skipped"] == 0
    assert user.orcid_id == ORCID_ID

    pubs = (
        await session.exec(select(Publication).where(Publication.user_id == user.id))
    ).all()
    assert len(pubs) == 1
    assert pubs[0].is_imported is True


async def test_reimport_skips_all_duplicates(client, make_user):
    user = await make_user()
    headers = auth_headers(user)
    await client.post("/api/orcid/import", json=IMPORT_PAYLOAD, headers=headers)

    resp = await client.post("/api/orcid/import", json=IMPORT_PAYLOAD, headers=headers)
    body = resp.json()
    assert body["publications_imported"] == 0
    assert body["projects_imported"] == 0
    assert body["experiences_imported"] == 0
    assert body["skipped"] == 3


async def test_same_doi_detected_as_duplicate(client, make_user):
    user = await make_user()
    headers = auth_headers(user)
    await client.post(
        "/api/publications",
        json={"title": "Original title", "doi": "10.1234/abc"},
        headers=headers,
    )

    resp = await client.post(
        "/api/orcid/import",
        json={
            "orcid_id": ORCID_ID,
            "publications": [{"title": "Different title", "doi": "10.1234/abc"}],
        },
        headers=headers,
    )
    body = resp.json()
    assert body["publications_imported"] == 0
    assert body["skipped"] == 1


async def test_import_rejects_invalid_orcid_id(client, make_user):
    user = await make_user()
    resp = await client.post(
        "/api/orcid/import",
        json={"orcid_id": "not-an-orcid"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 400
