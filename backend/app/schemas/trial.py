from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

TrialTaskType = Literal["ptsot", "spatial_perspective_taking"]

class TrialCreate(BaseModel):
    task_type: TrialTaskType = "ptsot"
    trial_number: int
    stimulus_id: str | None = None
    response_value: str
    correct_response: str | None = None
    reaction_time_ms: int | None = Field(default=None, ge=0)
    # Accepted for older clients; the server resolves the task instance itself
    task_instance_id: str | None = None

class TrialOut(BaseModel):
    id: str
    trial_number: int
    correct: bool | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
