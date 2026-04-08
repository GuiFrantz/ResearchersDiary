import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr

from app.constants import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=8)
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: SecretStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AssignInstitution(BaseModel):
    institution_id: Optional[uuid.UUID] = None


class AssignDepartment(BaseModel):
    department_id: Optional[uuid.UUID] = None


class AssignRole(BaseModel):
    role: UserRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: Optional[str]
    role: UserRole
    position_title: Optional[str]
    orcid_id: Optional[str]
    institution_id: Optional[uuid.UUID]
    department_id: Optional[uuid.UUID]
    created_at: datetime
