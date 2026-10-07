import io
import csv
import json
import hmac
import hashlib
import secrets
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.config import settings
from app.core.database import get_db
from app.models.protocol import StudyProtocol
from app.models.participant import Participant
from app.models.session import Session
from app.models.stage import Stage
from app.models.trial import Trial
from app.models.response import Response as ResponseModel
from app.models.lego_event import LegoEvent
from app.models.lego_submission import LegoSubmission
from app.models.audit_log import AuditLog
from app.models.task_instance import TaskInstance
from app.models.feedback_event import FeedbackEvent
from app.services.scoring import angular_error, classify_trial_task, score_trial
from app.schemas.protocol import (
    PasscodeVerifyIn,
    PasscodeVerifyOut,
    ProtocolUpdateIn,
    ProtocolOut,
    PtsotConfig,
    PerspectiveConfig,
    ConditionSplit,
    LegoConfig
)
from app.services.orchestration import get_or_create_active_protocol, protocol_condition_split, protocol_schedule, protocol_total_rounds
from app.services.study_design import CONDITIONS, UNASSIGNED, allocate_groups, default_schedule, first_round_stages, normalize_schedule
from app.services.ai_feedback import ai_status

_token_key = (settings.admin_token_secret or secrets.token_hex(32)).encode()

def _sign(expires_at: int) -> str:
    return hmac.new(_token_key, str(expires_at).encode(), hashlib.sha256).hexdigest()

def issue_admin_token() -> str:
    expires_at = int(time.time()) + settings.admin_token_ttl_seconds
    return f"{expires_at}.{_sign(expires_at)}"

def require_admin(authorization: str | None = Header(default=None)) -> None:
    """Reject requests without a valid, unexpired token from /verify-passcode."""
    token = (authorization or "").removeprefix("Bearer ").strip()
    exp_str, _, sig = token.partition(".")
    if not exp_str.isdigit() or not hmac.compare_digest(sig, _sign(int(exp_str))):
        raise HTTPException(status_code=401, detail="Researcher authentication required")
    if int(exp_str) < time.time():
        raise HTTPException(status_code=401, detail="Researcher session expired")

router = APIRouter(prefix="/admin", tags=["admin"])
protected = [Depends(require_admin)]

# Available puzzle catalog definitions for the Admin UI selector
AVAILABLE_LEGO_PUZZLES = [
    {"id": "tut-01", "name": "Side by side", "tier": "Tutorial"},
    {"id": "tut-02", "name": "Stack of two", "tier": "Tutorial"},
    {"id": "tut-03", "name": "Corner turn", "tier": "Tutorial"},
    {"id": "tut-04", "name": "The arch", "tier": "Tutorial"},
    {"id": "tut-05", "name": "T-junction", "tier": "Tutorial"},
    {"id": "tut-06", "name": "Hidden red", "tier": "Tutorial"},
    {"id": "easy-01", "name": "Easy Column", "tier": "Easy"},
    {"id": "easy-02", "name": "Easy Step", "tier": "Easy"},
    {"id": "easy-03", "name": "Easy Bridge", "tier": "Easy"},
    {"id": "easy-04", "name": "Easy Tower", "tier": "Easy"},
    {"id": "medium-01", "name": "Medium L-Shape", "tier": "Medium"},
    {"id": "medium-02", "name": "Medium Cross", "tier": "Medium"},
    {"id": "medium-03", "name": "Medium Overhang", "tier": "Medium"},
    {"id": "medium-04", "name": "Medium Arch", "tier": "Medium"},
    {"id": "hard-01", "name": "Hard Pillar Block", "tier": "Hard"},
    {"id": "hard-02", "name": "Hard Pyramid", "tier": "Hard"},
    {"id": "hard-03", "name": "Hard Zig-Zag", "tier": "Hard"},
    {"id": "hard-04", "name": "Hard Fortress", "tier": "Hard"},
    {"id": "b-01", "name": "Bonus B-01", "tier": "Bonus"},
    {"id": "c-01", "name": "Bonus C-01", "tier": "Bonus"},
    {"id": "d-01", "name": "Bonus D-01", "tier": "Bonus"},
]

