from app.constants import Errors, UserRole
from tests.conftest import auth_headers


# UC03 — Registar conta
async def test_register_returns_token(client):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "new@test.com", "password": "password123", "name": "New User"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


async def test_register_duplicate_email(client, make_user):
    await make_user("dup@test.com")
    resp = await client.post(
        "/api/auth/register", json={"email": "dup@test.com", "password": "password123"}
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == Errors.EMAIL_ALREADY_REGISTERED


async def test_register_defaults_to_researcher(client):
    resp = await client.post(
        "/api/auth/register", json={"email": "role@test.com", "password": "password123"}
    )
    token = resp.json()["access_token"]
    me = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200
    assert me.json()["role"] == UserRole.RESEARCHER.value


# UC02 — Login com email/password
async def test_login_ok(client, make_user):
    await make_user("login@test.com", password="password123")
    resp = await client.post(
        "/api/auth/login", json={"email": "login@test.com", "password": "password123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_login_wrong_password(client, make_user):
    await make_user("wrong@test.com", password="password123")
    resp = await client.post(
        "/api/auth/login", json={"email": "wrong@test.com", "password": "other-pass123"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == Errors.INVALID_CREDENTIALS


async def test_login_unknown_email(client):
    resp = await client.post(
        "/api/auth/login", json={"email": "ghost@test.com", "password": "password123"}
    )
    assert resp.status_code == 401


# UC04 — Perfil
async def test_me_requires_token(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


async def test_update_profile(client, make_user):
    user = await make_user()
    resp = await client.put(
        "/api/auth/me",
        json={"name": "Nome Novo", "orcid_id": "0000-0002-1825-0097"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Nome Novo"
    assert body["orcid_id"] == "0000-0002-1825-0097"
