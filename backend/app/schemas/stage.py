from pydantic import BaseModel, ConfigDict
from datetime import datetime

class StageCompleteIn(BaseModel):
    stage_name: str
    payload: dict = {}

class StageOut(BaseModel):
    id: str
    session_id: str
    stage_name: str
    status: str
    completed_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)
