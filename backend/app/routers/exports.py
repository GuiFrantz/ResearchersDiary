import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import Experience, Project, Proposal, Publication, User
from app.schemas.export import ExportRequest, ExportResponse

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.post("", response_model=ExportResponse)
async def export_selection(
    request: ExportRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    async def fetch(model, ids: list[uuid.UUID]):
        if not ids:
            return []
        result = await session.exec(
            select(model).where(model.id.in_(ids), model.user_id == uid)
        )
        return result.all()

    publications = await fetch(Publication, request.publication_ids)
    projects = await fetch(Project, request.project_ids)
    proposals = await fetch(Proposal, request.proposal_ids)
    experiences = await fetch(Experience, request.experience_ids)

    payload = ExportResponse(
        exported_at=datetime.now(timezone.utc),
        user=current_user,
        publications=list(publications),
        projects=list(projects),
        proposals=list(proposals),
        experiences=list(experiences),
    )

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"researcher_diary_export_{date_str}.json"

    return JSONResponse(
        content=payload.model_dump(mode="json"),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
