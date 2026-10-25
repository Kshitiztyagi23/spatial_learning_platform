from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Text
from app.core.database import Base


class SessionReport(Base):
    """End-of-session performance report for researchers: facts computed by
    the server, plus the AI's reading of them (when AI is configured)."""
    __tablename__ = "session_reports"

    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String, nullable=False)   # ready | facts_only | failed
    facts_json: Mapped[str] = mapped_column(Text, nullable=False)
    report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
