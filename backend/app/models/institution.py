import uuid
from uuid import uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Institution(SQLModel, table=True):
    __tablename__ = "institutions"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    name: str
