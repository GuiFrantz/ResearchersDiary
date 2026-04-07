import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user, require_role
from app.database import get_session
from app.models import Department, Institution, User
from app.permissions import has_permission
from app.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter(prefix="/api/departments", tags=["Departments"])


@router.post("/", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("institution_head")),
):

    result = await session.exec(
        select(Institution).where(Institution.id == data.institution_id)
    )
    if result.first() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Institution not found"
        )

    if not await has_permission(
        current_user, "institution_head", session, institution_id=data.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
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
    stmt = select(Department)
    if current_user.role == "admin":
        if institution_id is not None:
            stmt = stmt.where(Department.institution_id == institution_id)
    elif current_user.institution_id is not None:
        stmt = stmt.where(Department.institution_id == current_user.institution_id)
    else:
        return []
    result = await session.exec(stmt)
    return result.all()


@router.get("/{department_id}", response_model=DepartmentRead)
async def get_department(
    department_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Department).where(Department.id == department_id)
    )
    department = result.first()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    if not await has_permission(
        current_user, "researcher", session, institution_id=department.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    return department


@router.put("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("department_head")),
):
    result = await session.exec(
        select(Department).where(Department.id == department_id)
    )
    department = result.first()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    if not await has_permission(
        current_user,
        "department_head",
        session,
        department_id=department.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    patch_data = data.model_dump(exclude_unset=True)
    department.sqlmodel_update(patch_data)
    session.add(department)
    await session.commit()
    await session.refresh(department)
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("institution_head")),
):
    result = await session.exec(
        select(Department).where(Department.id == department_id)
    )
    department = result.first()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    if not await has_permission(
        current_user,
        "institution_head",
        session,
        institution_id=department.institution_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    user_result = await session.exec(
        select(User).where(User.department_id == department_id).limit(1)
    )
    if user_result.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department still has assigned users",
        )

    await session.delete(department)
    await session.commit()