@router.post("/verify-passcode", response_model=PasscodeVerifyOut)
async def verify_passcode(payload: PasscodeVerifyIn):
    if not settings.admin_passcode:
        raise HTTPException(status_code=503, detail="Admin access is disabled: set ADMIN_PASSCODE in backend/.env")
    if hmac.compare_digest(payload.passcode.encode(), settings.admin_passcode.encode()):
        return PasscodeVerifyOut(valid=True, token=issue_admin_token(), message="Access granted")
    return PasscodeVerifyOut(valid=False, message="Invalid researcher passcode")

@router.get("/catalogs", dependencies=protected)
async def get_catalogs():
    """Return available pools of questions, scenarios, and LEGO puzzles for the researcher UI."""
    ptsot_questions = [
        {"number": i, "label": f"Question {i}", "standing": f"Point {i}"} for i in range(1, 13)
    ]
    perspective_scenarios = [
        {"id": i, "label": f"Scenario {i}", "name": f"Visual Scenario {i}"} for i in range(1, 9)
    ]
    return {
        "ptsot_questions": ptsot_questions,
        "perspective_scenarios": perspective_scenarios,
        "lego_puzzles": AVAILABLE_LEGO_PUZZLES
    }

@router.get("/protocol", response_model=ProtocolOut, dependencies=protected)
async def get_protocol(db: AsyncSession = Depends(get_db)):
    protocol = await get_or_create_active_protocol(db)
    
    schedule = protocol_schedule(protocol)
    ptsot = json.loads(protocol.ptsot_config_json)
    perspective = json.loads(protocol.perspective_config_json)
    lego = json.loads(protocol.lego_config_json)

    return ProtocolOut(
        id=protocol.id,
        name=protocol.name,
        active=protocol.active,
        ai_feedback_percentage=protocol.ai_feedback_percentage,
        condition_split=ConditionSplit(**protocol_condition_split(protocol)),
        total_rounds=protocol_total_rounds(protocol),
        round_schedule=schedule,
        ai_status=ai_status(),
        enabled_stages=first_round_stages(schedule),
        ptsot_config=PtsotConfig(**ptsot),
        perspective_config=PerspectiveConfig(**perspective),
        lego_config=LegoConfig(**lego),
        updated_at=protocol.updated_at
    )

@router.put("/protocol", response_model=ProtocolOut, dependencies=protected)
async def update_protocol(payload: ProtocolUpdateIn, db: AsyncSession = Depends(get_db)):
    protocol = await get_or_create_active_protocol(db)

    protocol.name = payload.name or protocol.name
    protocol.condition_split_json = json.dumps(payload.condition_split.model_dump())
    protocol.ai_feedback_percentage = payload.condition_split.experimental
    protocol.total_rounds = payload.total_rounds
    raw_schedule = payload.round_schedule.model_dump() if payload.round_schedule is not None else None
    schedule = normalize_schedule(raw_schedule, payload.total_rounds)
    protocol.round_schedule_json = json.dumps(schedule)
    protocol.enabled_stages_json = json.dumps(first_round_stages(schedule))
    protocol.ptsot_config_json = json.dumps(payload.ptsot_config.model_dump())
    protocol.perspective_config_json = json.dumps(payload.perspective_config.model_dump())
    protocol.lego_config_json = json.dumps(payload.lego_config.model_dump())
    protocol.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(protocol)

    return await get_protocol(db)

@router.get("/protocol/recommended-schedule", dependencies=protected)
async def recommended_schedule(total_rounds: int = 3):
    """The recommended design for a given number of sessions, for the
    admin console's "reset" button."""
    return default_schedule(max(2, min(12, total_rounds)))

async def _waiting_for_group(db: AsyncSession) -> list[Participant]:
    """Unassigned participants who have finished session 1."""
    finished_first = select(Session.participant_id).where(Session.round_number == 1, Session.status == "completed")
    result = await db.execute(
        select(Participant)
        .where(Participant.condition == UNASSIGNED, Participant.id.in_(finished_first))
        .order_by(Participant.created_at)
    )
    return list(result.scalars().all())


async def _group_counts(db: AsyncSession) -> dict[str, int]:
    rows = (await db.execute(select(Participant.condition, func.count()).group_by(Participant.condition))).all()
    return {condition: count for condition, count in rows}


@router.get("/assignment", dependencies=protected)
async def assignment_status(db: AsyncSession = Depends(get_db)):
    """How many students are waiting for a group, and the current group sizes."""
    protocol = await get_or_create_active_protocol(db)
    return {
        "waiting": len(await _waiting_for_group(db)),
        "group_counts": await _group_counts(db),
        "split": protocol_condition_split(protocol),
    }


