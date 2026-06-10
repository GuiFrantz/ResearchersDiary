import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import Experience, Project, Publication, User
from app.schemas.orcid import (
    OrcidImportRequest,
    OrcidImportResult,
    OrcidPreviewRequest,
    OrcidPreviewResult,
)
from app.services.orcid import (
    OrcidError,
    fetch_employments,
    fetch_fundings,
    fetch_person,
    fetch_works,
)

router = APIRouter(prefix=ApiPrefix.ORCID, tags=["ORCID"])

ORCID_ID_RE = re.compile(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$")

_ERROR_STATUS = {
    "not_found": (status.HTTP_404_NOT_FOUND, Errors.ORCID_PROFILE_NOT_FOUND),
    "not_configured": (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        Errors.ORCID_NOT_CONFIGURED,
    ),
    "unavailable": (status.HTTP_502_BAD_GATEWAY, Errors.ORCID_UNAVAILABLE),
}


def _normalize_orcid_id(raw: str) -> str:
    orcid_id = raw.strip().rstrip("/").split("/")[-1].upper()
    if not ORCID_ID_RE.match(orcid_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=Errors.ORCID_INVALID_ID
        )
    return orcid_id


async def _dedup_records(
    works: list[dict],
    fundings: list[dict],
    employments: list[dict],
    uid,
    session: AsyncSession,
) -> dict:
    skipped = 0

    pub_titles = {
        t.lower()
        for t in (
            await session.exec(
                select(Publication.title).where(Publication.user_id == uid)
            )
        ).all()
        if t
    }
    pub_dois = {
        d
        for d in (
            await session.exec(
                select(Publication.doi).where(Publication.doi.is_not(None))
            )
        ).all()
        if d
    }
    new_publications = []
    for work in works:
        doi = work.get("doi")
        title_key = (work.get("title") or "").lower()
        if doi and doi in pub_dois:
            skipped += 1
            continue
        if not doi and title_key in pub_titles:
            skipped += 1
            continue
        new_publications.append(work)
        pub_titles.add(title_key)
        if doi:
            pub_dois.add(doi)

    # Projects
    proj_titles = {
        t.lower()
        for t in (
            await session.exec(select(Project.title).where(Project.user_id == uid))
        ).all()
        if t
    }
    new_projects = []
    for funding in fundings:
        title_key = (funding.get("title") or "").lower()
        if title_key in proj_titles:
            skipped += 1
            continue
        new_projects.append(funding)
        proj_titles.add(title_key)

    # Experiences
    exp_keys = {
        f"{(org or '').lower()}|{(role or '').lower()}"
        for org, role in (
            await session.exec(
                select(Experience.organization, Experience.role_title).where(
                    Experience.user_id == uid
                )
            )
        ).all()
    }
    new_experiences = []
    for employment in employments:
        key = (
            f"{(employment.get('organization') or '').lower()}"
            f"|{(employment.get('role_title') or '').lower()}"
        )
        if key in exp_keys:
            skipped += 1
            continue
        new_experiences.append(employment)
        exp_keys.add(key)

    return {
        "publications": new_publications,
        "projects": new_projects,
        "experiences": new_experiences,
        "skipped": skipped,
    }


@router.post("/preview", response_model=OrcidPreviewResult)
async def preview_orcid_import(
    request: OrcidPreviewRequest,
    current_user: User = Depends(get_current_user),
):
    orcid_id = _normalize_orcid_id(request.orcid_id)
    try:
        person = await fetch_person(orcid_id)
        works = await fetch_works(orcid_id)
        fundings = await fetch_fundings(orcid_id)
        employments = await fetch_employments(orcid_id)
    except OrcidError as exc:
        code, detail = _ERROR_STATUS[exc.kind]
        raise HTTPException(status_code=code, detail=detail)

    return OrcidPreviewResult(
        person=person,
        publications=works,
        projects=fundings,
        experiences=employments,
    )


@router.post("/import", response_model=OrcidImportResult)
async def import_from_orcid(
    request: OrcidImportRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    orcid_id = _normalize_orcid_id(request.orcid_id)
    uid = current_user.id

    collected = await _dedup_records(
        [w.model_dump() for w in request.publications],
        [f.model_dump() for f in request.projects],
        [e.model_dump() for e in request.experiences],
        uid,
        session,
    )

    for work in collected["publications"]:
        session.add(Publication(user_id=uid, is_imported=True, **work))
    for funding in collected["projects"]:
        session.add(Project(user_id=uid, is_imported=True, **funding))
    for employment in collected["experiences"]:
        session.add(Experience(user_id=uid, is_imported=True, **employment))

    current_user.orcid_id = orcid_id
    session.add(current_user)
    await session.commit()

    return OrcidImportResult(
        publications_imported=len(collected["publications"]),
        projects_imported=len(collected["projects"]),
        experiences_imported=len(collected["experiences"]),
        skipped=collected["skipped"],
    )
