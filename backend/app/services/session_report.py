"""End-of-session performance report for researchers (every group).

The server computes the facts (scores, tries, hints) from its own records;
the AI only reads them and writes the interpretation, so a wrong AI reading
never changes a number. No names or codes go to the AI, nor the student's
group, so the reading isn't biased by the condition. Generated in the
background when a session ends; researchers can regenerate it in the admin
console. Its summary also briefs the tutor in the student's next session.
"""
import json
import logging
import re
from datetime import datetime
from statistics import mean, median

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.answer_attempt import AnswerAttempt
from app.models.feedback_event import FeedbackEvent
from app.models.response import Response
from app.models.session import Session
from app.models.session_report import SessionReport
from app.models.task_instance import TaskInstance
from app.models.trial import Trial
from app.services import ai_feedback
from app.services.ai_feedback import AIUnavailable
from app.services.park_scenarios import answer_relation, get_question
from app.services.scoring import angular_error, classify_trial_task
from app.services.tutor_context import session_history

log = logging.getLogger(__name__)

REPORT_PROMPT_VERSION = "report-v1"
# Tests point this at their own database; background tasks can't use get_db.
SESSION_FACTORY = async_session_maker

SYSTEM_PROMPT = """You describe one student's session in a study of spatial skills (children aged 10 to 14), for the researchers. Tasks can include PTSOT (point to objects from an imagined position; angular error in degrees), a window test (pick the view through a window), a park perspective task (say Left/Right/Front/Behind from a character's position) and a LEGO task (build a model from its front, side and top views).

You get JSON facts computed by the server, and a timeline of the session. Interpret only what the facts show. Do not invent numbers, do not guess the student's identity or group, and say when there is too little data.

Reply with JSON only:
{"summary": "2-3 sentences",
 "strengths": ["..."],
 "difficulties": ["..."],
 "error_patterns": ["e.g. reverses left and right from the character's view"],
 "strategy_observations": ["e.g. checks often after small changes"],
 "response_to_hints": "one sentence, or 'no hints' if none were given",
 "next_focus": "one sentence on what to practise next"}
Keep every item short and specific."""

_LIST_FIELDS = ("strengths", "difficulties", "error_patterns", "strategy_observations")
_TEXT_FIELDS = ("summary", "response_to_hints", "next_focus")


def _ratio(part: int, whole: int) -> float | None:
    return round(part / whole, 2) if whole else None


async def session_facts(session: Session, db: AsyncSession) -> dict:
    instances = dict((await db.execute(
        select(TaskInstance.id, TaskInstance.task_type).where(TaskInstance.session_id == session.id)
    )).all())
    facts: dict = {
        "round_number": session.round_number,
        "duration_minutes": round((session.ended_at - session.started_at).total_seconds() / 60, 1)
        if session.ended_at and session.started_at else None,
        "tasks": {},
    }
    if not instances:
        return facts

    # Test answers (PTSOT, window, first park answers): one response per trial
    rows = (await db.execute(
        select(TaskInstance.task_type, Trial.correct_response, Response.response_value,
               Response.correct, Response.reaction_time_ms)
        .join(Trial, Trial.task_instance_id == TaskInstance.id)
        .join(Response, Response.trial_id == Trial.id)
        .where(TaskInstance.id.in_(instances))
    )).all()
    by_task: dict[str, list] = {}
    for task_type, correct_response, value, correct, rt in rows:
        by_task.setdefault(classify_trial_task(task_type, correct_response), []).append((correct_response, value, correct, rt))
    for task, answers in by_task.items():
        scored = [c for _, _, c, _ in answers if c is not None]
        times = [rt for *_, rt in answers if rt]
        t = {
            "answered": len(answers),
            "correct": sum(scored),
            "accuracy": _ratio(sum(scored), len(scored)),
            "median_seconds": round(median(times) / 1000, 1) if times else None,
        }
        if task == "ptsot":
            errors = [e for e in (angular_error(v, c) for c, v, _, _ in answers) if e is not None]
            t["mean_angular_error_deg"] = round(mean(errors), 1) if errors else None
        facts["tasks"][task] = t

    # Park retries (feedback groups answer again after a wrong try)
    attempts = (await db.execute(
        select(AnswerAttempt).where(AnswerAttempt.task_instance_id.in_(instances))
        .order_by(AnswerAttempt.attempt_number)
    )).scalars().all()
    if attempts:
        questions: dict[str, list[AnswerAttempt]] = {}
        for a in attempts:
            questions.setdefault(a.item_id, []).append(a)
        relations = []
        for item_id, tries in questions.items():
            found = get_question(item_id)
            if found:
                relations += [answer_relation(a.answer, found[1]["correctAnswer"]) for a in tries if not a.is_correct]
        facts["tasks"].setdefault("spatial_perspective_taking", {})["retries"] = {
            "questions": len(questions),
            "first_try_correct": sum(1 for t in questions.values() if t[0].is_correct),
            "correct_after_retry": sum(1 for t in questions.values() if not t[0].is_correct and t[-1].is_correct),
            "never_correct": sum(1 for t in questions.values() if not t[-1].is_correct),
            "wrong_reversed": relations.count("opposite"),
            "wrong_other": relations.count("adjacent"),
        }

    # LEGO, from the server's own checks
    from app.api.v1.lego import results_from_events  # avoid an import cycle at load time
    for instance_id, task_type in instances.items():
        if task_type != "lego":
            continue
        results = await results_from_events(instance_id, db)
        if results:
            facts["tasks"]["lego"] = {
                "puzzles_tried": len(results),
                "solved": sum(1 for r in results if r["solved"]),
                "checks": sum(r["checks"] for r in results),
                "placements": sum(r["placements"] for r in results),
            }

    hints = (await db.execute(select(FeedbackEvent).where(FeedbackEvent.session_id == session.id))).scalars().all()
    facts["hints"] = {
        "given": len(hints),
        "by_ai": sum(1 for h in hints if h.generated_by == "ai"),
        "fixed_after": sum(1 for h in hints if h.accepted is True),
        "not_fixed_after": sum(1 for h in hints if h.accepted is False),
    }
    facts["timeline"] = await session_history(session.id, db, limit=20)
    return facts


