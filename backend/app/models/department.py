import uuid
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Department(SQLModel, table=True):
    __tablename__ = "departments"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    institution_id: uuid.UUID = Field(
        sa_column=Column(
            pg_UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False
        )
    )
    name: str
    code: Optional[str] = Field(default=None)
