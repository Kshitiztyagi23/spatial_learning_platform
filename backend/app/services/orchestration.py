import random
from app.models.session import Session

STAGE_SEQUENCE = [
  "intake_consent",
  "demographics", 
  "spatial_experience",
  "ptsot",
  "spatial_perspective_taking",
  "lego",
  "done"
]

def get_next_stage(current_stage: str) -> str | None:
    try:
        idx = STAGE_SEQUENCE.index(current_stage)
        if idx + 1 < len(STAGE_SEQUENCE):
            return STAGE_SEQUENCE[idx + 1]
    except ValueError:
        pass
    return None

def advance_session_stage(session: Session, completed_stage: str) -> str:
    if session.current_stage != completed_stage:
        raise ValueError(f"Stage mismatch. Current is {session.current_stage}, got {completed_stage}")
    
    if completed_stage == "done":
        return "done"

    next_stage = get_next_stage(completed_stage)
    if not next_stage:
        raise ValueError("No next stage available")
        
    session.current_stage = next_stage
    return next_stage

def assign_condition() -> str:
    return random.choice(["experimental", "control"])
