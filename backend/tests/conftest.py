import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret")

import uuid

import pytest
from app.auth import create_access_token, hash_password
from app.constants import UserRole
from app.database import get_session
from app.main import app
from app.models import Department, Institution, User
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
async def engine():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session(engine):
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
async def client(session):
    async def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(session):
    async def _make_user(
        email: str | None = None,
        *,
        name: str | None = None,
        role: UserRole = UserRole.RESEARCHER,
        institution_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
        password: str | None = None,
    ) -> User:
        user = User(
            email=email or f"user-{uuid.uuid4().hex[:8]}@test.com",
            name=name,
            role=role,
            institution_id=institution_id,
            department_id=department_id,
            password_hash=hash_password(password) if password else None,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    return _make_user


@pytest.fixture
def make_institution(session):
    async def _make_institution(name: str = "Test Institution") -> Institution:
        institution = Institution(name=name)
        session.add(institution)
        await session.commit()
        await session.refresh(institution)
        return institution

    return _make_institution


@pytest.fixture
def make_department(session):
    async def _make_department(
        institution_id: uuid.UUID, name: str = "Test Department"
    ) -> Department:
        department = Department(institution_id=institution_id, name=name)
        session.add(department)
        await session.commit()
        await session.refresh(department)
        return department

    return _make_department


@pytest.fixture
async def org(make_institution, make_department, make_user):
    """Instituição com um departamento e o respetivo institution head."""
    institution = await make_institution()
    department = await make_department(institution.id)
    head = await make_user(
        role=UserRole.INSTITUTION_HEAD, institution_id=institution.id
    )
    return institution, department, head
