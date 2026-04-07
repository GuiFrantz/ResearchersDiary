"""Unified permissions engine — role, scope, visibility, and ownership checks."""

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import ROLE_HIERARCHY
from app.models import Department, User


def _has_minimum_role(current_user: User, minimum_role: str) -> bool:
    return ROLE_HIERARCHY.get(current_user.role, 0) >= ROLE_HIERARCHY[minimum_role]


async def _has_minimum_scope(
    current_user: User,
    session: AsyncSession,
    *,
    institution_id: uuid.UUID | None = None,
    department_id: uuid.UUID | None = None,
) -> bool:
    if current_user.role == "admin":
        return True

    if department_id is not None:
        result = await session.exec(
            select(Department).where(Department.id == department_id)
        )
        department = result.first()
        if department is None:
            return False

        role_level = ROLE_HIERARCHY.get(current_user.role, 0)

        if role_level == ROLE_HIERARCHY["department_head"]:
            return (
                current_user.department_id is not None
                and current_user.department_id == department_id
            )

        if role_level >= ROLE_HIERARCHY["institution_head"]:
            return (
                current_user.institution_id is not None
                and current_user.institution_id == department.institution_id
            )

        return False

    if institution_id is not None:
        if current_user.institution_id is None:
            return False
        return current_user.institution_id == institution_id

    return True


async def _has_record_access(
    current_user: User,
    record: Any,
    require_owner: bool,
    session: AsyncSession,
) -> bool:
    is_owner = record.user_id == current_user.id

    if require_owner:
        return is_owner

    if is_owner:
        return True

    visibility = getattr(record, "visibility", "private")

    if visibility == "private":
        return False

    result = await session.exec(select(User).where(User.id == record.user_id))
    owner = result.first()
    if owner is None:
        return False

    role_level = ROLE_HIERARCHY.get(current_user.role, 0)

    if current_user.role == "admin":
        return True

    if (
        role_level >= ROLE_HIERARCHY["department_head"]
        and current_user.department_id is not None
        and current_user.department_id == owner.department_id
    ):
        return True

    if (
        role_level >= ROLE_HIERARCHY["institution_head"]
        and current_user.institution_id is not None
        and current_user.institution_id == owner.institution_id
    ):
        return True

    return False


def _visibility_conditions(model_class, current_user: User) -> list:
    role_level = ROLE_HIERARCHY.get(current_user.role, 0)
    conditions = [model_class.user_id == current_user.id]

    if (
        role_level >= ROLE_HIERARCHY["department_head"]
        and current_user.department_id is not None
    ):
        conditions.append(
            and_(
                model_class.visibility != "private",
                User.department_id == current_user.department_id,
            )
        )

    if (
        role_level >= ROLE_HIERARCHY["institution_head"]
        and current_user.institution_id is not None
    ):
        conditions.append(
            and_(
                model_class.visibility != "private",
                User.institution_id == current_user.institution_id,
            )
        )

    # admin sees all non-private records
    if current_user.role == "admin":
        conditions.append(model_class.visibility != "private")

    return conditions


# Verifies: Role, Scope and Record Access (ownership)
async def has_permission(
    current_user: User,
    minimum_role: str,
    session: AsyncSession,
    *,
    institution_id: uuid.UUID | None = None,
    department_id: uuid.UUID | None = None,
    record: Any | None = None,
    require_owner: bool = False,
) -> bool:
    if not _has_minimum_role(current_user, minimum_role):
        return False

    if institution_id is not None or department_id is not None:
        if not await _has_minimum_scope(
            current_user,
            session,
            institution_id=institution_id,
            department_id=department_id,
        ):
            return False

    if record is not None:
        if not await _has_record_access(current_user, record, require_owner, session):
            return False

    return True


async def get_visible_records(
    model_class, current_user: User, session: AsyncSession
) -> list:
    conditions = _visibility_conditions(model_class, current_user)
    stmt = (
        select(model_class)
        .join(User, model_class.user_id == User.id)
        .where(or_(*conditions))
        .distinct()
    )
    result = await session.exec(stmt)
    return result.all()


def validate_visibility(visibility: str, current_user: User) -> None:
    if visibility != "private" and current_user.department_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient permissions",
        )
