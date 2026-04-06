import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    title: str
    agency: Optional[str] = Field(default=None)
    grant_number: Optional[str] = Field(default=None)
    role: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    visibility: str = Field(default="private")
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    budget: Optional[Decimal] = Field(
        default=None, sa_column=Column(Numeric(precision=15, scale=2), nullable=True)
    )
