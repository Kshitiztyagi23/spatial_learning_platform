import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey
from app.core.database import Base

class AdaptationDecision(Base):
    __tablename__ = "adaptation_decisions"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), nullable=False)
    source_metrics_json: Mapped[str | None] = mapped_column(String, nullable=True)
    previous_difficulty: Mapped[str | None] = mapped_column(String, nullable=True)
    next_difficulty: Mapped[str | None] = mapped_column(String, nullable=True)
    rule_version: Mapped[str] = mapped_column(String, default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
