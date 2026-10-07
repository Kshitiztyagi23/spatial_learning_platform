import json
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.session import Session
from app.models.protocol import (
    StudyProtocol,
    DEFAULT_STAGES,
    DEFAULT_PTSOT_CONFIG,
    DEFAULT_PERSPECTIVE_CONFIG,
    DEFAULT_LEGO_CONFIG,
    normalize_stages
)

STAGE_SEQUENCE = DEFAULT_STAGES

async def get_or_create_active_protocol(db: AsyncSession) -> StudyProtocol:
    result = await db.execute(select(StudyProtocol).where(StudyProtocol.id == "active"))
    protocol = result.scalar_one_or_none()
    if not protocol:
        protocol = StudyProtocol(
            id="active",
            name="Standard Study Protocol",
            active=True,
            ai_feedback_percentage=50,
            enabled_stages_json=json.dumps(DEFAULT_STAGES),
            ptsot_config_json=json.dumps(DEFAULT_PTSOT_CONFIG),
            perspective_config_json=json.dumps(DEFAULT_PERSPECTIVE_CONFIG),
            lego_config_json=json.dumps(DEFAULT_LEGO_CONFIG)
        )
        db.add(protocol)
        await db.commit()
        await db.refresh(protocol)
    return protocol

def get_session_stage_sequence(session: Session) -> list[str]:
    if session.stage_sequence_json:
        try:
            seq = json.loads(session.stage_sequence_json)
            if isinstance(seq, list) and len(seq) > 0:
                return normalize_stages(seq)
        except Exception:
            pass
    return STAGE_SEQUENCE

def get_next_stage(current_stage: str, stage_sequence: list[str] | None = None) -> str | None:
    seq = stage_sequence if stage_sequence is not None else STAGE_SEQUENCE
    try:
        idx = seq.index(current_stage)
        if idx + 1 < len(seq):
            return seq[idx + 1]
    except ValueError:
        pass
    return None

def advance_session_stage(session: Session, completed_stage: str) -> str:
    if session.current_stage != completed_stage:
        raise ValueError(f"Stage mismatch. Current is {session.current_stage}, got {completed_stage}")
    
    if completed_stage == "done":
        return "done"

    seq = get_session_stage_sequence(session)
    next_stage = get_next_stage(completed_stage, seq)
    if not next_stage:
        # If no more stages in sequence, conclude session with "done"
        next_stage = "done"
        
    session.current_stage = next_stage
    return next_stage

def assign_condition(ai_feedback_percentage: int = 50) -> str:
    # Ensure percentage is clamped between 0 and 100
    pct = max(0, min(100, ai_feedback_percentage))
    if random.uniform(0, 100) < pct:
        return "experimental"
    return "control"