@router.post("/assign-groups", dependencies=protected)
async def assign_groups(db: AsyncSession = Depends(get_db)):
    """Put everyone who finished session 1 and has no group yet into a group,
    in exactly the saved split's proportions. Existing groups never change."""
    protocol = await get_or_create_active_protocol(db)
    split = protocol_condition_split(protocol)
    waiting = await _waiting_for_group(db)
    assignments = allocate_groups([p.id for p in waiting], split)
    for participant in waiting:
        participant.condition = assignments[participant.id]

    assigned = {c: list(assignments.values()).count(c) for c in CONDITIONS}
    db.add(AuditLog(
        actor_type="researcher",
        entity_type="study",
        entity_id=protocol.id,
        action="groups_assigned",
        details_json=json.dumps({"split": split, "assigned": assigned, "participants": assignments}),
    ))
    await db.commit()
    return {"assigned": assigned, "total": len(waiting), "group_counts": await _group_counts(db)}


@router.get("/sessions", dependencies=protected)
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """Return all student sessions joined with participant information for live tracking."""
    stmt = (
        select(Session, Participant)
        .join(Participant, Session.participant_id == Participant.id)
        .order_by(desc(Session.started_at))
    )
    result = await db.execute(stmt)
    rows = result.all()

    total_sessions = len(rows)
    completed_count = 0
    experimental_count = 0
    control_count = 0
    natural_control_count = 0
    unassigned_count = 0
    sessions_data = []

    for s, p in rows:
        if s.status == "completed" or s.current_stage == "done":
            completed_count += 1
        if p.condition == "experimental":
            experimental_count += 1
        elif p.condition == "natural_control":
            natural_control_count += 1
        elif p.condition == "control":
            control_count += 1
        else:
            unassigned_count += 1

        sessions_data.append({
            "session_id": s.id,
            "participant_id": p.id,
            "external_id": p.external_id,
            "name": p.name,
            "grade": p.grade,
            "section": p.section,
            "roll_no": p.roll_no,
            "condition": p.condition,
            "participant_code": p.participant_code,
            "round_number": s.round_number,
            "current_stage": s.current_stage,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        })

    return {
        "summary": {
            "total_participants": total_sessions,
            "completed": completed_count,
            "in_progress": total_sessions - completed_count,
            "experimental_count": experimental_count,
            "control_count": control_count,
            "natural_control_count": natural_control_count,
            "unassigned_count": unassigned_count,
        },
        "sessions": sessions_data
    }

