from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.session import Session
from app.models.participant import Participant
from app.models.audit_log import AuditLog
from app.schemas.session import SessionCreate, SessionOut, NextStageOut
from app.services.orchestration import get_next_stage

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
        
    session = Session(
        participant_id=participant.id,
        condition=participant.condition,
        current_stage="intake_consent"
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
        
    next_stage = get_next_stage(session.current_stage)
    if not next_stage:
        raise HTTPException(status_code=400, detail="No next stage available")
        
    return NextStageOut(stage_name=next_stage, config={})
