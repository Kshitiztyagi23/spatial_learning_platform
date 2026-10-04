from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.core.database import get_db
from app.models.trial import Trial
from app.models.response import Response
from app.schemas.trial import TrialCreate, TrialOut

from sqlalchemy import select
from app.models.task_instance import TaskInstance

router = APIRouter(prefix="/sessions/{session_id}/trials", tags=["trials"])

async def get_or_create_ptsot_task_instance(session_id: str, db: AsyncSession) -> TaskInstance:
    stmt = select(TaskInstance).where(
        TaskInstance.session_id == session_id,
        TaskInstance.task_type == "ptsot",
        TaskInstance.status == "active"
    )
    result = await db.execute(stmt)
    ti = result.scalar_one_or_none()
    if not ti:
        ti = TaskInstance(
            session_id=session_id,
            task_type="ptsot",
            status="active"
        )
        db.add(ti)
        await db.flush()
    return ti

@router.post("", response_model=TrialOut)
@router.post("/", response_model=TrialOut, include_in_schema=False)
async def create_trial(
    session_id: str,
    trial_in: TrialCreate,
    db: AsyncSession = Depends(get_db)
):
    ti = await get_or_create_ptsot_task_instance(session_id, db)
    trial = Trial(
        task_instance_id=ti.id,
        trial_number=trial_in.trial_number,
        correct_response=trial_in.correct_response
    )
    db.add(trial)
    await db.flush()
    
    correct = None
    if trial_in.correct_response is not None:
        try:
            resp_val = float(trial_in.response_value)
            corr_val = float(trial_in.correct_response)
            correct = abs(resp_val - corr_val) <= 22.5
        except ValueError:
            pass
            
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
