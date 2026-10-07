"""Starting sessions and completing stages, shared by the individual
endpoints and the one-request intake. Nothing here commits: the caller
commits once, so a whole step costs one database transaction."""
import json
import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.participant import Participant
from app.models.protocol import StudyProtocol
from app.models.session import Session
from app.models.stage import Stage
from app.services.orchestration import advance_session_stage, protocol_schedule
from app.services.rounds import open_session, progress
from app.services.study_design import round_plan


async def start_round(participant: Participant, protocol: StudyProtocol, db: AsyncSession, new_participant: bool = False) -> Session:
    """The participant's unfinished session, or a new one for their next round.
    A participant created in this same request has no sessions yet, so the two
    lookups are skipped (each is a ~0.3 s round trip)."""
    schedule = protocol_schedule(protocol)
    if new_participant:
        status, round_number = "ready", 1
    else:
        existing = await open_session(participant.id, db)
        if existing:
            return existing
        status, round_number = await progress(participant, schedule, db)
    if status == "waiting":
        raise HTTPException(status_code=409, detail="Your next session isn't ready yet. Ask your teacher.")
    if status == "complete":
        raise HTTPException(status_code=409, detail="You have finished every session of this study.")

    plan = round_plan(schedule, participant.condition, round_number)
    session = Session(
        id=str(uuid.uuid4()),  # set now: no mid-request flush needed for the audit entry
        participant_id=participant.id,
        condition=participant.condition,
        round_number=round_number,
        current_stage=plan["stages"][0],
        stage_sequence_json=json.dumps(plan["stages"]),
        feedback_stages_json=json.dumps(plan["feedback"]),
        started_at=datetime.utcnow(),
        status="active",
    )
    db.add(session)
    db.add(AuditLog(
        actor_type="system",
        entity_type="session",
        entity_id=session.id,
        action="session_created",
        details_json=json.dumps({"round_number": round_number, "stages": plan["stages"], "feedback": plan["feedback"]}),
    ))
    return session


def record_stage(session: Session, stage_name: str, payload: dict | None, db: AsyncSession) -> Stage:
    """Mark the session's current stage complete and move to the next one."""
    if stage_name != session.current_stage:
        raise HTTPException(status_code=400, detail="Stage name mismatch with current stage")
    stage = Stage(
        id=str(uuid.uuid4()),  # set now so the audit entry can reference it
        session_id=session.id,
        stage_name=stage_name,
        status="complete",
        completed_at=datetime.utcnow(),
        metadata_json=json.dumps(payload) if payload else None,
    )
    db.add(stage)
    advance_session_stage(session, stage_name)
    if session.current_stage == "done":
        session.status = "completed"
        session.ended_at = datetime.utcnow()
    db.add(AuditLog(
        actor_type="system",
        entity_type="stage",
        entity_id=stage.id,
        action="stage_completed",
        details_json=json.dumps({"stage_name": stage_name, "payload": payload}),
    ))
    return stage
