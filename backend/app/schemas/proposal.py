import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProposalCreate(BaseModel):
    title: str
    funding_body: Optional[str] = None
    reference: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    visibility: str = "private"
    submission_date: Optional[date] = None
    decision_date: Optional[date] = None
    project_id: Optional[uuid.UUID] = None


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    funding_body: Optional[str] = None
    reference: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    submission_date: Optional[date] = None
    decision_date: Optional[date] = None
    project_id: Optional[uuid.UUID] = None


class ProposalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    funding_body: Optional[str]
    reference: Optional[str]
    role: Optional[str]
    status: Optional[str]
    visibility: str
    submission_date: Optional[date]
    decision_date: Optional[date]
    project_id: Optional[uuid.UUID]
