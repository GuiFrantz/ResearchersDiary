import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import ROLE_HIERARCHY, get_current_user, require_role
from app.constants import ApiPrefix, Errors, UserRole
from app.database import get_session
from app.models import User
from app.permissions import get_department, get_institution, get_users, has_permission
from app.schemas import AssignDepartment, AssignInstitution, AssignRole, UserRead

router = APIRouter(prefix=ApiPrefix.USERS, tags=["Users"])


@router.get("/", response_model=list[UserRead])
async def list_users(
    institution_id: Optional[uuid.UUID] = Query(default=None),
    department_id: Optional[uuid.UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        return await get_users(session, department_id=department_id, institution_id=institution_id)

    if department_id is not None:
        department = await get_department(session, department_id)
        if department is None or department.institution_id != current_user.institution_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=Errors.INSUFFICIENT_PERMISSIONS)
        return await get_users(session, department_id=department_id)

    if institution_id is not None:
        if current_user.institution_id != institution_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=Errors.INSUFFICIENT_PERMISSIONS)
        return await get_users(session, institution_id=institution_id)

    if current_user.institution_id is not None:
        return await get_users(session, institution_id=current_user.institution_id)
    return await get_users(session, user_id=current_user.id)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    user = await get_users(session, user_id=user_id)
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
    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    institution = await get_institution(session, data.institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
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

    if (
        target_user.institution_id is not None
        and target_user.institution_id != data.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.USER_ALREADY_IN_INSTITUTION,
        )

    target_user.institution_id = data.institution_id
    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user


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

    if target_user.institution_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.USER_NOT_IN_ANY_INSTITUTION,
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

    department = await get_department(session, data.department_id)
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
            detail=Errors.USER_NOT_IN_INSTITUTION,
        )

    target_user.department_id = data.department_id
    session.add(target_user)
    await session.commit()
    await session.refresh(target_user)
    return target_user


@router.delete("/{user_id}/department", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_department(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.DEPARTMENT_HEAD)),
):
    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if target_user.department_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.USER_NOT_IN_ANY_DEPARTMENT,
        )

    if not await has_permission(
        current_user,
        UserRole.DEPARTMENT_HEAD,
        session,
        department_id=target_user.department_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    target_user.department_id = None
    session.add(target_user)
    await session.commit()


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

    target_user = await get_users(session, user_id=user_id)
    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.USER_NOT_FOUND
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
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
