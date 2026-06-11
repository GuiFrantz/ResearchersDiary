import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlmodel import Field, SQLModel

from app.constants import INVITATION_TTL_DAYS, InvitationStatus, UserRole


def _default_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=INVITATION_TTL_DAYS)


class Invitation(SQLModel, table=True):
    __tablename__ = "invitations"
    __table_args__ = (
        Index(
            "ix_invitations_unique_pending",
            "recipient_id",
            "institution_id",
            unique=True,
            postgresql_where="status = 'pending'",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid4,
        sa_column=Column(pg_UUID(as_uuid=True), primary_key=True),
    )
    recipient_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    inviter_id: uuid.UUID = Field(
        sa_column=Column(pg_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    )
    institution_id: uuid.UUID = Field(
        sa_column=Column(
            pg_UUID(as_uuid=True),
            ForeignKey("institutions.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    department_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            pg_UUID(as_uuid=True),
            ForeignKey("departments.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    role: UserRole = Field(sa_column=Column(String, nullable=False))
    status: InvitationStatus = Field(
        default=InvitationStatus.PENDING,
        sa_column=Column(String, nullable=False),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    expires_at: datetime = Field(
        default_factory=_default_expires_at,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    responded_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
