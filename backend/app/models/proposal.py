import uuid
from datetime import date
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel


class Proposal(SQLModel, table=True):
    __tablename__ = "proposals"

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    title: str
    funding_body: Optional[str] = Field(default=None)
    reference: Optional[str] = Field(default=None)
    role: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    visibility: str = Field(default="private")
    submission_date: Optional[date] = Field(default=None)
    decision_date: Optional[date] = Field(default=None)
    project_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True),
    )
