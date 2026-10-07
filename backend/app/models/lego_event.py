import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from app.core.database import Base

class LegoEvent(Base):
    __tablename__ = "lego_events"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_instance_id: Mapped[str] = mapped_column(String, ForeignKey("task_instances.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    puzzle_id: Mapped[str | None] = mapped_column(String, nullable=True)
    block_id: Mapped[str | None] = mapped_column(String, nullable=True)
    block_type: Mapped[str | None] = mapped_column(String, nullable=True)
    position_json: Mapped[str | None] = mapped_column(String, nullable=True)
    rotation_json: Mapped[str | None] = mapped_column(String, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    details_json: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
