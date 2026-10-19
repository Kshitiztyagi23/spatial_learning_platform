"""When a student may ask for a hint ("Need a hint?" button).

Per task, researchers set in the admin console how many failed tries unlock
the button and how many hints one puzzle/question can get. The server
enforces both; the browser only mirrors them to grey the button out.

  LEGO: failed tries = the server's own non-empty, unsolved checks of the
        puzzle (POST /lego/check), so they can't be inflated by the browser.
  Park: failed tries = the server's record of wrong answers to the
        question (POST /perspective/answer checks each one).
"""
import json

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.answer_attempt import AnswerAttempt
from app.models.feedback_event import FeedbackEvent
from app.models.lego_event import LegoEvent
from app.models.protocol import StudyProtocol

DEFAULT_POLICY = {
    "lego": {"hint_unlock_after": 2, "max_hints": 3},
    "spatial_perspective_taking": {"hint_unlock_after": 1, "max_hints": 1},
}
_CONFIG_COLUMN = {"lego": "lego_config_json", "spatial_perspective_taking": "perspective_config_json"}


def task_policy(protocol: StudyProtocol, task_type: str) -> dict:
    config = json.loads(getattr(protocol, _CONFIG_COLUMN[task_type]) or "{}")
    defaults = DEFAULT_POLICY[task_type]
    return {key: int(config.get(key, value)) for key, value in defaults.items()}


async def lego_checks(task_instance_id: str, puzzle_id: str, db: AsyncSession) -> list[dict]:
    """The server's check results for one puzzle, oldest first."""
    rows = (await db.execute(
        select(LegoEvent.details_json)
        .where(LegoEvent.task_instance_id == task_instance_id,
               LegoEvent.puzzle_id == puzzle_id,
               LegoEvent.event_type == "check")
        .order_by(LegoEvent.created_at)
    )).scalars().all()
    return [json.loads(r or "{}") for r in rows]


async def park_wrong_answers(task_instance_id: str, item_id: str, db: AsyncSession) -> list[str]:
    """Wrong answers to one park question, oldest first."""
    return list((await db.execute(
        select(AnswerAttempt.answer)
        .where(AnswerAttempt.task_instance_id == task_instance_id,
               AnswerAttempt.item_id == item_id,
               AnswerAttempt.is_correct.is_(False))
        .order_by(AnswerAttempt.attempt_number)
    )).scalars().all())


def failed_tries(checks: list[dict]) -> int:
    return sum(1 for c in checks if c.get("outcome") not in ("solved", "empty"))


async def hints_used(task_instance_id: str, item_id: str, db: AsyncSession) -> int:
    return await db.scalar(
        select(func.count()).select_from(FeedbackEvent)
        .where(FeedbackEvent.task_instance_id == task_instance_id, FeedbackEvent.item_id == item_id)
    ) or 0


def hint_status(enabled: bool, tries: int, used: int, policy: dict) -> dict:
    """What the button should show. `unlocked` already accounts for the limit."""
    hints_left = max(0, policy["max_hints"] - used)
    return {
        "enabled": enabled,
        "failed_tries": tries,
        "unlock_after": policy["hint_unlock_after"],
        "hints_used": used,
        "hints_left": hints_left,
        "unlocked": enabled and tries >= policy["hint_unlock_after"] and hints_left > 0,
    }
