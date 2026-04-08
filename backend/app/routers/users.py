import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import ROLE_HIERARCHY, get_current_user, require_role
from app.constants import ApiPrefix, Errors, UserRole
from app.database import get_session
from app.models import Department, Institution, User
from app.permissions import has_permission
from app.schemas import AssignDepartment, AssignInstitution, AssignRole, UserRead

router = APIRouter(prefix=ApiPrefix.USERS, tags=["Users"])


@router.get("/", response_model=list[UserRead])
async def list_users(
    institution_id: Optional[uuid.UUID] = Query(default=None),
    department_id: Optional[uuid.UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(User)
    if department_id is not None:
        stmt = stmt.where(User.department_id == department_id)
    elif institution_id is not None:
        stmt = stmt.where(User.institution_id == institution_id)
    elif current_user.role == UserRole.ADMIN:
        pass  # admin sees all users
    elif current_user.institution_id is not None:
        stmt = stmt.where(User.institution_id == current_user.institution_id)
    else:
        # standalone user only see themselves
        stmt = stmt.where(User.id == current_user.id)

    result = await session.exec(stmt)
    return result.all()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )
    return user


@router.put("/{user_id}/institution", response_model=UserRead)
async def assign_institution(
    user_id: uuid.UUID,
    data: AssignInstitution,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    result = await session.exec(select(User).where(User.id == user_id))
    target_user = result.first()
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if data.institution_id is not None:
        inst_result = await session.exec(
            select(Institution).where(Institution.id == data.institution_id)
        )
        if inst_result.first() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.INSTITUTION_NOT_FOUND,
            )
        if not await has_permission(
            current_user,
            UserRole.INSTITUTION_HEAD,
            session,
            institution_id=data.institution_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
    else:
        if not await has_permission(
            current_user,
            UserRole.INSTITUTION_HEAD,
            session,
            institution_id=target_user.institution_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )

    target_user.institution_id = data.institution_id
    target_user.department_id = None

    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user


@router.put("/{user_id}/department", response_model=UserRead)
async def assign_department(
    user_id: uuid.UUID,
    data: AssignDepartment,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.DEPARTMENT_HEAD)),
):
    result = await session.exec(select(User).where(User.id == user_id))
    target_user = result.first()
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if data.department_id is not None:
        dept_result = await session.exec(
            select(Department).where(Department.id == data.department_id)
        )
        department = dept_result.first()
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.DEPARTMENT_NOT_FOUND,
            )

        if not await has_permission(
            current_user, UserRole.DEPARTMENT_HEAD, session, department_id=data.department_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )

        if target_user.institution_id is None:
            target_user.institution_id = department.institution_id
        elif target_user.institution_id != department.institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
    else:
        if target_user.department_id is not None and not await has_permission(
            current_user,
            UserRole.DEPARTMENT_HEAD,
            session,
            department_id=target_user.department_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )

    target_user.department_id = data.department_id
    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user


@router.put("/{user_id}/role", response_model=UserRead)
async def assign_role(
    user_id: uuid.UUID,
    data: AssignRole,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    if data.role not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INVALID_ROLE,
        )

    result = await session.exec(select(User).where(User.id == user_id))
    target_user = result.first()
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient permissions",
        )

    if current_user.role != UserRole.ADMIN:
        if ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[current_user.role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
        if not await has_permission(
            current_user,
            UserRole.INSTITUTION_HEAD,
            session,
            institution_id=target_user.institution_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )

    target_user.role = data.role
    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user
