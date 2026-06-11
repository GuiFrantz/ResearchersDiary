import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors, InvitationStatus, UserRole
from app.database import get_session
from app.models import Department, Institution, Invitation, User
from app.permissions import has_permission
from app.queries import (
    get_department_head,
    get_departments,
    get_institutions,
    get_users,
)
from app.schemas import InvitationCreate, InvitationRead

router = APIRouter(prefix=ApiPrefix.INVITATIONS, tags=["Invitations"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _enrich(
    session: AsyncSession, invitations: list[Invitation]
) -> list[InvitationRead]:
    if not invitations:
        return []

    inst_ids = {inv.institution_id for inv in invitations}
    dept_ids = {inv.department_id for inv in invitations if inv.department_id}
    user_ids = {inv.inviter_id for inv in invitations} | {
        inv.recipient_id for inv in invitations
    }

    inst_result = await session.exec(
        select(Institution).where(Institution.id.in_(inst_ids))
    )
    inst_map = {i.id: i for i in inst_result.all()}

    dept_map: dict[uuid.UUID, Department] = {}
    if dept_ids:
        dept_result = await session.exec(
            select(Department).where(Department.id.in_(dept_ids))
        )
        dept_map = {d.id: d for d in dept_result.all()}

    user_result = await session.exec(select(User).where(User.id.in_(user_ids)))
    user_map = {u.id: u for u in user_result.all()}

    def name_of(m, key):
        entity = m.get(key) if key else None
        return entity.name if entity else None

    out: list[InvitationRead] = []
    for inv in invitations:
        rec = InvitationRead.model_validate(inv)
        rec.institution_name = name_of(inst_map, inv.institution_id)
        rec.department_name = name_of(dept_map, inv.department_id)
        rec.inviter_name = name_of(user_map, inv.inviter_id)
        rec.recipient_name = name_of(user_map, inv.recipient_id)
        out.append(rec)
    return out


@router.post("", response_model=InvitationRead, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if data.role == UserRole.INSTITUTION_HEAD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.BAD_REQUEST,
        )

    institution = await get_institutions(session, data.institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=Errors.INSTITUTION_NOT_FOUND,
        )

    recipient = await get_users(session, user_id=data.recipient_id)
    if recipient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    department = None
    if data.department_id is not None:
        department = await get_departments(session, data.department_id)
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Errors.DEPARTMENT_NOT_FOUND,
            )
        if department.institution_id != data.institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.BAD_REQUEST,
            )

    if data.role == UserRole.DEPARTMENT_HEAD and department is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.BAD_REQUEST,
        )

    is_inst_head = (
        current_user.role == UserRole.INSTITUTION_HEAD
        and current_user.institution_id == data.institution_id
    )
    is_dept_head = (
        current_user.role == UserRole.DEPARTMENT_HEAD
        and department is not None
        and current_user.department_id == department.id
    )

    if not (is_inst_head or is_dept_head):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if is_dept_head:
        if data.role not in (UserRole.RESEARCHER, UserRole.DEPARTMENT_HEAD):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
        if recipient.role == UserRole.INSTITUTION_HEAD:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
        if recipient.institution_id != data.institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.BAD_REQUEST,
            )
    else:
        if recipient.institution_id == data.institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.BAD_REQUEST,
            )

    existing = await session.exec(
        select(Invitation).where(
            Invitation.recipient_id == data.recipient_id,
            Invitation.institution_id == data.institution_id,
            Invitation.status == InvitationStatus.PENDING,
        )
    )
    if existing.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=Errors.INVITATION_ALREADY_PENDING,
        )

    invitation = Invitation(
        recipient_id=data.recipient_id,
        inviter_id=current_user.id,
        institution_id=data.institution_id,
        department_id=data.department_id,
        role=data.role,
    )
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)

    return (await _enrich(session, [invitation]))[0]


@router.get("/sent", response_model=list[InvitationRead])
async def list_sent(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Invitation).where(
            Invitation.inviter_id == current_user.id,
            Invitation.status == InvitationStatus.PENDING,
        )
    )
    return await _enrich(session, result.all())


@router.get("/received", response_model=list[InvitationRead])
async def list_received(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Invitation).where(
            Invitation.recipient_id == current_user.id,
            Invitation.status == InvitationStatus.PENDING,
            Invitation.expires_at > _now(),
        )
    )
    return await _enrich(session, result.all())


async def _load_invitation(
    session: AsyncSession, invitation_id: uuid.UUID
) -> Invitation:
    result = await session.exec(
        select(Invitation).where(Invitation.id == invitation_id)
    )
    invitation = result.first()
    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INVITATION_NOT_FOUND
        )
    return invitation


@router.post("/{invitation_id}/accept", response_model=InvitationRead)
async def accept_invitation(
    invitation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    invitation = await _load_invitation(session, invitation_id)

    if invitation.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INVITATION_ALREADY_ANSWERED,
        )

    now = _now()
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        invitation.status = InvitationStatus.EXPIRED
        invitation.responded_at = now
        session.add(invitation)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INVITATION_EXPIRED,
        )

    institution = await get_institutions(session, invitation.institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
        )
    if invitation.department_id is not None:
        department = await get_departments(session, invitation.department_id)
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=Errors.DEPARTMENT_NOT_FOUND,
            )

    is_changing_institution = (
        current_user.institution_id is not None
        and current_user.institution_id != invitation.institution_id
    )
    is_changing_department = (
        current_user.department_id is not None
        and current_user.department_id != invitation.department_id
    )

    if current_user.role == UserRole.INSTITUTION_HEAD and is_changing_institution:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.LAST_HEAD_CANNOT_LEAVE,
        )
    if current_user.role == UserRole.DEPARTMENT_HEAD and (
        is_changing_institution or is_changing_department
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.LAST_HEAD_CANNOT_LEAVE,
        )

    if invitation.role == UserRole.DEPARTMENT_HEAD:
        existing_head = await get_department_head(session, invitation.department_id)
        if existing_head is not None and existing_head.id != current_user.id:
            existing_head.role = UserRole.RESEARCHER
            session.add(existing_head)

    current_user.institution_id = invitation.institution_id
    current_user.department_id = invitation.department_id
    current_user.role = invitation.role
    session.add(current_user)

    invitation.status = InvitationStatus.ACCEPTED
    invitation.responded_at = now
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)
    return (await _enrich(session, [invitation]))[0]


@router.post("/{invitation_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invitation(
    invitation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    invitation = await _load_invitation(session, invitation_id)

    if invitation.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INVITATION_ALREADY_ANSWERED,
        )

    invitation.status = InvitationStatus.DECLINED
    invitation.responded_at = _now()
    session.add(invitation)
    await session.commit()


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    invitation = await _load_invitation(session, invitation_id)

    is_inviter = invitation.inviter_id == current_user.id
    is_target_inst_head = await has_permission(
        current_user,
        UserRole.INSTITUTION_HEAD,
        session,
        institution_id=invitation.institution_id,
    )
    if not (is_inviter or is_target_inst_head):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INVITATION_ALREADY_ANSWERED,
        )

    invitation.status = InvitationStatus.CANCELLED
    invitation.responded_at = _now()
    session.add(invitation)
    await session.commit()
