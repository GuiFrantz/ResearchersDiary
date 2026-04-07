import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user, require_role
from app.database import get_session
from app.models import Institution, User
from app.permissions import has_permission
from app.schemas import InstitutionCreate, InstitutionRead, InstitutionUpdate

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])


@router.post("/", response_model=InstitutionRead, status_code=status.HTTP_201_CREATED)
async def create_institution(
    data: InstitutionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    institution = Institution(**data.model_dump())
    session.add(institution)
    await session.commit()
    await session.refresh(institution)
    return institution


@router.get("/", response_model=list[InstitutionRead])
async def list_institutions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    result = await session.exec(select(Institution))
    return result.all()


@router.get("/{institution_id}", response_model=InstitutionRead)
async def get_institution(
    institution_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.first()
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )
    if not await has_permission(
        current_user, "researcher", session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )
    return institution


@router.put("/{institution_id}", response_model=InstitutionRead)
async def update_institution(
    institution_id: uuid.UUID,
    data: InstitutionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("institution_head")),
):
    result = await session.exec(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.first()
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )

    if not await has_permission(
        current_user, "institution_head", session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    patch_data = data.model_dump(exclude_unset=True)
    institution.sqlmodel_update(patch_data)
    session.add(institution)
    await session.commit()
    await session.refresh(institution)
    return institution


@router.delete("/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(
    institution_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("institution_head")),
):
    result = await session.exec(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.first()
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )

    if not await has_permission(
        current_user, "institution_head", session, institution_id=institution.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    user_result = await session.exec(
        select(User).where(User.institution_id == institution_id).limit(1)
    )
    if user_result.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution still has assigned users",
        )

    await session.delete(institution)
    await session.commit()
