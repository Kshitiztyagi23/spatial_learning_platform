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

class LegoPuzzleResult(BaseModel):
    puzzle_id: str
    solved: bool
    checks: int = Field(ge=0)
    placements: int = Field(ge=0)

class LegoSubmitIn(BaseModel):
    final_build_json: str
    duration_seconds: int = Field(ge=0)
    # Number of puzzles offered by the protocol; the denominator for accuracy
    puzzle_count: int = Field(ge=0, default=0)
    results: list[LegoPuzzleResult] = []

class LegoSubmitOut(BaseModel):
    id: str
    accuracy: float | None = None
    efficiency_score: float | None = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
