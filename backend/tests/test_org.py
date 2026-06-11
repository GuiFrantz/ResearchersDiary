import uuid

from app.constants import Errors, UserRole

from tests.conftest import auth_headers


async def test_create_institution_promotes_creator(client, make_user):
    user = await make_user()
    resp = await client.post(
        "/api/institutions", json={"name": "Lusófona"}, headers=auth_headers(user)
    )
    assert resp.status_code == 201
    assert user.role == UserRole.INSTITUTION_HEAD
    assert user.institution_id == uuid.UUID(resp.json()["id"])


async def test_head_creates_department(client, org):
    institution, _, head = org
    resp = await client.post(
        "/api/departments",
        json={"institution_id": str(institution.id), "name": "DEISI", "code": "DE"},
        headers=auth_headers(head),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "DEISI"
    assert body["institution_id"] == str(institution.id)


async def test_researcher_cannot_create_department(client, org, make_user):
    institution, _, _ = org
    researcher = await make_user(institution_id=institution.id)
    resp = await client.post(
        "/api/departments",
        json={"institution_id": str(institution.id), "name": "X"},
        headers=auth_headers(researcher),
    )
    assert resp.status_code == 403


async def test_create_department_unknown_institution(client, org):
    _, _, head = org
    resp = await client.post(
        "/api/departments",
        json={"institution_id": str(uuid.uuid4()), "name": "X"},
        headers=auth_headers(head),
    )
    assert resp.status_code == 400


async def test_member_leaves_department(client, org, make_user):
    institution, department, _ = org
    member = await make_user(institution_id=institution.id, department_id=department.id)
    resp = await client.post(
        f"/api/departments/{department.id}/leave", headers=auth_headers(member)
    )
    assert resp.status_code == 204
    assert member.department_id is None
    assert member.institution_id == institution.id


async def test_last_dept_head_cannot_leave(client, org, make_user):
    institution, department, _ = org
    dept_head = await make_user(
        role=UserRole.DEPARTMENT_HEAD,
        institution_id=institution.id,
        department_id=department.id,
    )
    await make_user(institution_id=institution.id, department_id=department.id)

    resp = await client.post(
        f"/api/departments/{department.id}/leave", headers=auth_headers(dept_head)
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == Errors.LAST_HEAD_CANNOT_LEAVE


async def test_cannot_leave_department_not_member(client, org, make_user):
    _, department, _ = org
    outsider = await make_user()
    resp = await client.post(
        f"/api/departments/{department.id}/leave", headers=auth_headers(outsider)
    )
    assert resp.status_code == 403
