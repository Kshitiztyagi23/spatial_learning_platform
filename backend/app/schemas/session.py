from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SessionCreate(BaseModel):
    participant_id: str

class SessionOut(BaseModel):
    id: str
    participant_id: str
    condition: str
    current_stage: str
    status: str
    started_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class NextStageOut(BaseModel):
    stage_name: str
    config: dict = {}
