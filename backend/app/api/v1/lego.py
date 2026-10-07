import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.task_instance import TaskInstance
from app.models.lego_event import LegoEvent
from app.models.lego_submission import LegoSubmission
from app.schemas.lego import LegoEventIn, LegoSubmitIn, LegoSubmitOut, LegoPuzzleResult

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
        puzzle_id=event_in.puzzle_id,
        block_id=event_in.block_id,
        block_type=event_in.block_type,
        position_json=event_in.position_json,
        rotation_json=event_in.rotation_json,
        is_correct=event_in.is_correct,
        details_json=event_in.details_json
    )
    db.add(lego_event)
    await db.commit()
    return {"accepted": True}

def score_lego_results(results: list[LegoPuzzleResult], puzzle_count: int) -> tuple[float | None, float | None]:
    """accuracy = puzzles solved / puzzles offered.
    efficiency = puzzles solved / Check presses (1.0 means every solve was
    right on the first check). None when there is nothing to score."""
    solved = sum(1 for r in results if r.solved)
    checks = sum(r.checks for r in results)
    accuracy = solved / puzzle_count if puzzle_count > 0 else None
    efficiency = solved / checks if checks > 0 else None
    return accuracy, efficiency

@router.post("/submit", response_model=LegoSubmitOut)
@router.post("submit", response_model=LegoSubmitOut, include_in_schema=False)
async def submit_lego_build(
    session_id: str,
    submit_in: LegoSubmitIn,
    db: AsyncSession = Depends(get_db)
):
    task_instance = await get_active_lego_task_instance(session_id, db)
    
    accuracy, efficiency = score_lego_results(submit_in.results, submit_in.puzzle_count)

    submission = LegoSubmission(
        task_instance_id=task_instance.id,
        final_build_json=submit_in.final_build_json,
        results_json=json.dumps([r.model_dump() for r in submit_in.results]),
        accuracy=accuracy,
        efficiency_score=efficiency,
        duration_seconds=submit_in.duration_seconds
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission
