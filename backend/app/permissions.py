import uuid

from sqlalchemy import and_
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
        dept_user_ids = select(User.id).where(
            User.department_id == current_user.department_id
        )
        conditions.append(
            and_(
                model_class.visibility != Visibility.PRIVATE.value,
                model_class.user_id.in_(dept_user_ids),
            )
        )

    if (
        role_level >= ROLE_HIERARCHY[UserRole.INSTITUTION_HEAD]
        and current_user.institution_id is not None
    ):
        inst_user_ids = select(User.id).where(
            User.institution_id == current_user.institution_id
        )
        conditions.append(
            and_(
                model_class.visibility != Visibility.PRIVATE.value,
                model_class.user_id.in_(inst_user_ids),
            )
        )

    # admin sees all non-private records
    if current_user.role == UserRole.ADMIN:
        conditions.append(model_class.visibility != Visibility.PRIVATE.value)

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
