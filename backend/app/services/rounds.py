"""Database side of the round structure: where a participant is in the study."""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.participant import Participant
from app.models.session import Session
from app.services.study_design import Schedule, participant_progress


async def last_completed_round(participant_id: str, db: AsyncSession) -> int:
    value = await db.scalar(
        select(func.max(Session.round_number)).where(
            Session.participant_id == participant_id,
            Session.status == "completed",
        )
    )
    return value or 0


async def open_session(participant_id: str, db: AsyncSession) -> Session | None:
    """An unfinished session to resume instead of starting a new round."""
    return await db.scalar(
        select(Session)
        .where(Session.participant_id == participant_id, Session.status != "completed")
        .order_by(Session.started_at.desc())
        .limit(1)
    )


async def progress(participant: Participant, schedule: Schedule, db: AsyncSession) -> tuple[str, int | None]:
    """("ready", round) / ("waiting", None) / ("complete", None) - see study_design."""
    return participant_progress(participant.condition, await last_completed_round(participant.id, db), schedule)
