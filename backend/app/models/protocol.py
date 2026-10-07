import json
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, Text
from app.core.database import Base

DEFAULT_STAGES = [
    "intake_consent",
    "demographics",
    "spatial_experience",
    "ptsot",
    "spatial_perspective_taking",
    "lego",
    "done"
]

DEFAULT_PTSOT_CONFIG = {
    "selected_questions": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "time_limit_seconds": 300,
    "shuffle": False
}

DEFAULT_PERSPECTIVE_CONFIG = {
    "selected_scenarios": [1, 2, 3, 4, 5, 6, 7, 8]
}

DEFAULT_LEGO_CONFIG = {
    "selected_puzzles": [
        "tut-01", "tut-02", "tut-03", "tut-04", "tut-05", "tut-06"
    ],
    "time_limit_seconds": 600,
    "ai_hints_enabled": True
}

class StudyProtocol(Base):
    __tablename__ = "study_protocols"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="active")
    name: Mapped[str] = mapped_column(String, default="Standard Study Protocol")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Target percentage of participants receiving AI feedback (0 to 100)
    ai_feedback_percentage: Mapped[int] = mapped_column(Integer, default=50)

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
