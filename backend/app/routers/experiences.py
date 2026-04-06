import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import Experience, User
from app.schemas import ExperienceCreate, ExperienceRead, ExperienceUpdate

router = APIRouter(prefix="/api/experiences", tags=["Experiences"])


@router.post("/", response_model=ExperienceRead, status_code=status.HTTP_201_CREATED)
async def create_experience(
    data: ExperienceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    experience = Experience(user_id=current_user.id, **data.model_dump())
    session.add(experience)
    await session.commit()
    await session.refresh(experience)
    return experience


@router.get("/", response_model=list[ExperienceRead])
async def list_experiences(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Experience).where(Experience.user_id == current_user.id)
    )
    return result.all()


@router.get("/{experience_id}", response_model=ExperienceRead)
async def get_experience(
    experience_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.first()
    if experience is None or experience.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found"
        )
    return experience


@router.put("/{experience_id}", response_model=ExperienceRead)
async def update_experience(
    experience_id: uuid.UUID,
    data: ExperienceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.first()
    if experience is None or experience.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found"
        )

    patch_data = data.model_dump(exclude_unset=True)

    experience.sqlmodel_update(patch_data)
    session.add(experience)
    await session.commit()
    await session.refresh(experience)
    return experience


@router.delete("/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(
    experience_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.first()
    if experience is None or experience.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found"
        )
    await session.delete(experience)
    await session.commit()
