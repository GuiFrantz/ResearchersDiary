import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import Experience, Project, Proposal, Publication, User
from app.queries import get_records
from app.schemas import (
    ExperienceCreate,
    ExperienceRead,
    ExperienceUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ProposalCreate,
    ProposalRead,
    ProposalUpdate,
    PublicationCreate,
    PublicationRead,
    PublicationUpdate,
)


def crud_router(model, Create, Update, Read, prefix: str, tag: str, not_found: str):
    router = APIRouter(prefix=prefix, tags=[tag])

    async def get_or_404(record_id, current_user, session, owner_only=False):
        record = await get_records(
            model, current_user, session, record_id=record_id, owner_only=owner_only
        )
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)
        return record

    @router.post("", response_model=Read, status_code=status.HTTP_201_CREATED)
    async def create_record(
        data: Create,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        record = model(user_id=current_user.id, **data.model_dump())
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    @router.get("", response_model=list[Read])
    async def list_records(
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        return await get_records(model, current_user, session)

    @router.get("/{record_id}", response_model=Read)
    async def get_record(
        record_id: uuid.UUID,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        return await get_or_404(record_id, current_user, session)

    @router.put("/{record_id}", response_model=Read)
    async def update_record(
        record_id: uuid.UUID,
        data: Update,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        record = await get_or_404(record_id, current_user, session, owner_only=True)
        record.sqlmodel_update(data.model_dump(exclude_unset=True))
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    @router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_record(
        record_id: uuid.UUID,
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        record = await get_or_404(record_id, current_user, session, owner_only=True)
        await session.delete(record)
        await session.commit()

    return router


routers = [
    crud_router(
        Publication,
        PublicationCreate,
        PublicationUpdate,
        PublicationRead,
        ApiPrefix.PUBLICATIONS,
        "Publications",
        Errors.PUBLICATION_NOT_FOUND,
    ),
    crud_router(
        Project,
        ProjectCreate,
        ProjectUpdate,
        ProjectRead,
        ApiPrefix.PROJECTS,
        "Projects",
        Errors.PROJECT_NOT_FOUND,
    ),
    crud_router(
        Proposal,
        ProposalCreate,
        ProposalUpdate,
        ProposalRead,
        ApiPrefix.PROPOSALS,
        "Proposals",
        Errors.PROPOSAL_NOT_FOUND,
    ),
    crud_router(
        Experience,
        ExperienceCreate,
        ExperienceUpdate,
        ExperienceRead,
        ApiPrefix.EXPERIENCES,
        "Experiences",
        Errors.EXPERIENCE_NOT_FOUND,
    ),
]
