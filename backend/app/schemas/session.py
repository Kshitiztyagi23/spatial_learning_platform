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
    round_number: int = 1
    total_rounds: int | None = None
    round_type: str | None = None     # pre / training / post
    participant_code: str | None = None
    stages: list[str] = []            # this session's own stage plan
    feedback_stages: list[str] = []   # stages that give hints this session
    more_rounds: bool = False         # another session follows this one
    
    model_config = ConfigDict(from_attributes=True)

class NextStageOut(BaseModel):
    stage_name: str
    config: dict = {}
