from typing import Literal
from pydantic import BaseModel, Field


class FeedbackRequestIn(BaseModel):
    """The student pressed "Need a hint?"."""
    task_type: Literal["lego", "spatial_perspective_taking"]
    # LEGO puzzle id or park stimulus id: the hint limit is per item
    item_id: str = Field(min_length=1, max_length=80)
    # Park only: wrong answers so far on this question (LEGO tries are
    # counted by the server from its own checks)
    attempt: int = Field(default=0, ge=0, le=20)
    # Free-form identifiers for analysis (question text, answer, ...)
    context: dict = {}


class FeedbackOut(BaseModel):
    shown: bool
    feedback_id: str | None = None
    feedback_type: str | None = None
    message: str | None = None
    # Why no hint: not_allowed | locked | limit | cooldown | nothing_to_fix
    reason: str | None = None
    # Button state after this request
    enabled: bool = False
    unlocked: bool = False
    failed_tries: int = 0
    unlock_after: int = 0
    hints_used: int = 0
    hints_left: int = 0


class FeedbackAcknowledgeIn(BaseModel):
    # True when the participant fixed the error after seeing the hint
    corrected: bool
