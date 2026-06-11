from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import User
from app.queries import get_user_by_email
from app.schemas import Token, UserLogin, UserProfileUpdate, UserRead, UserRegister

router = APIRouter(prefix=ApiPrefix.AUTH, tags=["Auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, session: AsyncSession = Depends(get_session)):
    if await get_user_by_email(session, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=Errors.EMAIL_ALREADY_REGISTERED,
        )

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password.get_secret_value()),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
async def login(data: UserLogin, session: AsyncSession = Depends(get_session)):
    user = await get_user_by_email(session, data.email)

    if user is None or not verify_password(
        data.password.get_secret_value(), user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=Errors.INVALID_CREDENTIALS,
        )

    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
async def update_me(
    data: UserProfileUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    update = data.model_dump(exclude_unset=True)
    if "name" in update:
        current_user.name = update["name"] or None
    if "orcid_id" in update:
        current_user.orcid_id = update["orcid_id"] or None
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user
