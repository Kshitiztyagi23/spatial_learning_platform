import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, ForeignKey
from app.core.database import Base

class Session(Base):
    __tablename__ = "sessions"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id: Mapped[str] = mapped_column(String, ForeignKey("participants.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="active")
    current_stage: Mapped[str] = mapped_column(String, default="intake_consent")
    condition: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    stage_sequence_json: Mapped[str | None] = mapped_column(String, nullable=True)
    # Stages that give hints in this session, fixed when the session starts
    feedback_stages_json: Mapped[str | None] = mapped_column(String, nullable=True)
    # The admin's label for the sitting this session was part of
    run_label: Mapped[str | None] = mapped_column(String, nullable=True)
