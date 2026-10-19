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
from app.services.ai_feedback import PROMPT_VERSION, phrase_hint
from app.services.tutor_context import session_history
from app.services.lego_engine import get_puzzle
from app.services.hint_policy import failed_tries, hint_status, hints_used, lego_checks, task_policy
from app.services.orchestration import get_or_create_active_protocol, session_feedback_stages
from app.services.task_instances import get_or_create_task_instance

router = APIRouter(prefix="/sessions/{session_id}/feedback", tags=["feedback"])


def hints_allowed(session: Session, task_type: str) -> bool:
    """Decided server-side from the session's schedule entry (set by
    researchers per group and round), never from the client."""
    return task_type in session_feedback_stages(session)


def _area(region: dict | None, view: str | None, board: dict) -> str | None:
    """Which horizontal third of the view card a mismatch sits in, or None
    when it spans most of the card."""
    if not region or not view:
        return None
    cols = board["width"] if view in ("front", "top") else board["depth"]
    if cols <= 1 or region["colTo"] - region["colFrom"] + 1 > cols * 2 / 3:
        return None
    centre = (region["colFrom"] + region["colTo"]) / 2 / (cols - 1)
    return "left" if centre < 1 / 3 else "right" if centre > 2 / 3 else "middle"


@router.post("", response_model=FeedbackOut)
@router.post("/", response_model=FeedbackOut, include_in_schema=False)
async def request_feedback(
    session_id: str,
    request: FeedbackRequestIn,
    db: AsyncSession = Depends(get_db)
):
    """The student pressed "Need a hint?". Every rule is checked here."""
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not hints_allowed(session, request.task_type):
        return FeedbackOut(shown=False, reason="not_allowed")

    protocol = await get_or_create_active_protocol(db)
    policy = task_policy(protocol, request.task_type)
    task_instance = await get_or_create_task_instance(session_id, request.task_type, db)
    used = await hints_used(task_instance.id, request.item_id, db)

    if request.task_type == "lego":
        checks = await lego_checks(task_instance.id, request.item_id, db)
        tries = failed_tries(checks)
    else:
        checks, tries = [], request.attempt
    status = hint_status(True, tries, used, policy)
    if not status["unlocked"]:
        reason = "limit" if status["hints_left"] == 0 else "locked"
        return FeedbackOut(shown=False, reason=reason, **status)

    last_shown = await db.scalar(
        select(FeedbackEvent.shown_at)
        .where(FeedbackEvent.task_instance_id == task_instance.id)
        .order_by(desc(FeedbackEvent.shown_at))
        .limit(1)
    )
    if last_shown and datetime.utcnow() - last_shown < timedelta(seconds=COOLDOWN_SECONDS):
        return FeedbackOut(shown=False, reason="cooldown", **status)

    diagnosis = None
    if request.task_type == "lego":
        # What's wrong comes from the server's latest check of this puzzle
        latest = checks[-1] if checks else {}
        if latest.get("outcome") in (None, "solved", "empty"):
            return FeedbackOut(shown=False, reason="nothing_to_fix", **status)
        board = get_puzzle(request.item_id)["board"]
        diagnoses = [{**d, "area": _area(d.get("region"), d.get("view"), board)} for d in latest.get("diagnoses", [])]
        rung = used + 1  # each hint on a puzzle is one step more specific
        feedback = lego_feedback(rung, diagnoses)
        if feedback:
            diagnosis = diagnoses[min(rung, len(diagnoses)) - 1]
    else:
        feedback = perspective_feedback(False)
    if not feedback:
        return FeedbackOut(shown=False, reason="nothing_to_fix", **status)

    history = await session_history(session_id, db)
    phrased = await phrase_hint(request.task_type, feedback, request.context, diagnosis, history)

    event = FeedbackEvent(
        session_id=session_id,
        task_instance_id=task_instance.id,
        item_id=request.item_id,
        requested=True,
        feedback_type=feedback.feedback_type,
        message=phrased.message,
        trigger_reason=json.dumps({
            "rule": feedback.trigger_reason,
            "rule_message": feedback.message,
            "model": phrased.model,
            "prompt_version": PROMPT_VERSION,
            "failed_tries": tries,
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
        **hint_status(True, tries, used + 1, policy),
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
