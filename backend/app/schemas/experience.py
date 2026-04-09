import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.constants import Visibility


class ExperienceCreate(BaseModel):
    category: Optional[str] = None
    organization: Optional[str] = None
    role_title: Optional[str] = None
    description: Optional[str] = None
    visibility: Visibility = Visibility.INSTITUTION
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False


class ExperienceUpdate(BaseModel):
    category: Optional[str] = None
    organization: Optional[str] = None
    role_title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[Visibility] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class ExperienceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    category: Optional[str]
    organization: Optional[str]
    role_title: Optional[str]
    description: Optional[str]
    visibility: Visibility
    start_date: Optional[date]
    end_date: Optional[date]
    is_current: bool
