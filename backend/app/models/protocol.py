import json
import re
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, Text
from app.core.database import Base

DEFAULT_STAGES = [
    "intake_consent",
    "demographics",
    "spatial_experience",
    "ptsot",
    "window_test",
    "spatial_perspective_taking",
    "lego",
    "done"
]

# Study groups and their default share of new participants (percent)
DEFAULT_CONDITION_SPLIT = {"experimental": 34, "control": 33, "natural_control": 33}
DEFAULT_TOTAL_ROUNDS = 3

# The participant and session records are created on the demographics page,
# so a protocol without it would never save any data.
REQUIRED_STAGES = {"demographics", "done"}

def normalize_stages(stages: list[str]) -> list[str]:
    """Order enabled stages canonically, force required stages in and keep
    "done" last, dropping unknown names, so a protocol can never end a session
    early or skip session creation."""
    enabled = set(stages) | REQUIRED_STAGES
    return [s for s in DEFAULT_STAGES if s in enabled and s != "done"] + ["done"]

DEFAULT_PTSOT_CONFIG = {
    "selected_questions": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "time_limit_seconds": 300,
    "shuffle": False
}

DEFAULT_PERSPECTIVE_CONFIG = {
    "selected_scenarios": [1, 2, 3, 4, 5, 6, 7, 8]
}

# Ids as declared in frontend/src/tasks/lego/data/puzzles/*.json
ALL_LEGO_PUZZLE_IDS = [
    "tut-01", "tut-02", "tut-03", "tut-04", "tut-05", "tut-06",
    "easy-01", "easy-02", "easy-03", "easy-04",
    "medium-01", "medium-02", "medium-03", "medium-04",
    "hard-01", "hard-02", "hard-03", "hard-04",
    "b-01", "c-01", "d-01",
]

def normalize_puzzle_ids(ids: list[str]) -> list[str]:
    """Strip the file-order prefix ("07-easy-01" -> "easy-01") that older
    admin catalogs saved, so stored protocols match the puzzle JSON ids."""
    return [re.sub(r"^\d+-", "", i) for i in ids]

DEFAULT_LEGO_CONFIG = {
    "selected_puzzles": list(ALL_LEGO_PUZZLE_IDS),
    "time_limit_seconds": 600,
    "ai_hints_enabled": True
}

class StudyProtocol(Base):
    __tablename__ = "study_protocols"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="active")
    name: Mapped[str] = mapped_column(String, default="Standard Study Protocol")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Legacy two-group split; kept in sync with condition_split["experimental"]
    ai_feedback_percentage: Mapped[int] = mapped_column(Integer, default=50)

    # JSON {"experimental": %, "control": %, "natural_control": %}, sums to 100
    condition_split_json: Mapped[str] = mapped_column(
        Text,
        default=lambda: json.dumps(DEFAULT_CONDITION_SPLIT)
    )

    # Visits per participant: round 1 = pre-test, last round = post-test
    total_rounds: Mapped[int] = mapped_column(Integer, default=DEFAULT_TOTAL_ROUNDS)

    # JSON {group: [{"stages": [...], "feedback": [...]}, ...one per round]}.
    # Null means the recommended design (services/study_design.default_schedule)
    round_schedule_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON-encoded array of active stage names for this protocol
    enabled_stages_json: Mapped[str] = mapped_column(
        Text, 
        default=lambda: json.dumps(DEFAULT_STAGES)
    )

    # JSON-encoded config for PTSOT task
    ptsot_config_json: Mapped[str] = mapped_column(
        Text, 
        default=lambda: json.dumps(DEFAULT_PTSOT_CONFIG)
    )

    # JSON-encoded config for the window (mental rotation) test; null = defaults
    window_config_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON-encoded config for Spatial Perspective Taking task
    perspective_config_json: Mapped[str] = mapped_column(
        Text, 
        default=lambda: json.dumps(DEFAULT_PERSPECTIVE_CONFIG)
    )

    # JSON-encoded config for LEGO task
    lego_config_json: Mapped[str] = mapped_column(
        Text, 
        default=lambda: json.dumps(DEFAULT_LEGO_CONFIG)
    )

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
