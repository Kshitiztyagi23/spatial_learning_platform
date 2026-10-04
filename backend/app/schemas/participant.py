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
    condition: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
