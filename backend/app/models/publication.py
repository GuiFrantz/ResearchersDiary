import uuid
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Publication(SQLModel, table=True):
    __tablename__ = "publications"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    title: str
    type: Optional[str] = Field(default=None)
    publication_date: Optional[date] = Field(default=None)
    publisher: Optional[str] = Field(default=None)
    doi: Optional[str] = Field(
        default=None, sa_column=Column(String, unique=True, nullable=True)
    )
    url: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    visibility: str = Field(default="private")
    is_imported: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
