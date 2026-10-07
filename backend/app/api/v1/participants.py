from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantCreate, ParticipantOut
from app.services.orchestration import assign_condition, get_or_create_active_protocol

router = APIRouter(prefix="/participants", tags=["participants"])

@router.post("", response_model=ParticipantOut)
@router.post("/", response_model=ParticipantOut, include_in_schema=False)
async def create_participant(
    participant_in: ParticipantCreate,
    db: AsyncSession = Depends(get_db)
):
    protocol = await get_or_create_active_protocol(db)
    external_id = str(uuid.uuid4())[:8].upper()
    condition = assign_condition(protocol.ai_feedback_percentage)
    
    participant = Participant(
        **participant_in.model_dump(),
        external_id=external_id,
        condition=condition
    )
    
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    return participant
