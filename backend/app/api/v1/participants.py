from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import IntakeIn, ParticipantCreate, ParticipantLookupIn, ParticipantLookupOut, ParticipantOut
from app.schemas.session import SessionOut
from app.api.v1.sessions import session_out
from app.services.session_flow import record_stage, start_round
from pydantic import BaseModel
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


class IntakeOut(BaseModel):
    participant: ParticipantOut
    session: SessionOut


@router.post("/intake", response_model=IntakeOut)
async def intake(payload: IntakeIn, db: AsyncSession = Depends(get_db)):
    """The details form in one request: create the participant, start
    session 1, and record consent and details as complete, in one
    transaction (each round trip to the database costs ~0.3 s)."""
    protocol = await get_or_create_active_protocol(db)
    # Everything is written in one commit at the end. A random code clashing
    # is ~1 in a billion; the unique constraint catches it and we retry.
    for attempt in range(3):
        participant = Participant(
            id=str(uuid.uuid4()),
            **payload.model_dump(exclude={"demographics"}),
            external_id=str(uuid.uuid4())[:8].upper(),
            participant_code=generate_participant_code(),
            condition=UNASSIGNED,
            created_at=datetime.utcnow(),
        )
        db.add(participant)
        session = await start_round(participant, protocol, db, new_participant=True)
        if session.current_stage == "intake_consent":
            record_stage(session, "intake_consent", {"consent": True}, db)
        record_stage(session, "demographics", payload.demographics, db)
        try:
            await db.commit()
            break
        except IntegrityError:
            await db.rollback()
            if attempt == 2:
                raise HTTPException(status_code=500, detail="Could not allocate a participant code")
            protocol = await get_or_create_active_protocol(db)  # rollback expired it

    return IntakeOut(
        participant=ParticipantOut.model_validate(participant),
        session=session_out(session, participant, protocol_total_rounds(protocol), protocol_schedule(protocol)),
    )


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
