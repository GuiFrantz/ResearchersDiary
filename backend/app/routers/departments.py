import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user, require_role
from app.constants import ApiPrefix, Errors, UserRole
from app.database import get_session
from app.models import Department, User
from app.permissions import has_permission
from app.queries import get_departments, get_institutions, get_users
from app.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter(prefix=ApiPrefix.DEPARTMENTS, tags=["Departments"])


@router.post("/", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    if await get_institutions(session, data.institution_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=Errors.INSTITUTION_NOT_FOUND
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

    department = Department(**data.model_dump())
    session.add(department)
    await session.commit()
    await session.refresh(department)
    return department


@router.get("/", response_model=list[DepartmentRead])
async def list_departments(
    institution_id: Optional[uuid.UUID] = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        return await get_departments(session, institution_id=institution_id)
    if current_user.institution_id is not None:
        return await get_departments(
            session, institution_id=current_user.institution_id
        )
    return []


@router.get("/{department_id}", response_model=DepartmentRead)
async def get_department(
    department_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    department = await get_departments(session, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.DEPARTMENT_NOT_FOUND
        )
    if not await has_permission(
        current_user,
        UserRole.RESEARCHER,
        session,
        institution_id=department.institution_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.DEPARTMENT_NOT_FOUND
        )
    return department


@router.put("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.DEPARTMENT_HEAD)),
):
    department = await get_departments(session, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.DEPARTMENT_NOT_FOUND
        )

    if not await has_permission(
        current_user,
        UserRole.DEPARTMENT_HEAD,
        session,
        department_id=department.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    updated_data = data.model_dump(exclude_unset=True)
    department.sqlmodel_update(updated_data)
    session.add(department)
    await session.commit()
    await session.refresh(department)
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    department = await get_departments(session, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.DEPARTMENT_NOT_FOUND
        )

    if not await has_permission(
        current_user,
        UserRole.INSTITUTION_HEAD,
        session,
        institution_id=department.institution_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if len(await get_users(session, department_id=department_id)) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.DEPARTMENT_HAS_USERS,
        )

    await session.delete(department)
    await session.commit()
