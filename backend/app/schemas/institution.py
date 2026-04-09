import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InstitutionCreate(BaseModel):
    name: str


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None


class InstitutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
