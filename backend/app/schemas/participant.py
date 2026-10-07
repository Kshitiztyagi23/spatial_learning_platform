from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class ParticipantCreate(BaseModel):
    name: str
    age: int = Field(ge=8, le=18)
    gender: str
    grade: str
    section: str
    roll_no: str
    consent: bool

class ParticipantOut(BaseModel):
    id: str
    external_id: str
    participant_code: str | None = None
    condition: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ParticipantLookupIn(BaseModel):
    code: str = Field(min_length=1, max_length=20)

class ParticipantLookupOut(BaseModel):
    participant_id: str
    first_name: str
    # ready: a session is waiting; waiting: finished session 1, no group yet;
    # complete: finished every session
    status: str
    next_round: int | None
    total_rounds: int
    study_complete: bool
