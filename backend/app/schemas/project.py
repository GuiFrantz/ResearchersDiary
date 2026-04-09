import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.constants import ProjectStatus, Visibility


class ProjectCreate(BaseModel):
    title: str
    agency: Optional[str] = None
    grant_number: Optional[str] = None
    role: Optional[str] = None
    status: Optional[ProjectStatus] = None
    visibility: Visibility = Visibility.INSTITUTION
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    agency: Optional[str] = None
    grant_number: Optional[str] = None
    role: Optional[str] = None
    status: Optional[ProjectStatus] = None
    visibility: Optional[Visibility] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    agency: Optional[str]
    grant_number: Optional[str]
    role: Optional[str]
    status: Optional[ProjectStatus]
    visibility: Visibility
    start_date: Optional[date]
    end_date: Optional[date]
    budget: Optional[Decimal]
