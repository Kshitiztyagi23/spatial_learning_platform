from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.session import Session
from app.models.participant import Participant
from app.models.audit_log import AuditLog
from app.schemas.session import SessionCreate, SessionOut, NextStageOut
from app.services.orchestration import (
    get_or_create_active_protocol,
    get_session_stage_sequence,
    protocol_schedule,
    protocol_total_rounds,
    session_feedback_stages,
)
from app.services.rounds import open_session, progress
from app.services.study_design import Schedule, has_more_rounds, order_stages, round_plan, round_type
import json
from app.models.protocol import ALL_LEGO_PUZZLE_IDS, normalize_puzzle_ids

router = APIRouter(prefix="/sessions", tags=["sessions"])


def session_out(session: Session, participant: Participant, total_rounds: int, schedule: Schedule) -> SessionOut:
    return SessionOut(
        id=session.id,
        participant_id=session.participant_id,
        condition=session.condition,
        current_stage=session.current_stage,
        status=session.status,
        started_at=session.started_at,
        round_number=session.round_number,
        total_rounds=total_rounds,
        round_type=round_type(session.round_number, total_rounds),
        participant_code=participant.participant_code,
        stages=get_session_stage_sequence(session),
        feedback_stages=order_stages(list(session_feedback_stages(session)))[:-1],
        more_rounds=has_more_rounds(participant.condition, session.round_number, schedule),
    )

@router.post("", response_model=SessionOut)
@router.post("/", response_model=SessionOut, include_in_schema=False)
async def create_session(
    session_in: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Participant).where(Participant.id == session_in.participant_id)
    result = await db.execute(stmt)
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
        
    protocol = await get_or_create_active_protocol(db)
    total_rounds = protocol_total_rounds(protocol)
    schedule = protocol_schedule(protocol)

    # Same student coming back mid-session (new device, closed tab): resume
    existing = await open_session(participant.id, db)
    if existing:
        return session_out(existing, participant, total_rounds, schedule)

    status, round_number = await progress(participant, schedule, db)
    if status == "waiting":
        raise HTTPException(status_code=409, detail="Your next session isn't ready yet. Ask your teacher.")
    if status == "complete":
        raise HTTPException(status_code=409, detail="You have finished every session of this study.")

    plan = round_plan(schedule, participant.condition, round_number)
    stages = plan["stages"]

    session = Session(
        participant_id=participant.id,
        condition=participant.condition,
        round_number=round_number,
        current_stage=stages[0],
        stage_sequence_json=json.dumps(stages),
        feedback_stages_json=json.dumps(plan["feedback"])
    )
    db.add(session)
    await db.flush()
    
    audit_log = AuditLog(
        actor_type="system",
        entity_type="session",
        entity_id=session.id,
        action="session_created",
        details_json=json.dumps({"round_number": round_number, "stages": stages, "feedback": plan["feedback"]})
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(session)
    return session_out(session, participant, total_rounds, schedule)

@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    participant = await db.get(Participant, session.participant_id)
    protocol = await get_or_create_active_protocol(db)
    return session_out(session, participant, protocol_total_rounds(protocol), protocol_schedule(protocol))

@router.get("/{session_id}/next-stage", response_model=NextStageOut)
async def get_next_stage_endpoint(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Completing a stage already advances current_stage on the server, so the
    # stage to go to next is simply the current one. (Returning the stage
    # *after* it made every page skip a stage.)
    return NextStageOut(stage_name=session.current_stage, config={})

@router.get("/{session_id}/task-config/{task_type}")
async def get_task_config_endpoint(
    session_id: str,
    task_type: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    protocol = await get_or_create_active_protocol(db)
    hint_stages = session_feedback_stages(session)

    if task_type == "ptsot":
        ptsot_cfg = json.loads(protocol.ptsot_config_json)
        return {
            "task_type": "ptsot",
            "condition": session.condition,
            "ai_hints_enabled": "ptsot" in hint_stages,
            "selected_questions": ptsot_cfg.get("selected_questions", list(range(1, 13))),
            "time_limit_seconds": ptsot_cfg.get("time_limit_seconds", 300),
            "shuffle": ptsot_cfg.get("shuffle", False)
        }
    elif task_type in ["spatial_perspective_taking", "perspective"]:
        persp_cfg = json.loads(protocol.perspective_config_json)
        return {
            "task_type": "spatial_perspective_taking",
            "condition": session.condition,
            "ai_hints_enabled": "spatial_perspective_taking" in hint_stages,
            "selected_scenarios": persp_cfg.get("selected_scenarios", list(range(1, 9)))
        }
    elif task_type == "lego":
        lego_cfg = json.loads(protocol.lego_config_json)
        return {
            "task_type": "lego",
            "condition": session.condition,
            "ai_hints_enabled": "lego" in hint_stages,
            "selected_puzzles": normalize_puzzle_ids(lego_cfg.get("selected_puzzles", ALL_LEGO_PUZZLE_IDS)),
            "time_limit_seconds": lego_cfg.get("time_limit_seconds", 600)
        }
    else:
        return {
            "task_type": task_type,
            "condition": session.condition,
            "ai_hints_enabled": task_type in hint_stages
        }
