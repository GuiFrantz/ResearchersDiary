import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user, require_role
from app.constants import ApiPrefix, Errors, UserRole
from app.database import get_session
from app.models import Institution, User
from app.permissions import has_permission
from app.queries import get_institutions, get_users
from app.schemas import InstitutionCreate, InstitutionRead, InstitutionUpdate

router = APIRouter(prefix=ApiPrefix.INSTITUTIONS, tags=["Institutions"])


@router.post("/", response_model=InstitutionRead, status_code=status.HTTP_201_CREATED)
async def create_institution(
    data: InstitutionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    institution = Institution(**data.model_dump())
    session.add(institution)
    await session.commit()
    await session.refresh(institution)
    return institution


@router.get("/", response_model=list[InstitutionRead])
async def list_institutions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await get_institutions(session)


@router.get("/{institution_id}", response_model=InstitutionRead)
async def get_institution(
    institution_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    institution = await get_institutions(session, institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
        )
    if not await has_permission(
        current_user, UserRole.RESEARCHER, session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
        )
    return institution


@router.put("/{institution_id}", response_model=InstitutionRead)
async def update_institution(
    institution_id: uuid.UUID,
    data: InstitutionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    institution = await get_institutions(session, institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
        )

    if not await has_permission(
        current_user, UserRole.INSTITUTION_HEAD, session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    updated_data = data.model_dump(exclude_unset=True)
    institution.sqlmodel_update(updated_data)
    session.add(institution)
    await session.commit()
    await session.refresh(institution)
    return institution


@router.delete("/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(
    institution_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.INSTITUTION_HEAD)),
):
    institution = await get_institutions(session, institution_id)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.INSTITUTION_NOT_FOUND
        )

    if not await has_permission(
        current_user, UserRole.INSTITUTION_HEAD, session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    if len(await get_users(session, institution_id=institution_id)) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.INSTITUTION_HAS_USERS,
        )

    await session.delete(institution)
    await session.commit()
