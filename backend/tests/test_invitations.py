import uuid
from datetime import datetime, timedelta, timezone

from app.constants import Errors, InvitationStatus, UserRole
from app.models import Invitation
from tests.conftest import auth_headers


def _invite_payload(recipient, institution, department=None, role="researcher"):
    return {
        "recipient_id": str(recipient.id),
        "institution_id": str(institution.id),
        "department_id": str(department.id) if department else None,
        "role": role,
    }


# UC12 — Convidar utilizador
async def test_head_invites_external_researcher(client, org, make_user):
    institution, department, head = org
    recipient = await make_user()

    resp = await client.post(
        "/api/invitations",
        json=_invite_payload(recipient, institution, department),
        headers=auth_headers(head),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == InvitationStatus.PENDING.value
    assert body["recipient_id"] == str(recipient.id)


async def test_duplicate_pending_invitation(client, org, make_user):
    institution, department, head = org
    recipient = await make_user()
    payload = _invite_payload(recipient, institution, department)

    resp = await client.post(
        "/api/invitations", json=payload, headers=auth_headers(head)
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/invitations", json=payload, headers=auth_headers(head)
    )
    assert resp.status_code == 409
    assert resp.json()["detail"] == Errors.INVITATION_ALREADY_PENDING


async def test_researcher_cannot_invite(client, org, make_user):
    institution, department, head = org
    researcher = await make_user(institution_id=institution.id)
    recipient = await make_user()

    resp = await client.post(
        "/api/invitations",
        json=_invite_payload(recipient, institution, department),
        headers=auth_headers(researcher),
    )
    assert resp.status_code == 403


async def test_accept_invitation(client, org, make_user):
    institution, department, head = org
    recipient = await make_user()
    inv = (
        await client.post(
            "/api/invitations",
            json=_invite_payload(recipient, institution, department),
            headers=auth_headers(head),
        )
    ).json()

    resp = await client.post(
        f"/api/invitations/{inv['id']}/accept", headers=auth_headers(recipient)
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == InvitationStatus.ACCEPTED.value
    # sessão partilhada: o objeto do recipient foi atualizado pelo endpoint
    assert recipient.institution_id == institution.id
    assert recipient.department_id == department.id


async def test_decline_invitation(client, org, make_user, session):
    institution, department, head = org
    recipient = await make_user()
    inv = (
        await client.post(
            "/api/invitations",
            json=_invite_payload(recipient, institution, department),
            headers=auth_headers(head),
        )
    ).json()

    resp = await client.post(
        f"/api/invitations/{inv['id']}/decline", headers=auth_headers(recipient)
    )
    assert resp.status_code == 204
    invitation = await session.get(Invitation, uuid.UUID(inv["id"]))
    assert invitation.status == InvitationStatus.DECLINED
    assert recipient.institution_id is None


async def test_cancel_invitation(client, org, make_user, session):
    institution, department, head = org
    recipient = await make_user()
    inv = (
        await client.post(
            "/api/invitations",
            json=_invite_payload(recipient, institution, department),
            headers=auth_headers(head),
        )
    ).json()

    resp = await client.delete(
        f"/api/invitations/{inv['id']}", headers=auth_headers(head)
    )
    assert resp.status_code == 204
    invitation = await session.get(Invitation, uuid.UUID(inv["id"]))
    assert invitation.status == InvitationStatus.CANCELLED


async def test_accept_expired_invitation(client, org, make_user, session):
    institution, department, head = org
    recipient = await make_user()
    invitation = Invitation(
        recipient_id=recipient.id,
        inviter_id=head.id,
        institution_id=institution.id,
        department_id=department.id,
        role=UserRole.RESEARCHER,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    session.add(invitation)
    await session.commit()

    resp = await client.post(
        f"/api/invitations/{invitation.id}/accept", headers=auth_headers(recipient)
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == Errors.INVITATION_EXPIRED
    assert invitation.status == InvitationStatus.EXPIRED
    assert recipient.institution_id is None
