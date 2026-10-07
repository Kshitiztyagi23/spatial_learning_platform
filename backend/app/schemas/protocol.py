from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from app.models.protocol import ALL_LEGO_PUZZLE_IDS, normalize_puzzle_ids, normalize_stages

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
    selected_puzzles: List[str] = Field(default_factory=lambda: list(ALL_LEGO_PUZZLE_IDS))
    time_limit_seconds: int = 600
    ai_hints_enabled: bool = True

    @field_validator("selected_puzzles")
    @classmethod
    def _normalize_ids(cls, v: List[str]) -> List[str]:
        return normalize_puzzle_ids(v)

class ProtocolUpdateIn(BaseModel):
    name: Optional[str] = "Standard Study Protocol"
    ai_feedback_percentage: int = Field(ge=0, le=100, default=50)
    enabled_stages: List[str]
    ptsot_config: PtsotConfig
    perspective_config: PerspectiveConfig
    lego_config: LegoConfig

    @field_validator("enabled_stages")
    @classmethod
    def _order_stages(cls, v: List[str]) -> List[str]:
        return normalize_stages(v)

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
