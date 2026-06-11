import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import ROLE_HIERARCHY, get_current_user, require_role
from app.constants import ApiPrefix, Errors, UserRole
from app.database import get_session
from app.models import User
from app.permissions import has_permission
from app.queries import (
    get_department_head,
    get_departments,
    get_user_by_email,
    get_users,
)
from app.schemas import AssignDepartment, AssignRole, UserRead

router = APIRouter(prefix=ApiPrefix.USERS, tags=["Users"])


@router.get("", response_model=list[UserRead])
async def list_users(
    institution_id: Optional[uuid.UUID] = Query(default=None),
    department_id: Optional[uuid.UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if department_id is not None:
        department = await get_departments(session, department_id)
        if (
            department is None
            or department.institution_id != current_user.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
        return await get_users(session, department_id=department_id)

    if institution_id is not None:
        if current_user.institution_id != institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=Errors.INSUFFICIENT_PERMISSIONS,
            )
        return await get_users(session, institution_id=institution_id)

    if current_user.institution_id is not None:
        return await get_users(session, institution_id=current_user.institution_id)
    return [current_user]


@router.get("/find-user", response_model=UserRead)
async def find_user(
    email: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    user = await get_user_by_email(session, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )
    return user


@router.delete("/{user_id}/institution", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_institution(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.BAD_REQUEST,
        )

    if target_user.institution_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.NOT_A_MEMBER,
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

    target_user.institution_id = None
    target_user.department_id = None
    target_user.role = UserRole.RESEARCHER
    session.add(target_user)
    await session.commit()


@router.put("/{user_id}/department", response_model=UserRead)
async def assign_department(
    user_id: uuid.UUID,
    data: AssignDepartment,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.DEPARTMENT_HEAD)),
):
    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    department = await get_departments(session, data.department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.DEPARTMENT_NOT_FOUND
        )

    if not await has_permission(
        current_user,
        UserRole.DEPARTMENT_HEAD,
        session,
        department_id=data.department_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if target_user.institution_id != department.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.NOT_A_MEMBER,
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
    current_user: User = Depends(get_current_user),
):
    if data.role not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=Errors.INVALID_ROLE
        )

    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.BAD_REQUEST,
        )

    if target_user.institution_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.NOT_A_MEMBER,
        )

    if data.role == UserRole.DEPARTMENT_HEAD:
        if target_user.department_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=Errors.NOT_A_MEMBER,
            )
        allowed = await has_permission(
            current_user,
            UserRole.DEPARTMENT_HEAD,
            session,
            department_id=target_user.department_id,
        )
    else:
        allowed = await has_permission(
            current_user,
            UserRole.INSTITUTION_HEAD,
            session,
            institution_id=target_user.institution_id,
        )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if data.role == UserRole.INSTITUTION_HEAD:
        current_user.role = UserRole.RESEARCHER
        session.add(current_user)
    elif data.role == UserRole.DEPARTMENT_HEAD:
        current_dept_head = await get_department_head(
            session, target_user.department_id
        )
        if current_dept_head is not None and current_dept_head.id != target_user.id:
            current_dept_head.role = UserRole.RESEARCHER
            session.add(current_dept_head)

    target_user.role = data.role
    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user
