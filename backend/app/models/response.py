import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from app.core.database import Base

class Response(Base):
    __tablename__ = "responses"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trial_id: Mapped[str] = mapped_column(String, ForeignKey("trials.id"), nullable=False)
    response_value: Mapped[str] = mapped_column(String, nullable=False)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reaction_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
