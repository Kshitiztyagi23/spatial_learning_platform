from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.session import Session
from app.models.participant import Participant
from app.models.audit_log import AuditLog
from app.schemas.session import SessionCreate, SessionOut, NextStageOut
from app.services.orchestration import (
    get_next_stage,
    get_or_create_active_protocol,
    get_session_stage_sequence
)
import json

router = APIRouter(prefix="/sessions", tags=["sessions"])

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
    stages = json.loads(protocol.enabled_stages_json)
    first_stage = stages[0] if stages else "intake_consent"

    session = Session(
        participant_id=participant.id,
        condition=participant.condition,
        current_stage=first_stage,
        stage_sequence_json=protocol.enabled_stages_json
    )
    db.add(session)
    await db.flush()
    
    audit_log = AuditLog(
        actor_type="system",
        entity_type="session",
        entity_id=session.id,
        action="session_created"
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(session)
    return session

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
        
    return session

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
        
    seq = get_session_stage_sequence(session)
    next_stage = get_next_stage(session.current_stage, seq)
    if not next_stage:
        next_stage = "done"
        
    return NextStageOut(stage_name=next_stage, config={})

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
    is_experimental = session.condition == "experimental"

    if task_type == "ptsot":
        ptsot_cfg = json.loads(protocol.ptsot_config_json)
        return {
            "task_type": "ptsot",
            "condition": session.condition,
            "ai_hints_enabled": is_experimental,
            "selected_questions": ptsot_cfg.get("selected_questions", list(range(1, 13))),
            "time_limit_seconds": ptsot_cfg.get("time_limit_seconds", 300),
            "shuffle": ptsot_cfg.get("shuffle", False)
        }
    elif task_type in ["spatial_perspective_taking", "perspective"]:
        persp_cfg = json.loads(protocol.perspective_config_json)
        return {
            "task_type": "spatial_perspective_taking",
            "condition": session.condition,
            "ai_hints_enabled": is_experimental,
            "selected_scenarios": persp_cfg.get("selected_scenarios", list(range(1, 9)))
        }
    elif task_type == "lego":
        lego_cfg = json.loads(protocol.lego_config_json)
        return {
            "task_type": "lego",
            "condition": session.condition,
            "ai_hints_enabled": is_experimental and lego_cfg.get("ai_hints_enabled", True),
            "selected_puzzles": lego_cfg.get("selected_puzzles", ["tut-01", "tut-02", "tut-03", "tut-04", "tut-05", "tut-06"]),
            "time_limit_seconds": lego_cfg.get("time_limit_seconds", 600)
        }
    else:
        return {
            "task_type": task_type,
            "condition": session.condition,
            "ai_hints_enabled": is_experimental
        }
