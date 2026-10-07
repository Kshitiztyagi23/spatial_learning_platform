from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.trial import Trial
from app.models.response import Response
from app.schemas.trial import TrialCreate, TrialOut
from app.services.scoring import score_trial
from app.services.task_instances import get_or_create_task_instance

router = APIRouter(prefix="/sessions/{session_id}/trials", tags=["trials"])

@router.post("", response_model=TrialOut)
@router.post("/", response_model=TrialOut, include_in_schema=False)
async def create_trial(
    session_id: str,
    trial_in: TrialCreate,
    db: AsyncSession = Depends(get_db)
):
    ti = await get_or_create_task_instance(session_id, trial_in.task_type, db)
    trial = Trial(
        task_instance_id=ti.id,
        trial_number=trial_in.trial_number,
        stimulus_id=trial_in.stimulus_id,
        correct_response=trial_in.correct_response
    )
    db.add(trial)
    await db.flush()

    correct = score_trial(trial_in.task_type, trial_in.response_value, trial_in.correct_response)

    response_record = Response(
        trial_id=trial.id,
        response_value=trial_in.response_value,
        correct=correct,
        reaction_time_ms=trial_in.reaction_time_ms
    )
    db.add(response_record)
    
    await db.commit()
    
    return TrialOut(
        id=trial.id,
        trial_number=trial.trial_number,
        correct=correct,
        created_at=response_record.created_at
    )
