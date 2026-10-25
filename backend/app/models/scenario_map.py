from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Text
from app.core.database import Base


class ScenarioMap(Base):
    """A park scene's layout written by the AI from the photos once, then
    checked and approved by a researcher. Only approved maps reach the tutor."""
    __tablename__ = "scenario_maps"

    scenario_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    map_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")   # draft | approved
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
