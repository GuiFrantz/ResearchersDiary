import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.constants import InvitationStatus, UserRole


class InvitationCreate(BaseModel):
    recipient_id: uuid.UUID
    institution_id: uuid.UUID
    department_id: Optional[uuid.UUID] = None
    role: UserRole


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recipient_id: uuid.UUID
    inviter_id: uuid.UUID
    institution_id: uuid.UUID
    department_id: Optional[uuid.UUID]
    role: UserRole
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime]

    institution_name: Optional[str] = None
    department_name: Optional[str] = None
    inviter_name: Optional[str] = None
    recipient_name: Optional[str] = None
