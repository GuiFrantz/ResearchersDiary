import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import Project, User
from app.permissions import get_records
from app.schemas import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix=ApiPrefix.PROJECTS, tags=["Projects"])


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = Project(user_id=current_user.id, **data.model_dump())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@router.get("/", response_model=list[ProjectRead])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await get_records(Project, current_user, session)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = await get_records(Project, current_user, session, record_id=project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROJECT_NOT_FOUND
        )
    return project


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = await get_records(
        Project, current_user, session, record_id=project_id, owner_only=True
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROJECT_NOT_FOUND
        )

    updated_data = data.model_dump(exclude_unset=True)

    project.sqlmodel_update(updated_data)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = await get_records(
        Project, current_user, session, record_id=project_id, owner_only=True
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROJECT_NOT_FOUND
        )
    await session.delete(project)
    await session.commit()
