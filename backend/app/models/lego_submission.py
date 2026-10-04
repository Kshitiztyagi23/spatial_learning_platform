import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from app.core.database import Base

class LegoSubmission(Base):
    __tablename__ = "lego_submissions"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_instance_id: Mapped[str] = mapped_column(String, ForeignKey("task_instances.id"), nullable=False)
    final_build_json: Mapped[str | None] = mapped_column(String, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    efficiency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
