"""Unified permissions engine — role, scope, visibility, and ownership checks."""

import uuid

from sqlalchemy import and_, or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import ROLE_HIERARCHY
from app.constants import UserRole, Visibility
from app.models import Department, User


# Helpers
def _has_minimum_role(current_user: User, minimum_role: UserRole) -> bool:
    return ROLE_HIERARCHY.get(current_user.role, 0) >= ROLE_HIERARCHY[minimum_role]


async def _has_minimum_scope(
    current_user: User,
    session: AsyncSession,
    *,
    institution_id: uuid.UUID | None = None,
    department_id: uuid.UUID | None = None,
) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True

    if department_id is not None:
        result = await session.exec(
            select(Department).where(Department.id == department_id)
        )
        department = result.first()
        if department is None:
            return False

        role_level = ROLE_HIERARCHY.get(current_user.role, 0)

        if role_level == ROLE_HIERARCHY[UserRole.DEPARTMENT_HEAD]:
            return (
                current_user.department_id is not None
                and current_user.department_id == department_id
            )

        if role_level >= ROLE_HIERARCHY[UserRole.INSTITUTION_HEAD]:
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


def _visibility_conditions(model_class, current_user: User) -> list:
    role_level = ROLE_HIERARCHY.get(current_user.role, 0)
    conditions = [model_class.user_id == current_user.id]

    if (
        role_level >= ROLE_HIERARCHY[UserRole.DEPARTMENT_HEAD]
        and current_user.department_id is not None
    ):
        conditions.append(
            and_(
                model_class.visibility != Visibility.PRIVATE,
                User.department_id == current_user.department_id,
            )
        )

    if (
        role_level >= ROLE_HIERARCHY[UserRole.INSTITUTION_HEAD]
        and current_user.institution_id is not None
    ):
        conditions.append(
            and_(
                model_class.visibility != Visibility.PRIVATE,
                User.institution_id == current_user.institution_id,
            )
        )

    # admin sees all non-private records
    if current_user.role == UserRole.ADMIN:
        conditions.append(model_class.visibility != Visibility.PRIVATE)

    return conditions


# Verifies: Role and Scope
async def has_permission(
    current_user: User,
    minimum_role: UserRole,
    session: AsyncSession,
    *,
    institution_id: uuid.UUID | None = None,
    department_id: uuid.UUID | None = None,
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

    return True


async def get_records(
    model_class,
    current_user: User,
    session: AsyncSession,
    *,
    record_id: uuid.UUID | None = None,
    owner_only: bool = False,
):
    if owner_only:
        stmt = select(model_class).where(model_class.user_id == current_user.id)
    else:
        conditions = _visibility_conditions(model_class, current_user)
        stmt = (
            select(model_class)
            .join(User, model_class.user_id == User.id)
            .where(or_(*conditions))
            .distinct()
        )
    if record_id is not None:
        stmt = stmt.where(model_class.id == record_id)
    result = await session.exec(stmt)
    return result.first() if record_id is not None else result.all()
