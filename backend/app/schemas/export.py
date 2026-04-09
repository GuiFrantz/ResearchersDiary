import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.experience import ExperienceRead
from app.schemas.project import ProjectRead
from app.schemas.proposal import ProposalRead
from app.schemas.publication import PublicationRead
from app.schemas.user import UserRead


class ExportRequest(BaseModel):
    publication_ids: list[uuid.UUID] = []
    project_ids: list[uuid.UUID] = []
    proposal_ids: list[uuid.UUID] = []
    experience_ids: list[uuid.UUID] = []


class ExportResponse(BaseModel):
    exported_at: datetime
    user: UserRead
    publications: list[PublicationRead]
    projects: list[ProjectRead]
    proposals: list[ProposalRead]
    experiences: list[ExperienceRead]
