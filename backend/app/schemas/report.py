import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DepartmentInfo(BaseModel):
    id: uuid.UUID
    name: str
    code: Optional[str]


class InstitutionInfo(BaseModel):
    id: uuid.UUID
    name: str


class ResearcherSummary(BaseModel):
    user_id: uuid.UUID
    name: Optional[str]
    publication_count: int
    project_count: int
    proposal_count: int
    experience_count: int


class PublicationStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_type: dict[str, int]


class ProjectStats(BaseModel):
    total: int
    by_status: dict[str, int]


class ProposalStats(BaseModel):
    total: int
    by_status: dict[str, int]


class DepartmentReport(BaseModel):
    generated_at: datetime
    department: DepartmentInfo
    institution: InstitutionInfo
    researcher_count: int
    publications: PublicationStats
    projects: ProjectStats
    proposals: ProposalStats
    researchers: list[ResearcherSummary]


class DepartmentRollup(BaseModel):
    department_id: uuid.UUID
    name: str
    code: Optional[str]
    researcher_count: int
    publications: PublicationStats
    projects: ProjectStats
    proposals: ProposalStats


class InstitutionReport(BaseModel):
    generated_at: datetime
    institution: InstitutionInfo
    department_count: int
    total_researchers: int
    departments: list[DepartmentRollup]
    institution_totals: dict[str, PublicationStats | ProjectStats | ProposalStats]
