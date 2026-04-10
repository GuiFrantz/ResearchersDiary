import uuid

from sqlalchemy import or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Department, Institution, User
from app.permissions import _visibility_conditions


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
        stmt = select(model_class).where(or_(*conditions))
    if record_id is not None:
        stmt = stmt.where(model_class.id == record_id)
    result = await session.exec(stmt)
    return result.first() if record_id is not None else result.all()


async def get_institutions(
    session: AsyncSession,
    institution_id: uuid.UUID | None = None,
):
    stmt = select(Institution)
    if institution_id is not None:
        stmt = stmt.where(Institution.id == institution_id)
    result = await session.exec(stmt)
    return result.first() if institution_id is not None else result.all()


async def get_departments(
    session: AsyncSession,
    department_id: uuid.UUID | None = None,
    *,
    institution_id: uuid.UUID | None = None,
):
    stmt = select(Department)
    if department_id is not None:
        stmt = stmt.where(Department.id == department_id)
    if institution_id is not None:
        stmt = stmt.where(Department.institution_id == institution_id)
    result = await session.exec(stmt)
    return result.first() if department_id is not None else result.all()


async def get_users(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    institution_id: uuid.UUID | None = None,
    department_id: uuid.UUID | None = None,
):
    stmt = select(User)
    if user_id is not None:
        stmt = stmt.where(User.id == user_id)
    if department_id is not None:
        stmt = stmt.where(User.department_id == department_id)
    elif institution_id is not None:
        stmt = stmt.where(User.institution_id == institution_id)
    result = await session.exec(stmt)
    return result.first() if user_id is not None else result.all()
