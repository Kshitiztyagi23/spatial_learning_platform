"""The AI tutor's memory of one student's session.

Gemini keeps no state between requests, so every hint request carries a
short history of the session so far. It is rebuilt from what the server
already records (its own LEGO checks and every hint with its outcome), so
there is no second copy to drift out of sync. Names and codes never appear.
"""
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback_event import FeedbackEvent
from app.models.lego_event import LegoEvent
from app.models.task_instance import TaskInstance

MAX_LINES = 8  # most recent items; keeps hint requests small and fast

_PROBLEM = {
    "brick-count-low": "bricks left in the tray",
    "brick-count-high": "too many bricks",
    "footprint-wrong": "top outline wrong",
    "height-wrong": "height wrong",
    "shape-right-colour-wrong": "colours wrong",
    "colour-swap": "colours swapped",
    "hidden-brick": "hidden brick wrong",
    "region-mismatch": "part of a view wrong",
}


def _outcome(hint: FeedbackEvent) -> str:
    return {True: "then fixed it", False: "did not fix it yet"}.get(hint.accepted, "result pending")


def _lego_lines(checks: list[LegoEvent], hints: list[FeedbackEvent]) -> list[tuple]:
    by_puzzle: dict[str, dict] = {}
    for ev in checks:
        p = by_puzzle.setdefault(ev.puzzle_id, {"first": ev.created_at, "failed": [], "solved": False})
        details = json.loads(ev.details_json or "{}")
        if details.get("outcome") == "solved":
            p["solved"] = True
        elif details.get("outcome") not in (None, "empty"):
            first = (details.get("diagnoses") or [{}])[0].get("code")
            p["failed"].append(_PROBLEM.get(first, "views did not match"))
    lines = []
    for puzzle_id, p in by_puzzle.items():
        text = f"LEGO {puzzle_id}: {len(p['failed'])} failed check(s)"
        if p["failed"]:
            text += " (" + "; ".join(dict.fromkeys(p["failed"])) + ")"
        for h in (h for h in hints if h.item_id == puzzle_id):
            text += f'; hint "{h.message}", {_outcome(h)}'
        text += "; solved" if p["solved"] else "; not solved yet"
        lines.append((p["first"], text))
    return lines


def _park_lines(hints: list[FeedbackEvent]) -> list[tuple]:
    lines = []
    for h in hints:
        context = json.loads(h.trigger_reason or "{}")
        tries = context.get("failed_tries")
        text = f"Park {h.item_id}: {tries} wrong answer(s) before asking; hint \"{h.message}\", {_outcome(h)}"
        lines.append((h.shown_at, text))
    return lines


async def session_history(session_id: str, db: AsyncSession) -> list[str]:
    """Oldest first, at most MAX_LINES, e.g.
    'LEGO tut-01: 2 failed check(s) (height wrong); hint "...", then fixed it; solved'."""
    instances = dict((await db.execute(
        select(TaskInstance.id, TaskInstance.task_type).where(TaskInstance.session_id == session_id)
    )).all())
    if not instances:
        return []
    checks = (await db.execute(
        select(LegoEvent)
        .where(LegoEvent.task_instance_id.in_(instances), LegoEvent.event_type == "check")
        .order_by(LegoEvent.created_at)
    )).scalars().all()
    hints = (await db.execute(
        select(FeedbackEvent)
        .where(FeedbackEvent.session_id == session_id)
        .order_by(FeedbackEvent.shown_at)
    )).scalars().all()
    lego_hints = [h for h in hints if instances.get(h.task_instance_id) == "lego"]
    park_hints = [h for h in hints if instances.get(h.task_instance_id) == "spatial_perspective_taking"]
    lines = sorted(_lego_lines(checks, lego_hints) + _park_lines(park_hints), key=lambda t: t[0])
    return [text for _, text in lines][-MAX_LINES:]
