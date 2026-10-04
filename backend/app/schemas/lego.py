from pydantic import BaseModel, ConfigDict
from datetime import datetime

class LegoEventIn(BaseModel):
    event_type: str
    block_id: str | None = None
    block_type: str | None = None
    position_json: str | None = None
    rotation_json: str | None = None

class LegoSubmitIn(BaseModel):
    final_build_json: str
    duration_seconds: int

class LegoSubmitOut(BaseModel):
    id: str
    accuracy: float | None = None
    efficiency_score: float | None = None
    submitted_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
