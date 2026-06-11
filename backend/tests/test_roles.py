from app.constants import Errors, UserRole

from tests.conftest import auth_headers


async def test_assign_department_head_demotes_previous(client, org, make_user):
    institution, department, head = org
    old_head = await make_user(
        role=UserRole.DEPARTMENT_HEAD,
        institution_id=institution.id,
        department_id=department.id,
    )
    target = await make_user(institution_id=institution.id, department_id=department.id)

    resp = await client.put(
        f"/api/users/{target.id}/role",
        json={"role": "department_head"},
        headers=auth_headers(head),
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == UserRole.DEPARTMENT_HEAD.value
    # sessão partilhada: o antigo head foi despromovido pelo endpoint
    assert old_head.role == UserRole.RESEARCHER


async def test_researcher_cannot_assign_role(client, org, make_user):
    institution, department, head = org
    researcher = await make_user(institution_id=institution.id)
    target = await make_user(institution_id=institution.id, department_id=department.id)

    resp = await client.put(
        f"/api/users/{target.id}/role",
        json={"role": "department_head"},
        headers=auth_headers(researcher),
    )
    assert resp.status_code == 403


async def test_cannot_assign_role_to_self(client, org):
    _, _, head = org
    resp = await client.put(
        f"/api/users/{head.id}/role",
        json={"role": "researcher"},
        headers=auth_headers(head),
    )
    assert resp.status_code == 400


async def test_cannot_assign_role_without_institution(client, org, make_user):
    _, _, head = org
    outsider = await make_user()
    resp = await client.put(
        f"/api/users/{outsider.id}/role",
        json={"role": "researcher"},
        headers=auth_headers(head),
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == Errors.NOT_A_MEMBER
