from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Dict, List, Literal, Optional
from datetime import datetime
from app.services.window_test import WINDOW_QUESTION_IDS
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

class WindowConfig(BaseModel):
    selected_questions: List[str] = Field(default_factory=lambda: list(WINDOW_QUESTION_IDS))
    time_limit_seconds: int = Field(ge=0, default=0)   # 0 = untimed
    shuffle: bool = False

    @field_validator("selected_questions")
    @classmethod
    def _known_ids(cls, v: List[str]) -> List[str]:
        known = set(WINDOW_QUESTION_IDS)
        return [q for q in WINDOW_QUESTION_IDS if q in set(v) & known]

class PerspectiveConfig(BaseModel):
    selected_scenarios: List[int] = Field(default_factory=lambda: list(range(1, 9)))
    # Ask only the first N questions of each scenario; 0 = all
    questions_per_scenario: int = Field(default=0, ge=0, le=20)
    # "Need a hint?" unlocks after this many wrong answers to a question
    hint_unlock_after: int = Field(default=1, ge=0, le=3)
    max_hints: int = Field(default=1, ge=0, le=5)

class RoundPlan(BaseModel):
    stages: List[str] = []
    feedback: List[str] = []

class RoundSchedule(BaseModel):
    # Session 1: every student, before groups exist
    session_1: RoundPlan = Field(default_factory=RoundPlan)
    # group -> one plan per session 2..N
    groups: Dict[str, List[RoundPlan]] = {}

class LegoConfig(BaseModel):
    selected_puzzles: List[str] = Field(default_factory=lambda: list(ALL_LEGO_PUZZLE_IDS))
    time_limit_seconds: int = 600
    ai_hints_enabled: bool = True
    # "Need a hint?" unlocks after this many failed checks of a puzzle
    hint_unlock_after: int = Field(default=2, ge=0, le=10)
    max_hints: int = Field(default=3, ge=0, le=10)

    @field_validator("selected_puzzles")
    @classmethod
    def _normalize_ids(cls, v: List[str]) -> List[str]:
        return normalize_puzzle_ids(v)

class ConditionSplit(BaseModel):
    experimental: int = Field(ge=0, le=100, default=34)
    control: int = Field(ge=0, le=100, default=33)
    natural_control: int = Field(ge=0, le=100, default=33)

    @model_validator(mode="after")
    def _sums_to_100(self):
        if self.experimental + self.control + self.natural_control != 100:
            raise ValueError("Group percentages must add up to 100")
        return self

class ProtocolUpdateIn(BaseModel):
    name: Optional[str] = "Standard Study Protocol"
    condition_split: ConditionSplit = Field(default_factory=ConditionSplit)
    total_rounds: int = Field(ge=2, le=12, default=3)
    # The session being run today; None = students continue at their own pace
    active_round: Optional[int] = Field(default=None, ge=1, le=12)
    run_label: Optional[str] = Field(default=None, max_length=120)
    # Demo mode: every session in one pass, students join this group after session 1
    demo_group: Optional[Literal["experimental", "control", "natural_control"]] = None
    # Omitted = recommended design
    round_schedule: Optional[RoundSchedule] = None
    # Derived from the schedule on save; accepted for older clients
    enabled_stages: List[str] = []
    ptsot_config: PtsotConfig
    window_config: WindowConfig = Field(default_factory=WindowConfig)
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
    condition_split: ConditionSplit
    total_rounds: int
    active_round: Optional[int] = None
    run_label: Optional[str] = None
    demo_group: Optional[str] = None
    round_schedule: RoundSchedule
    ai_status: Dict[str, Optional[object]] = {}
    enabled_stages: List[str]
    ptsot_config: PtsotConfig
    window_config: WindowConfig
    perspective_config: PerspectiveConfig
    lego_config: LegoConfig
    updated_at: datetime
