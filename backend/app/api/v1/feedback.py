import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.feedback_event import FeedbackEvent
from app.models.session import Session
from app.schemas.feedback import FeedbackAcknowledgeIn, FeedbackOut, FeedbackRequestIn
from app.services.feedback_rules import (
    COOLDOWN_SECONDS,
    RULE_VERSION,
    lego_feedback,
    perspective_feedback,
)
from app.services.ai_feedback import phrase_hint
from app.services.orchestration import session_feedback_stages
from app.services.task_instances import get_or_create_task_instance

router = APIRouter(prefix="/sessions/{session_id}/feedback", tags=["feedback"])

NOT_SHOWN = FeedbackOut(shown=False)


def hints_allowed(session: Session, task_type: str) -> bool:
    """Decided server-side from the session's schedule entry (set by
    researchers per group and round), never from the client."""
    return task_type in session_feedback_stages(session)


@router.post("", response_model=FeedbackOut)
@router.post("/", response_model=FeedbackOut, include_in_schema=False)
async def request_feedback(
    session_id: str,
    request: FeedbackRequestIn,
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not hints_allowed(session, request.task_type):
        return NOT_SHOWN

    diagnoses = [d.model_dump() for d in request.diagnoses]
    if request.task_type == "lego":
        feedback = lego_feedback(request.attempt, diagnoses)
    else:
        feedback = perspective_feedback(bool(request.correct))
    if not feedback:
        return NOT_SHOWN

    task_instance = await get_or_create_task_instance(session_id, request.task_type, db)

    last_shown = await db.scalar(
        select(FeedbackEvent.shown_at)
        .where(FeedbackEvent.task_instance_id == task_instance.id)
        .order_by(desc(FeedbackEvent.shown_at))
        .limit(1)
    )
    if last_shown and datetime.utcnow() - last_shown < timedelta(seconds=COOLDOWN_SECONDS):
        return NOT_SHOWN

    # The rung the rule engine picked, so the AI phrases the same diagnosis
    diagnosis = None
    if request.task_type == "lego" and diagnoses:
        diagnosis = diagnoses[min(request.attempt, len(diagnoses)) - 1]
    phrased = await phrase_hint(request.task_type, feedback, request.context, diagnosis)

    event = FeedbackEvent(
        session_id=session_id,
        task_instance_id=task_instance.id,
        feedback_type=feedback.feedback_type,
        message=phrased.message,
        trigger_reason=json.dumps({
            "rule": feedback.trigger_reason,
            "rule_message": feedback.message,
            "model": phrased.model,
            **request.context,
        }),
        rule_version=RULE_VERSION,
        generated_by=phrased.generated_by,
    )
    db.add(event)
    await db.commit()
    return FeedbackOut(
        shown=True,
        feedback_id=event.id,
        feedback_type=feedback.feedback_type,
        message=phrased.message,
    )


@router.post("/{feedback_id}/acknowledge")
async def acknowledge_feedback(
    session_id: str,
    feedback_id: str,
    payload: FeedbackAcknowledgeIn,
    db: AsyncSession = Depends(get_db)
):
    event = await db.get(FeedbackEvent, feedback_id)
    if not event or event.session_id != session_id:
        raise HTTPException(status_code=404, detail="Feedback event not found")
    event.accepted = payload.corrected
    await db.commit()
    return {"accepted": True}
