from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.session import Session
from app.schemas.stage import StageCompleteIn, StageOut
from app.services.session_flow import record_stage

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
        
    if payload_in.stage_name != stage_name:
        raise HTTPException(status_code=400, detail="Stage name mismatch with current stage")
    stage = record_stage(session, stage_name, payload_in.payload, db)
    await db.commit()
    return stage
