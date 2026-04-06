import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PublicationCreate(BaseModel):
    title: str
    type: Optional[str] = None
    publication_date: Optional[date] = None
    publisher: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    visibility: str = "private"
    is_imported: bool = False


class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    publication_date: Optional[date] = None
    publisher: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    is_imported: Optional[bool] = None


class PublicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    type: Optional[str]
    publication_date: Optional[date]
    publisher: Optional[str]
    doi: Optional[str]
    url: Optional[str]
    status: Optional[str]
    visibility: str
    is_imported: bool
    created_at: datetime
