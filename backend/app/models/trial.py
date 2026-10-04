import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, ForeignKey
from app.core.database import Base

class Trial(Base):
    __tablename__ = "trials"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_instance_id: Mapped[str] = mapped_column(String, ForeignKey("task_instances.id"), nullable=False)
    trial_number: Mapped[int] = mapped_column(Integer, nullable=False)
    stimulus_id: Mapped[str | None] = mapped_column(String, nullable=True)
    correct_response: Mapped[str | None] = mapped_column(String, nullable=True)
    difficulty: Mapped[str] = mapped_column(String, default="medium")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
