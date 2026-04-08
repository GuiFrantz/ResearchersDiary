import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_user
from app.constants import ApiPrefix, Errors
from app.database import get_session
from app.models import Proposal, User
from app.queries import get_records
from app.schemas import ProposalCreate, ProposalRead, ProposalUpdate

router = APIRouter(prefix=ApiPrefix.PROPOSALS, tags=["Proposals"])


@router.post("/", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    data: ProposalCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
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
    return await get_records(Proposal, current_user, session)


@router.get("/{proposal_id}", response_model=ProposalRead)
async def get_proposal(
    proposal_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = await get_records(Proposal, current_user, session, record_id=proposal_id)
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROPOSAL_NOT_FOUND
        )
    return proposal


@router.put("/{proposal_id}", response_model=ProposalRead)
async def update_proposal(
    proposal_id: uuid.UUID,
    data: ProposalUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    proposal = await get_records(
        Proposal, current_user, session, record_id=proposal_id, owner_only=True
    )
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROPOSAL_NOT_FOUND
        )

    updated_data = data.model_dump(exclude_unset=True)

    proposal.sqlmodel_update(updated_data)
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
    proposal = await get_records(
        Proposal, current_user, session, record_id=proposal_id, owner_only=True
    )
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=Errors.PROPOSAL_NOT_FOUND
        )
    await session.delete(proposal)
    await session.commit()
