from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

class LegoEventIn(BaseModel):
    event_type: str
    puzzle_id: str | None = None
    block_id: str | None = None
    block_type: str | None = None
    position_json: str | None = None
    rotation_json: str | None = None
    is_correct: bool | None = None
    details_json: str | None = None

class LegoOrigin(BaseModel):
    x: int
    y: int
    z: int

class LegoBrick(BaseModel):
    typeId: str = Field(pattern=r"^\d+x\d+-(red|blue|yellow|green|white)$")
    rotation: Literal[0, 90, 180, 270]
    origin: LegoOrigin

class LegoCheckIn(BaseModel):
    puzzle_id: str
    placed: list[LegoBrick] = Field(default_factory=list, max_length=200)

class LegoPuzzleResult(BaseModel):
    puzzle_id: str
    solved: bool
    checks: int = Field(ge=0)
    placements: int = Field(ge=0)

class LegoSubmitIn(BaseModel):
    final_build_json: str
    duration_seconds: int = Field(ge=0)
    # Accepted from older clients but ignored: the server scores from its own records
    puzzle_count: int = Field(ge=0, default=0)
    results: list[LegoPuzzleResult] = []

class LegoSubmitOut(BaseModel):
    id: str
    accuracy: float | None = None
    efficiency_score: float | None = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
