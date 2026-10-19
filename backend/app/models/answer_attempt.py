import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from app.core.database import Base


class AnswerAttempt(Base):
    """Every answer a student gives to a park question, including retries
    after "Not quite". The trial records keep the first answer only."""
    __tablename__ = "answer_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_instance_id: Mapped[str] = mapped_column(String, ForeignKey("task_instances.id"), nullable=False)
    item_id: Mapped[str] = mapped_column(String, nullable=False)
    answer: Mapped[str] = mapped_column(String, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
