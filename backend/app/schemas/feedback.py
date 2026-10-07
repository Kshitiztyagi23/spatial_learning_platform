from typing import Literal
from pydantic import BaseModel, Field


class LegoDiagnosisIn(BaseModel):
    code: str
    view: str | None = None
    # Horizontal area of the mismatch in that view: left / middle / right
    area: str | None = None


class FeedbackRequestIn(BaseModel):
    task_type: Literal["lego", "spatial_perspective_taking"]
    # LEGO: which failed Check this is on the current puzzle (1-based)
    attempt: int = Field(default=0, ge=0)
    diagnoses: list[LegoDiagnosisIn] = []
    # Perspective: whether the participant's answer was correct
    correct: bool | None = None
    # Free-form identifiers for analysis (puzzle id, question id, ...)
    context: dict = {}


class FeedbackOut(BaseModel):
    shown: bool
    feedback_id: str | None = None
    feedback_type: str | None = None
    message: str | None = None


class FeedbackAcknowledgeIn(BaseModel):
    # True when the participant fixed the error after seeing the hint
    corrected: bool
