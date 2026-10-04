from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.task_instance import TaskInstance
from app.models.lego_event import LegoEvent
from app.models.lego_submission import LegoSubmission
from app.schemas.lego import LegoEventIn, LegoSubmitIn, LegoSubmitOut

router = APIRouter(prefix="/sessions/{session_id}/lego", tags=["lego"])

async def get_active_lego_task_instance(session_id: str, db: AsyncSession) -> TaskInstance:
    stmt = select(TaskInstance).where(
        TaskInstance.session_id == session_id,
        TaskInstance.task_type == "lego",
        TaskInstance.status == "active"
    )
    result = await db.execute(stmt)
    task_instance = result.scalar_one_or_none()
    if not task_instance:
        task_instance = TaskInstance(
            session_id=session_id,
            task_type="lego",
            status="active"
        )
        db.add(task_instance)
        await db.flush()
    return task_instance

@router.post("/events")
@router.post("events", include_in_schema=False)
async def create_lego_event(
    session_id: str,
    event_in: LegoEventIn,
    db: AsyncSession = Depends(get_db)
):
    task_instance = await get_active_lego_task_instance(session_id, db)
    
    lego_event = LegoEvent(
        task_instance_id=task_instance.id,
        event_type=event_in.event_type,
        block_id=event_in.block_id,
        block_type=event_in.block_type,
        position_json=event_in.position_json,
        rotation_json=event_in.rotation_json
    )
    db.add(lego_event)
    await db.commit()
    return {"accepted": True}

@router.post("/submit", response_model=LegoSubmitOut)
@router.post("submit", response_model=LegoSubmitOut, include_in_schema=False)
async def submit_lego_build(
    session_id: str,
    submit_in: LegoSubmitIn,
    db: AsyncSession = Depends(get_db)
):
    task_instance = await get_active_lego_task_instance(session_id, db)
    
    submission = LegoSubmission(
        task_instance_id=task_instance.id,
        final_build_json=submit_in.final_build_json,
        duration_seconds=submit_in.duration_seconds
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission
