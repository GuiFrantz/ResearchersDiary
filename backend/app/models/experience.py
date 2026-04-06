import uuid
from datetime import date
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Experience(SQLModel, table=True):
    __tablename__ = "experiences"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    category: Optional[str] = Field(default=None)
    organization: Optional[str] = Field(default=None)
    role_title: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    visibility: str = Field(default="private")
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    is_current: bool = Field(default=False)
