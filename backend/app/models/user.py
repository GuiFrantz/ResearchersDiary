import uuid
from typing import Optional

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel

from app.constants import AuthProvider, UserRole


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    email: str = Field(sa_column=Column(String, unique=True, nullable=False))
    name: Optional[str] = Field(default=None)
    password_hash: Optional[str] = Field(default=None)
    auth_provider: AuthProvider = Field(default=AuthProvider.LOCAL)
    orcid_id: Optional[str] = Field(default=None)

    institution_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            pg_UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=True
        ),
    )
    department_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            pg_UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
        ),
    )

    role: UserRole = Field(default=UserRole.RESEARCHER)
    position_title: Optional[str] = Field(default=None)
