from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

from app.core.database import get_db
from app.models.session import Session
from app.models.stage import Stage
from app.models.audit_log import AuditLog
from app.schemas.stage import StageCompleteIn, StageOut
from app.services.orchestration import advance_session_stage

router = APIRouter(prefix="/sessions/{session_id}/stages", tags=["stages"])

@router.post("/{stage_name}/complete", response_model=StageOut)
async def complete_stage(
    session_id: str,
    stage_name: str,
    payload_in: StageCompleteIn,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if payload_in.stage_name != session.current_stage or stage_name != session.current_stage:
        raise HTTPException(status_code=400, detail="Stage name mismatch with current stage")
        
    stage = Stage(
        session_id=session.id,
        stage_name=stage_name,
        status="complete",
        completed_at=datetime.utcnow(),
        metadata_json=json.dumps(payload_in.payload) if payload_in.payload else None
    )
    db.add(stage)
    
    try:
        next_stage = advance_session_stage(session, stage_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if session.current_stage == "done":
        session.status = "completed"
        session.ended_at = datetime.utcnow()
        
    audit_log = AuditLog(
        actor_type="system",
        entity_type="stage",
        entity_id=stage.id,
        action="stage_completed",
        details_json=json.dumps({"stage_name": stage_name, "payload": payload_in.payload})
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(stage)
    return stage
