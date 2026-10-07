from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantCreate, ParticipantLookupIn, ParticipantLookupOut, ParticipantOut
from app.services.orchestration import get_or_create_active_protocol, protocol_schedule, protocol_total_rounds
from app.services.rounds import open_session, progress
from app.services.study_design import UNASSIGNED, generate_participant_code, normalize_code

router = APIRouter(prefix="/participants", tags=["participants"])


async def _unique_code(db: AsyncSession) -> str:
    # 32^6 ≈ 1 billion codes, so a clash is rare; retry rather than assume
    for _ in range(10):
        code = generate_participant_code()
        taken = await db.scalar(select(Participant.id).where(Participant.participant_code == code))
        if not taken:
            return code
    raise HTTPException(status_code=500, detail="Could not allocate a participant code")


@router.post("", response_model=ParticipantOut)
@router.post("/", response_model=ParticipantOut, include_in_schema=False)
async def create_participant(
    participant_in: ParticipantCreate,
    db: AsyncSession = Depends(get_db)
):
    # No group yet: researchers assign groups after session 1 (the pre-test)
    participant = Participant(
        **participant_in.model_dump(),
        external_id=str(uuid.uuid4())[:8].upper(),
        participant_code=await _unique_code(db),
        condition=UNASSIGNED
    )

    db.add(participant)
    await db.commit()
    await db.refresh(participant)

    return participant


@router.post("/lookup", response_model=ParticipantLookupOut)
async def lookup_participant(payload: ParticipantLookupIn, db: AsyncSession = Depends(get_db)):
    """A returning student enters their code. Only their first name comes
    back, so they can confirm it's them without exposing other details."""
    participant = await db.scalar(
        select(Participant).where(Participant.participant_code == normalize_code(payload.code))
    )
    if not participant:
        raise HTTPException(status_code=404, detail="We couldn't find that code. Check it with your teacher.")

    protocol = await get_or_create_active_protocol(db)
    total_rounds = protocol_total_rounds(protocol)
    resuming = await open_session(participant.id, db)
    if resuming:
        status, next_round = "ready", resuming.round_number
    else:
        status, next_round = await progress(participant, protocol_schedule(protocol), db)

    return ParticipantLookupOut(
        participant_id=participant.id,
        first_name=participant.name.strip().split()[0] if participant.name.strip() else "",
        status=status,
        next_round=next_round,
        total_rounds=total_rounds,
        study_complete=status == "complete",
    )
