import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from app.core.database import Base

class FeedbackEvent(Base):
    __tablename__ = "feedback_events"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    task_instance_id: Mapped[str | None] = mapped_column(String, ForeignKey("task_instances.id"), nullable=True)
    feedback_type: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    trigger_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    shown_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rule_version: Mapped[str] = mapped_column(String, default="v1")
    # "ai" when the model phrased the hint, "rule" for the fixed fallback text
    generated_by: Mapped[str | None] = mapped_column(String, nullable=True)
