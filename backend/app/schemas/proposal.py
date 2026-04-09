import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.constants import ProposalStatus, Visibility


class ProposalCreate(BaseModel):
    title: str
    funding_body: Optional[str] = None
    reference: Optional[str] = None
    role: Optional[str] = None
    status: Optional[ProposalStatus] = None
    visibility: Visibility = Visibility.INSTITUTION
    submission_date: Optional[date] = None
    decision_date: Optional[date] = None
    project_id: Optional[uuid.UUID] = None


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    funding_body: Optional[str] = None
    reference: Optional[str] = None
    role: Optional[str] = None
    status: Optional[ProposalStatus] = None
    visibility: Optional[Visibility] = None
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
    status: Optional[ProposalStatus]
    visibility: Visibility
    submission_date: Optional[date]
    decision_date: Optional[date]
    project_id: Optional[uuid.UUID]
