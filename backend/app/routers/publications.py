import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import Publication, User
from app.permissions import get_visible_records, has_permission, validate_visibility
from app.schemas import PublicationCreate, PublicationRead, PublicationUpdate

router = APIRouter(prefix="/api/publications", tags=["Publications"])


@router.post("/", response_model=PublicationRead, status_code=status.HTTP_201_CREATED)
async def create_publication(
    data: PublicationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    validate_visibility(data.visibility, current_user)
    publication = Publication(user_id=current_user.id, **data.model_dump())
    try:
        session.add(publication)
        await session.commit()
        await session.refresh(publication)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A publication with this DOI already exists",
        )
    return publication


@router.get("/", response_model=list[PublicationRead])
async def list_publications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await get_visible_records(Publication, current_user, session)


@router.get("/{publication_id}", response_model=PublicationRead)
async def get_publication(
    publication_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Publication).where(Publication.id == publication_id)
    )
    publication = result.first()
    if publication is None or not await has_permission(
        current_user, "researcher", session, record=publication
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found"
        )
    return publication


@router.put("/{publication_id}", response_model=PublicationRead)
async def update_publication(
    publication_id: uuid.UUID,
    data: PublicationUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Publication).where(Publication.id == publication_id)
    )
    publication = result.first()
    if publication is None or not await has_permission(
        current_user, "researcher", session, record=publication, require_owner=True
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found"
        )

    patch_data = data.model_dump(exclude_unset=True)
    if "visibility" in patch_data:
        validate_visibility(patch_data["visibility"], current_user)

    publication.sqlmodel_update(patch_data)
    try:
        session.add(publication)
        await session.commit()
        await session.refresh(publication)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A publication with this DOI already exists",
        )
    return publication


@router.delete("/{publication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_publication(
    publication_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Publication).where(Publication.id == publication_id)
    )
    publication = result.first()
    if publication is None or not await has_permission(
        current_user, "researcher", session, record=publication, require_owner=True
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Publication not found"
        )
    await session.delete(publication)
    await session.commit()
