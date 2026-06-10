from datetime import date
from typing import Optional

from pydantic import BaseModel


class OrcidWork(BaseModel):
    title: str
    type: Optional[str] = None
    publication_date: Optional[date] = None
    publisher: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    abstract: Optional[str] = None


class OrcidFunding(BaseModel):
    title: str
    agency: Optional[str] = None
    grant_number: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class OrcidEmployment(BaseModel):
    organization: str
    role_title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False


class OrcidPerson(BaseModel):
    name: Optional[str] = None
    biography: Optional[str] = None
    country: Optional[str] = None
    keywords: list[str] = []


class OrcidPreviewRequest(BaseModel):
    orcid_id: str


class OrcidPreviewResult(BaseModel):
    person: Optional[OrcidPerson] = None
    publications: list[OrcidWork]
    projects: list[OrcidFunding]
    experiences: list[OrcidEmployment]


class OrcidImportRequest(BaseModel):
    orcid_id: str
    publications: list[OrcidWork] = []
    projects: list[OrcidFunding] = []
    experiences: list[OrcidEmployment] = []


class OrcidImportResult(BaseModel):
    publications_imported: int
    projects_imported: int
    experiences_imported: int
    skipped: int
