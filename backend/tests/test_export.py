from tests.conftest import auth_headers


async def test_export_multi_type_selection(client, make_user):
    user = await make_user()
    headers = auth_headers(user)

    pub1 = (
        await client.post("/api/publications", json={"title": "P1"}, headers=headers)
    ).json()
    pub2 = (
        await client.post("/api/publications", json={"title": "P2"}, headers=headers)
    ).json()
    proj = (
        await client.post("/api/projects", json={"title": "Proj"}, headers=headers)
    ).json()
    prop = (
        await client.post("/api/proposals", json={"title": "Prop"}, headers=headers)
    ).json()
    exp = (
        await client.post(
            "/api/experiences", json={"organization": "Org"}, headers=headers
        )
    ).json()

    resp = await client.post(
        "/api/export",
        json={
            "publication_ids": [pub1["id"], pub2["id"]],
            "project_ids": [proj["id"]],
            "proposal_ids": [prop["id"]],
            "experience_ids": [exp["id"]],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert "attachment" in resp.headers["content-disposition"]
    body = resp.json()
    assert {p["id"] for p in body["publications"]} == {pub1["id"], pub2["id"]}
    assert [p["id"] for p in body["projects"]] == [proj["id"]]
    assert [p["id"] for p in body["proposals"]] == [prop["id"]]
    assert [e["id"] for e in body["experiences"]] == [exp["id"]]
    assert body["user"]["id"] == str(user.id)


async def test_export_excludes_foreign_records(client, make_user):
    owner = await make_user()
    other = await make_user()
    foreign = (
        await client.post(
            "/api/publications", json={"title": "Foreign"}, headers=auth_headers(other)
        )
    ).json()
    own = (
        await client.post(
            "/api/publications", json={"title": "Own"}, headers=auth_headers(owner)
        )
    ).json()

    resp = await client.post(
        "/api/export",
        json={"publication_ids": [own["id"], foreign["id"]]},
        headers=auth_headers(owner),
    )
    assert resp.status_code == 200
    assert [p["id"] for p in resp.json()["publications"]] == [own["id"]]


async def test_export_empty_selection(client, make_user):
    user = await make_user()
    resp = await client.post("/api/export", json={}, headers=auth_headers(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["publications"] == []
    assert body["projects"] == []
    assert body["proposals"] == []
    assert body["experiences"] == []
