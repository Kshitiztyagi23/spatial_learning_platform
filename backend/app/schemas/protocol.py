from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PasscodeVerifyIn(BaseModel):
    passcode: str

class PasscodeVerifyOut(BaseModel):
    valid: bool
    token: Optional[str] = None
    message: Optional[str] = None

class PtsotConfig(BaseModel):
    selected_questions: List[int] = Field(default_factory=lambda: list(range(1, 13)))
    time_limit_seconds: int = 300
    shuffle: bool = False

class PerspectiveConfig(BaseModel):
    selected_scenarios: List[int] = Field(default_factory=lambda: list(range(1, 9)))

class LegoConfig(BaseModel):
    selected_puzzles: List[str] = Field(default_factory=lambda: ["tut-01", "tut-02", "tut-03", "tut-04", "tut-05", "tut-06"])
    time_limit_seconds: int = 600
    ai_hints_enabled: bool = True

class ProtocolUpdateIn(BaseModel):
    name: Optional[str] = "Standard Study Protocol"
    ai_feedback_percentage: int = Field(ge=0, le=100, default=50)
    enabled_stages: List[str]
    ptsot_config: PtsotConfig
    perspective_config: PerspectiveConfig
    lego_config: LegoConfig

class ProtocolOut(BaseModel):
    id: str
    name: str
    active: bool
    ai_feedback_percentage: int
    enabled_stages: List[str]
    ptsot_config: PtsotConfig
    perspective_config: PerspectiveConfig
    lego_config: LegoConfig
    updated_at: datetime
