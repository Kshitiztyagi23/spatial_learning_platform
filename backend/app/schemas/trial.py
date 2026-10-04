from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TrialCreate(BaseModel):
    task_instance_id: str
    trial_number: int
    response_value: str
    correct_response: str | None = None
    reaction_time_ms: int | None = None

class TrialOut(BaseModel):
    id: str
    trial_number: int
    correct: bool | None = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
