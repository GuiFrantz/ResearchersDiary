import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import Publication, User
from app.permissions import validate_visibility
from app.queries import get_records
from app.schemas import PublicationCreate, PublicationRead, PublicationUpdate

router = APIRouter(prefix=ApiPrefix.PUBLICATIONS, tags=["Publications"])


@router.post("/", response_model=PublicationRead, status_code=status.HTTP_201_CREATED)
async def create_publication(
    data: PublicationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    validate_visibility(data.visibility, current_user)
    publication = Publication(user_id=current_user.id, **data.model_dump())
    session.add(publication)
    await session.commit()
    await session.refresh(publication)
    return publication


@router.get("/", response_model=list[PublicationRead])
async def list_publications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await get_records(Publication, current_user, session)


@router.get("/{publication_id}", response_model=PublicationRead)
async def get_publication(
    publication_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    publication = await get_records(Publication, current_user, session, record_id=publication_id)
    if publication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PUBLICATION_NOT_FOUND
        )
    return publication


@router.put("/{publication_id}", response_model=PublicationRead)
async def update_publication(
    publication_id: uuid.UUID,
    data: PublicationUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    publication = await get_records(Publication, current_user, session, record_id=publication_id, owner_only=True)
    if publication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PUBLICATION_NOT_FOUND
        )

    updated_data = data.model_dump(exclude_unset=True)

    publication.sqlmodel_update(updated_data)
    session.add(publication)
    await session.commit()
    await session.refresh(publication)
    return publication


@router.delete("/{publication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_publication(
    publication_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    publication = await get_records(Publication, current_user, session, record_id=publication_id, owner_only=True)
    if publication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PUBLICATION_NOT_FOUND
        )
    await session.delete(publication)
    await session.commit()
