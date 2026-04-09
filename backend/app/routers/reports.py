import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import Errors, UserRole, Visibility
from app.database import get_session
from app.models import (
    Department,
    Experience,
    Institution,
    Project,
    Proposal,
    Publication,
    User,
)
from app.permissions import has_permission
from app.schemas.report import (
    DepartmentInfo,
    DepartmentReport,
    DepartmentRollup,
    InstitutionInfo,
    InstitutionReport,
    ProjectStats,
    ProposalStats,
    PublicationStats,
    ResearcherSummary,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# Helpers
def _count_by(items, key: str) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for item in items:
        value = getattr(item, key, None)
        label = str(value) if value is not None else "unknown"
        counts[label] += 1
    return dict(counts)


async def _fetch_visible_for_dept(
    model,
    dept_user_ids: list[uuid.UUID],
    session: AsyncSession,
    *,
    include_private: bool = False,
):
    if not dept_user_ids:
        return []
    stmt = select(model).where(model.user_id.in_(dept_user_ids))
    if not include_private:
        stmt = stmt.where(model.visibility != Visibility.PRIVATE)
    result = await session.exec(stmt)
    return result.all()


async def _build_dept_stats(
    dept_id: uuid.UUID,
    session: AsyncSession,
) -> tuple[
    list[User], PublicationStats, ProjectStats, ProposalStats, list[ResearcherSummary]
]:

    # All users in this department
    result = await session.exec(select(User).where(User.department_id == dept_id))
    dept_users: list[User] = list(result.all())
    dept_user_ids = [u.id for u in dept_users]

    publications = await _fetch_visible_for_dept(Publication, dept_user_ids, session)
    projects = await _fetch_visible_for_dept(Project, dept_user_ids, session)
    proposals = await _fetch_visible_for_dept(Proposal, dept_user_ids, session)
    experiences = await _fetch_visible_for_dept(Experience, dept_user_ids, session)

    pub_stats = PublicationStats(
        total=len(publications),
        by_status=_count_by(publications, "status"),
        by_type=_count_by(publications, "type"),
    )
    proj_stats = ProjectStats(
        total=len(projects),
        by_status=_count_by(projects, "status"),
    )
    prop_stats = ProposalStats(
        total=len(proposals),
        by_status=_count_by(proposals, "status"),
    )

    pub_by_user: dict[uuid.UUID, int] = defaultdict(int)
    proj_by_user: dict[uuid.UUID, int] = defaultdict(int)
    prop_by_user: dict[uuid.UUID, int] = defaultdict(int)
    exp_by_user: dict[uuid.UUID, int] = defaultdict(int)

    for p in publications:
        pub_by_user[p.user_id] += 1
    for p in projects:
        proj_by_user[p.user_id] += 1
    for p in proposals:
        prop_by_user[p.user_id] += 1
    for e in experiences:
        exp_by_user[e.user_id] += 1

    researcher_summaries = [
        ResearcherSummary(
            user_id=u.id,
            name=u.name,
            publication_count=pub_by_user[u.id],
            project_count=proj_by_user[u.id],
            proposal_count=prop_by_user[u.id],
            experience_count=exp_by_user[u.id],
        )
        for u in dept_users
    ]

    return dept_users, pub_stats, proj_stats, prop_stats, researcher_summaries


# Department report
@router.get("/department/{dept_id}", response_model=DepartmentReport)
async def get_department_report(
    dept_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    allowed = await has_permission(
        current_user,
        UserRole.DEPARTMENT_HEAD,
        session,
        department_id=dept_id,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    result = await session.exec(select(Department).where(Department.id == dept_id))
    department = result.first()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=Errors.DEPARTMENT_NOT_FOUND,
        )

    inst_result = await session.exec(
        select(Institution).where(Institution.id == department.institution_id)
    )
    institution = inst_result.first()
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=Errors.INSTITUTION_NOT_FOUND,
        )

    (
        dept_users,
        pub_stats,
        proj_stats,
        prop_stats,
        researcher_summaries,
    ) = await _build_dept_stats(dept_id, session)

    return DepartmentReport(
        generated_at=datetime.now(timezone.utc),
        department=DepartmentInfo(
            id=department.id, name=department.name, code=department.code
        ),
        institution=InstitutionInfo(id=institution.id, name=institution.name),
        researcher_count=len(dept_users),
        publications=pub_stats,
        projects=proj_stats,
        proposals=prop_stats,
        researchers=researcher_summaries,
    )


# Instution report
@router.get("/institution/{inst_id}", response_model=InstitutionReport)
async def get_institution_report(
    inst_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    allowed = await has_permission(
        current_user,
        UserRole.INSTITUTION_HEAD,
        session,
        institution_id=inst_id,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=Errors.INSUFFICIENT_PERMISSIONS,
        )

    inst_result = await session.exec(
        select(Institution).where(Institution.id == inst_id)
    )
    institution = inst_result.first()
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=Errors.INSTITUTION_NOT_FOUND,
        )

    dept_result = await session.exec(
        select(Department).where(Department.institution_id == inst_id)
    )
    departments: list[Department] = list(dept_result.all())

    rollups: list[DepartmentRollup] = []
    total_researchers = 0

    total_pubs = 0
    total_pub_by_status: dict[str, int] = defaultdict(int)
    total_pub_by_type: dict[str, int] = defaultdict(int)
    total_projs = 0
    total_proj_by_status: dict[str, int] = defaultdict(int)
    total_props = 0
    total_prop_by_status: dict[str, int] = defaultdict(int)

    for dept in departments:
        dept_users, pub_stats, proj_stats, prop_stats, _ = await _build_dept_stats(
            dept.id, session
        )

        total_researchers += len(dept_users)

        total_pubs += pub_stats.total
        for k, v in pub_stats.by_status.items():
            total_pub_by_status[k] += v
        for k, v in pub_stats.by_type.items():
            total_pub_by_type[k] += v

        total_projs += proj_stats.total
        for k, v in proj_stats.by_status.items():
            total_proj_by_status[k] += v

        total_props += prop_stats.total
        for k, v in prop_stats.by_status.items():
            total_prop_by_status[k] += v

        rollups.append(
            DepartmentRollup(
                department_id=dept.id,
                name=dept.name,
                code=dept.code,
                researcher_count=len(dept_users),
                publications=pub_stats,
                projects=proj_stats,
                proposals=prop_stats,
            )
        )

    institution_totals = {
        "publications": PublicationStats(
            total=total_pubs,
            by_status=dict(total_pub_by_status),
            by_type=dict(total_pub_by_type),
        ),
        "projects": ProjectStats(
            total=total_projs,
            by_status=dict(total_proj_by_status),
        ),
        "proposals": ProposalStats(
            total=total_props,
            by_status=dict(total_prop_by_status),
        ),
    }

    return InstitutionReport(
        generated_at=datetime.now(timezone.utc),
        institution=InstitutionInfo(id=institution.id, name=institution.name),
        department_count=len(departments),
        total_researchers=total_researchers,
        departments=rollups,
        institution_totals=institution_totals,
    )