@router.get("/exports/{export_type}", dependencies=protected)
async def export_data(export_type: str, db: AsyncSession = Depends(get_db)):
    """Export research datasets as downloadable CSV files."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Every activity row carries who, which group and which round, so pre/post
    # comparisons by group need no extra joins in R / SPSS / pandas.
    # `condition` is the participant's group as assigned now, so session-1
    # (pre-test) rows, recorded before assignment, carry the group too.
    ctx_cols = ["session_id", "participant_id", "condition", "round_number"]
    groups = dict((await db.execute(select(Participant.id, Participant.condition))).all())

    def ctx(session: Session) -> list:
        return [session.id, session.participant_id, groups.get(session.participant_id, session.condition), session.round_number]

    if export_type == "participants":
        writer.writerow([
            "participant_id", "external_id", "participant_code", "name", "age", "gender",
            "grade", "section", "roll_no", "condition", "consent", "created_at"
        ])
        stmt = select(Participant).order_by(Participant.created_at)
        result = await db.execute(stmt)
        for p in result.scalars().all():
            writer.writerow([
                p.id, p.external_id, p.participant_code or "", p.name, p.age, p.gender,
                p.grade, p.section, p.roll_no, p.condition, p.consent,
                p.created_at.isoformat() if p.created_at else ""
            ])

    elif export_type in ("ptsot_trials", "perspective_trials"):
        wanted = "ptsot" if export_type == "ptsot_trials" else "spatial_perspective_taking"
        if wanted == "ptsot":
            writer.writerow(ctx_cols + [
                "trial_number", "stimulus_id", "correct_angle",
                "response_angle", "angular_error_deg", "correct_within_22_5",
                "reaction_time_ms", "created_at"
            ])
        else:
            writer.writerow(ctx_cols + [
                "trial_number", "stimulus_id", "correct_answer",
                "response", "correct", "reaction_time_ms", "created_at"
            ])
        stmt = (
            select(Trial, ResponseModel, TaskInstance, Session)
            .join(ResponseModel, ResponseModel.trial_id == Trial.id)
            .join(TaskInstance, TaskInstance.id == Trial.task_instance_id)
            .join(Session, Session.id == TaskInstance.session_id)
            .order_by(Session.participant_id, Session.round_number, Trial.trial_number)
        )
        result = await db.execute(stmt)
        for t, r, ti, sess in result.all():
            if classify_trial_task(ti.task_type, t.correct_response) != wanted:
                continue
            # Re-score so rows saved before the scoring fixes are reported correctly
            correct = score_trial(wanted, r.response_value, t.correct_response)
            created = r.created_at.isoformat() if r.created_at else ""
            rt = "" if r.reaction_time_ms is None else r.reaction_time_ms
            if wanted == "ptsot":
                err = angular_error(r.response_value, t.correct_response) if t.correct_response else None
                writer.writerow(ctx(sess) + [
                    t.trial_number, t.stimulus_id or "",
                    t.correct_response or "", r.response_value,
                    "" if err is None else err, "" if correct is None else correct,
                    rt, created
                ])
            else:
                writer.writerow(ctx(sess) + [
                    t.trial_number, t.stimulus_id or "",
                    t.correct_response or "", r.response_value,
                    "" if correct is None else correct, rt, created
                ])

    elif export_type == "lego_events":
        writer.writerow(["event_id"] + ctx_cols + [
            "puzzle_id", "event_type", "block_id",
            "block_type", "position_json", "rotation_json", "is_correct",
            "details_json", "created_at"
        ])
        stmt = (
            select(LegoEvent, Session)
            .join(TaskInstance, TaskInstance.id == LegoEvent.task_instance_id)
            .join(Session, Session.id == TaskInstance.session_id)
            .order_by(LegoEvent.created_at)
        )
        result = await db.execute(stmt)
        for ev, sess in result.all():
            writer.writerow([ev.id] + ctx(sess) + [
                ev.puzzle_id or "", ev.event_type, ev.block_id or "",
                ev.block_type or "", ev.position_json or "", ev.rotation_json or "",
                "" if ev.is_correct is None else ev.is_correct, ev.details_json or "",
                ev.created_at.isoformat() if ev.created_at else ""
            ])

    elif export_type == "lego_submissions":
        writer.writerow(["submission_id"] + ctx_cols + [
            "duration_seconds", "accuracy", "efficiency_score", "results_json", "submitted_at"
        ])
        stmt = (
            select(LegoSubmission, Session)
            .join(TaskInstance, TaskInstance.id == LegoSubmission.task_instance_id)
            .join(Session, Session.id == TaskInstance.session_id)
            .order_by(LegoSubmission.submitted_at)
        )
        result = await db.execute(stmt)
        for sub, sess in result.all():
            writer.writerow([sub.id] + ctx(sess) + [
                sub.duration_seconds,
                "" if sub.accuracy is None else sub.accuracy,
                "" if sub.efficiency_score is None else sub.efficiency_score,
                sub.results_json or "",
                sub.submitted_at.isoformat() if sub.submitted_at else ""
            ])

    elif export_type == "feedback_events":
        writer.writerow(["feedback_id"] + ctx_cols + [
            "task_type", "feedback_type", "generated_by", "message",
            "trigger_reason", "corrected_after", "rule_version", "shown_at"
        ])
        stmt = (
            select(FeedbackEvent, Session, TaskInstance.task_type)
            .join(Session, Session.id == FeedbackEvent.session_id)
            .outerjoin(TaskInstance, TaskInstance.id == FeedbackEvent.task_instance_id)
            .order_by(FeedbackEvent.shown_at)
        )
        result = await db.execute(stmt)
        for fb, sess, task_type in result.all():
            writer.writerow([fb.id] + ctx(sess) + [
                task_type or "", fb.feedback_type, fb.generated_by or "rule", fb.message,
                fb.trigger_reason or "", "" if fb.accepted is None else fb.accepted,
                fb.rule_version, fb.shown_at.isoformat() if fb.shown_at else ""
            ])

    else:
        raise HTTPException(status_code=400, detail=f"Unknown export type: {export_type}")

    csv_data = output.getvalue()
    filename = f"{export_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
