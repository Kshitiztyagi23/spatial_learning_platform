import io
import csv
import json
import secrets
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
from app.schemas.protocol import (
    PasscodeVerifyIn,
    PasscodeVerifyOut,
    ProtocolUpdateIn,
    ProtocolOut,
    PtsotConfig,
    PerspectiveConfig,
    LegoConfig
)
from app.services.orchestration import get_or_create_active_protocol

router = APIRouter(prefix="/admin", tags=["admin"])

# Available puzzle catalog definitions for the Admin UI selector
AVAILABLE_LEGO_PUZZLES = [
    {"id": "tut-01", "name": "Side by side", "tier": "Tutorial"},
    {"id": "tut-02", "name": "Stack of two", "tier": "Tutorial"},
    {"id": "tut-03", "name": "Corner turn", "tier": "Tutorial"},
    {"id": "tut-04", "name": "The arch", "tier": "Tutorial"},
    {"id": "tut-05", "name": "T-junction", "tier": "Tutorial"},
    {"id": "tut-06", "name": "Hidden red", "tier": "Tutorial"},
    {"id": "07-easy-01", "name": "Easy Column", "tier": "Easy"},
    {"id": "13-easy-02", "name": "Easy Step", "tier": "Easy"},
    {"id": "14-easy-03", "name": "Easy Bridge", "tier": "Easy"},
    {"id": "15-easy-04", "name": "Easy Tower", "tier": "Easy"},
    {"id": "08-medium-01", "name": "Medium L-Shape", "tier": "Medium"},
    {"id": "16-medium-02", "name": "Medium Cross", "tier": "Medium"},
    {"id": "17-medium-03", "name": "Medium Overhang", "tier": "Medium"},
    {"id": "18-medium-04", "name": "Medium Arch", "tier": "Medium"},
    {"id": "09-hard-01", "name": "Hard Pillar Block", "tier": "Hard"},
    {"id": "19-hard-02", "name": "Hard Pyramid", "tier": "Hard"},
    {"id": "20-hard-03", "name": "Hard Zig-Zag", "tier": "Hard"},
    {"id": "21-hard-04", "name": "Hard Fortress", "tier": "Hard"},
    {"id": "10-b-01", "name": "Bonus B-01", "tier": "Bonus"},
    {"id": "11-c-01", "name": "Bonus C-01", "tier": "Bonus"},
    {"id": "12-d-01", "name": "Bonus D-01", "tier": "Bonus"},
]

@router.post("/verify-passcode", response_model=PasscodeVerifyOut)
async def verify_passcode(payload: PasscodeVerifyIn):
    if payload.passcode == settings.admin_passcode:
        # Generate token based on day to allow session auth
        token = f"admin_token_{secrets.token_hex(16)}"
        return PasscodeVerifyOut(valid=True, token=token, message="Access granted")
    return PasscodeVerifyOut(valid=False, message="Invalid researcher passcode")

@router.get("/catalogs")
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

@router.get("/protocol", response_model=ProtocolOut)
async def get_protocol(db: AsyncSession = Depends(get_db)):
    protocol = await get_or_create_active_protocol(db)
    
    stages = json.loads(protocol.enabled_stages_json)
    ptsot = json.loads(protocol.ptsot_config_json)
    perspective = json.loads(protocol.perspective_config_json)
    lego = json.loads(protocol.lego_config_json)

    return ProtocolOut(
        id=protocol.id,
        name=protocol.name,
        active=protocol.active,
        ai_feedback_percentage=protocol.ai_feedback_percentage,
        enabled_stages=stages,
        ptsot_config=PtsotConfig(**ptsot),
        perspective_config=PerspectiveConfig(**perspective),
        lego_config=LegoConfig(**lego),
        updated_at=protocol.updated_at
    )

