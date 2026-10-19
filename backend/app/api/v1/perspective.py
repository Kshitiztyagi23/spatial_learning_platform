from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.answer_attempt import AnswerAttempt
from app.models.session import Session
from app.services.hint_policy import hint_status, hints_used, park_wrong_answers, task_policy
from app.services.orchestration import get_or_create_active_protocol, session_feedback_stages
from app.services.park_scenarios import get_question
from app.services.task_instances import get_or_create_task_instance

router = APIRouter(prefix="/sessions/{session_id}/perspective", tags=["perspective"])

TASK = "spatial_perspective_taking"


class AnswerIn(BaseModel):
    stimulus_id: str = Field(max_length=40)
    answer: Literal["Right", "Left", "Front", "Behind"]


@router.post("/answer")
async def record_answer(session_id: str, payload: AnswerIn, db: AsyncSession = Depends(get_db)):
    """One answer to a park question (first try or a retry). The server
    checks it, stores it and returns the "Need a hint?" button state."""
    found = get_question(payload.stimulus_id)
    if not found:
        raise HTTPException(status_code=404, detail="Unknown question")
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _, question = found
    correct = payload.answer == question["correctAnswer"]

    task_instance = await get_or_create_task_instance(session_id, TASK, db)
    previous = await db.scalar(
        select(func.count()).select_from(AnswerAttempt)
        .where(AnswerAttempt.task_instance_id == task_instance.id, AnswerAttempt.item_id == payload.stimulus_id)
    ) or 0
    db.add(AnswerAttempt(
        task_instance_id=task_instance.id, item_id=payload.stimulus_id,
        answer=payload.answer, is_correct=correct, attempt_number=previous + 1,
    ))
    await db.commit()

    enabled = TASK in session_feedback_stages(session)
    tries = len(await park_wrong_answers(task_instance.id, payload.stimulus_id, db))
    used = await hints_used(task_instance.id, payload.stimulus_id, db)
    policy = task_policy(await get_or_create_active_protocol(db), TASK)
    return {"correct": correct, "attempt_number": previous + 1, "hint": hint_status(enabled, tries, used, policy)}
