import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import Project, Proposal, User
from app.permissions import get_visible_records, has_permission, validate_visibility
from app.schemas import ProposalCreate, ProposalRead, ProposalUpdate

router = APIRouter(prefix="/api/proposals", tags=["Proposals"])


async def _validate_project_id(
    project_id: uuid.UUID | None,
    current_user: User,
    session: AsyncSession,
) -> None:
    if project_id is None:
        return
    result = await session.exec(select(Project).where(Project.id == project_id))
    proj = result.first()
    if proj is None or proj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project_id",
        )


@router.post("/", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    data: ProposalCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    validate_visibility(data.visibility, current_user)
    await _validate_project_id(data.project_id, current_user, session)
    proposal = Proposal(user_id=current_user.id, **data.model_dump())
    session.add(proposal)
    await session.commit()
    await session.refresh(proposal)
    return proposal


@router.get("/", response_model=list[ProposalRead])
async def list_proposals(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await get_visible_records(Proposal, current_user, session)


@router.get("/{proposal_id}", response_model=ProposalRead)
async def get_proposal(
    proposal_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.first()
    if proposal is None or not await has_permission(
        current_user, "researcher", session, record=proposal
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found"
        )
    return proposal


@router.put("/{proposal_id}", response_model=ProposalRead)
async def update_proposal(
    proposal_id: uuid.UUID,
    data: ProposalUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.first()
    if proposal is None or not await has_permission(
        current_user, "researcher", session, record=proposal, require_owner=True
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found"
        )

    patch_data = data.model_dump(exclude_unset=True)
    if "visibility" in patch_data:
        validate_visibility(patch_data["visibility"], current_user)
    await _validate_project_id(patch_data.get("project_id"), current_user, session)

    proposal.sqlmodel_update(patch_data)
    session.add(proposal)
    await session.commit()
    await session.refresh(proposal)
    return proposal


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proposal(
    proposal_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.exec(select(Proposal).where(Proposal.id == proposal_id))
    proposal = result.first()
    if proposal is None or not await has_permission(
        current_user, "researcher", session, record=proposal, require_owner=True
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found"
        )
    await session.delete(proposal)
    await session.commit()