@router.put("/protocol", response_model=ProtocolOut)
async def update_protocol(payload: ProtocolUpdateIn, db: AsyncSession = Depends(get_db)):
    protocol = await get_or_create_active_protocol(db)

    protocol.name = payload.name or protocol.name
    protocol.ai_feedback_percentage = payload.ai_feedback_percentage
    protocol.enabled_stages_json = json.dumps(payload.enabled_stages)
    protocol.ptsot_config_json = json.dumps(payload.ptsot_config.model_dump())
    protocol.perspective_config_json = json.dumps(payload.perspective_config.model_dump())
    protocol.lego_config_json = json.dumps(payload.lego_config.model_dump())
    protocol.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(protocol)

    return await get_protocol(db)

@router.get("/sessions")
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
    sessions_data = []

    for s, p in rows:
        if s.status == "completed" or s.current_stage == "done":
            completed_count += 1
        if p.condition == "experimental":
            experimental_count += 1
        else:
            control_count += 1

        sessions_data.append({
            "session_id": s.id,
            "participant_id": p.id,
            "external_id": p.external_id,
            "name": p.name,
            "grade": p.grade,
            "section": p.section,
            "roll_no": p.roll_no,
            "condition": p.condition,
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
        },
        "sessions": sessions_data
    }

@router.get("/exports/{export_type}")
async def export_data(export_type: str, db: AsyncSession = Depends(get_db)):
    """Export research datasets as downloadable CSV files."""
    output = io.StringIO()
    writer = csv.writer(output)

    if export_type == "participants":
        writer.writerow([
            "participant_id", "external_id", "name", "age", "gender", 
            "grade", "section", "roll_no", "condition", "consent", "created_at"
        ])
        stmt = select(Participant).order_by(Participant.created_at)
        result = await db.execute(stmt)
        for p in result.scalars().all():
            writer.writerow([
                p.id, p.external_id, p.name, p.age, p.gender,
                p.grade, p.section, p.roll_no, p.condition, p.consent,
                p.created_at.isoformat() if p.created_at else ""
            ])

    elif export_type == "ptsot_trials":
        writer.writerow([
            "session_id", "trial_number", "stimulus_id", "correct_angle", 
            "response_angle", "absolute_error_deg", "correct_within_22_5", 
            "reaction_time_ms", "created_at"
        ])
        stmt = (
            select(Trial, ResponseModel)
            .join(ResponseModel, ResponseModel.trial_id == Trial.id)
            .order_by(Trial.task_instance_id, Trial.trial_number)
        )
        result = await db.execute(stmt)
        for t, r in result.all():
            try:
                err = abs(float(r.response_value) - float(t.correct_response)) if t.correct_response else None
            except Exception:
                err = None
            writer.writerow([
                t.task_instance_id, t.trial_number, t.stimulus_id or "", 
                t.correct_response or "", r.response_value, 
                err if err is not None else "", r.correct, 
                r.reaction_time_ms or "", r.created_at.isoformat() if r.created_at else ""
            ])

    elif export_type == "lego_events":
        writer.writerow([
            "event_id", "session_id", "event_type", "block_id", 
            "block_type", "position_json", "rotation_json", "is_correct", "created_at"
        ])
        stmt = select(LegoEvent).order_by(LegoEvent.created_at)
        result = await db.execute(stmt)
        for ev in result.scalars().all():
            writer.writerow([
                ev.id, ev.task_instance_id, ev.event_type, ev.block_id or "",
                ev.block_type or "", ev.position_json or "", ev.rotation_json or "",
                ev.is_correct, ev.created_at.isoformat() if ev.created_at else ""
            ])

    elif export_type == "lego_submissions":
        writer.writerow([
            "submission_id", "session_id", "duration_seconds", 
            "accuracy", "efficiency_score", "submitted_at"
        ])
        stmt = select(LegoSubmission).order_by(LegoSubmission.submitted_at)
        result = await db.execute(stmt)
        for sub in result.scalars().all():
            writer.writerow([
                sub.id, sub.task_instance_id, sub.duration_seconds,
                sub.accuracy or "", sub.efficiency_score or "",
                sub.submitted_at.isoformat() if sub.submitted_at else ""
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
