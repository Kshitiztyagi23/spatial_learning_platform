import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.task_instance import TaskInstance
from app.models.lego_event import LegoEvent
from app.models.lego_submission import LegoSubmission
from app.models.protocol import normalize_puzzle_ids
from app.services.lego_engine import check, get_puzzle, load_puzzles
from app.models.session import Session
from app.services.hint_policy import failed_tries, hint_status, hints_used, lego_checks, task_policy
from app.services.orchestration import get_or_create_active_protocol, session_feedback_stages
from app.services.task_instances import get_or_create_task_instance
from app.schemas.lego import LegoCheckIn, LegoEventIn, LegoSubmitIn, LegoSubmitOut

router = APIRouter(prefix="/sessions/{session_id}/lego", tags=["lego"])

async def get_active_lego_task_instance(session_id: str, db: AsyncSession) -> TaskInstance:
    return await get_or_create_task_instance(session_id, "lego", db)

@router.post("/events")
@router.post("events", include_in_schema=False)
async def create_lego_event(
    session_id: str,
    event_in: LegoEventIn,
    db: AsyncSession = Depends(get_db)
):
    if event_in.event_type == "check":
        # Whether a build is right is decided by POST /check on the server
        raise HTTPException(status_code=400, detail="Checks are recorded by the server")
    task_instance = await get_active_lego_task_instance(session_id, db)

    lego_event = LegoEvent(
        task_instance_id=task_instance.id,
        event_type=event_in.event_type,
        puzzle_id=event_in.puzzle_id,
        block_id=event_in.block_id,
        block_type=event_in.block_type,
        position_json=event_in.position_json,
        rotation_json=event_in.rotation_json,
        is_correct=event_in.is_correct,
        details_json=event_in.details_json
    )
    db.add(lego_event)
    await db.commit()
    return {"accepted": True}


@router.post("/check")
async def check_build(session_id: str, payload: LegoCheckIn, db: AsyncSession = Depends(get_db)):
    """The child pressed Check: the server compares their bricks with the
    puzzle (services/lego_engine.py) and records the result."""
    puzzle = get_puzzle(payload.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Unknown puzzle")
    placed = [b.model_dump() for b in payload.placed]
    try:
        result = check(placed, puzzle)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    task_instance = await get_active_lego_task_instance(session_id, db)
    db.add(LegoEvent(
        task_instance_id=task_instance.id,
        event_type="check",
        puzzle_id=payload.puzzle_id,
        is_correct=result["outcome"] == "solved",
        details_json=json.dumps({**result, "placed": placed}),
    ))
    await db.commit()

    # State of the "Need a hint?" button after this check
    session = await db.get(Session, session_id)
    enabled = bool(session) and "lego" in session_feedback_stages(session)
    tries = failed_tries(await lego_checks(task_instance.id, payload.puzzle_id, db))
    used = await hints_used(task_instance.id, payload.puzzle_id, db)
    policy = task_policy(await get_or_create_active_protocol(db), "lego")
    return {**result, "hint": hint_status(enabled, tries, used, policy)}


def score_lego_results(results: list[dict], puzzle_count: int) -> tuple[float | None, float | None]:
    """accuracy = puzzles solved / puzzles offered.
    efficiency = puzzles solved / Check presses (1.0 means every solve was
    right on the first check). None when there is nothing to score."""
    solved = sum(1 for r in results if r["solved"])
    checks = sum(r["checks"] for r in results)
    accuracy = solved / puzzle_count if puzzle_count > 0 else None
    efficiency = solved / checks if checks > 0 else None
    return accuracy, efficiency


async def results_from_events(task_instance_id: str, db: AsyncSession) -> list[dict]:
    """Per-puzzle results from what the server recorded: checks run by
    POST /check (empty-board presses excluded) and logged placements."""
    events = (await db.execute(
        select(LegoEvent.puzzle_id, LegoEvent.event_type, LegoEvent.is_correct, LegoEvent.details_json)
        .where(LegoEvent.task_instance_id == task_instance_id, LegoEvent.puzzle_id.is_not(None))
        .order_by(LegoEvent.created_at)
    )).all()
    per_puzzle: dict[str, dict] = {}
    for puzzle_id, event_type, is_correct, details in events:
        r = per_puzzle.setdefault(puzzle_id, {"puzzle_id": puzzle_id, "solved": False, "checks": 0, "placements": 0})
        if event_type == "check":
            if json.loads(details or "{}").get("outcome") != "empty":
                r["checks"] += 1
            r["solved"] = r["solved"] or bool(is_correct)
        elif event_type == "place":
            r["placements"] += 1
    return list(per_puzzle.values())


async def offered_puzzle_count(db: AsyncSession) -> int:
    protocol = await get_or_create_active_protocol(db)
    selected = normalize_puzzle_ids(json.loads(protocol.lego_config_json).get("selected_puzzles", []))
    available = load_puzzles()
    return len([p for p in selected if p in available]) or len(available)


@router.post("/submit", response_model=LegoSubmitOut)
@router.post("submit", response_model=LegoSubmitOut, include_in_schema=False)
async def submit_lego_build(
    session_id: str,
    submit_in: LegoSubmitIn,
    db: AsyncSession = Depends(get_db)
):
    task_instance = await get_active_lego_task_instance(session_id, db)
    # Scored from the server's own records; totals sent by the browser are ignored
    results = await results_from_events(task_instance.id, db)
    accuracy, efficiency = score_lego_results(results, await offered_puzzle_count(db))

    submission = LegoSubmission(
        task_instance_id=task_instance.id,
        final_build_json=submit_in.final_build_json,
        results_json=json.dumps(results),
        accuracy=accuracy,
        efficiency_score=efficiency,
        duration_seconds=submit_in.duration_seconds
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission
