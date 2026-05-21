import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

DATABASE_URL = os.environ["DATABASE_URL"]
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session