def _parse_report(reply: str) -> dict | None:
    match = re.search(r"\{.*\}", reply or "", re.S)
    try:
        data = json.loads(match.group(0)) if match else None
    except ValueError:
        return None
    if not isinstance(data, dict) or not str(data.get("summary") or "").strip():
        return None
    report = {f: str(data.get(f) or "").strip()[:600] for f in _TEXT_FIELDS}
    for f in _LIST_FIELDS:
        items = data.get(f) if isinstance(data.get(f), list) else []
        report[f] = [str(i).strip()[:200] for i in items if str(i).strip()][:5]
    return report


async def build_report(session_id: str, db: AsyncSession) -> SessionReport | None:
    """Compute (or recompute) the session's report and save it."""
    session = await db.get(Session, session_id)
    if not session:
        return None
    facts = await session_facts(session, db)
    report = await db.get(SessionReport, session_id) or SessionReport(session_id=session_id)
    report.facts_json, report.report_json, report.model, report.error = json.dumps(facts), None, None, None
    report.prompt_version = REPORT_PROMPT_VERSION
    report.status = "facts_only"
    if ai_feedback.ai_status()["enabled"]:
        try:
            # The slower, long-timeout call: a report is longer than a hint and nobody waits on it
            reply, model = await ai_feedback.VISION_PROVIDERS[settings.ai_provider](SYSTEM_PROMPT, json.dumps(facts), [])
            parsed = _parse_report(reply)
            if parsed:
                report.report_json, report.model, report.status = json.dumps(parsed), model, "ready"
            else:
                report.status, report.error = "failed", "reply was not the expected JSON"
        except AIUnavailable as e:
            report.status, report.error = "failed", str(e)[:300]
    report.generated_at = datetime.utcnow()
    db.add(report)
    await db.commit()
    return report


async def generate_in_background(session_id: str) -> None:
    """Run after the response; never lets an error reach the student."""
    try:
        async with SESSION_FACTORY() as db:
            await build_report(session_id, db)
    except Exception:  # noqa: BLE001
        log.exception("Session report failed for %s", session_id)


async def earlier_summary(session: Session, db: AsyncSession) -> str | None:
    """The AI summary of the student's previous session, for the tutor."""
    report = await db.scalar(
        select(SessionReport.report_json)
        .join(Session, Session.id == SessionReport.session_id)
        .where(Session.participant_id == session.participant_id,
               Session.round_number < session.round_number,
               SessionReport.status == "ready")
        .order_by(Session.round_number.desc())
        .limit(1)
    )
    return json.loads(report)["summary"] if report else None
