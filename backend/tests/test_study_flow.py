"""End-to-end study flow: session 1 for everyone, researcher assigns groups,
later sessions per group, then the exports."""
import csv
import io

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.core.config import settings
from app.main import app

SESSION_1 = ["intake_consent", "demographics", "spatial_experience", "ptsot", "done"]

GROUP_ONLY = {
    "experimental": {"experimental": 100, "control": 0, "natural_control": 0},
    "control": {"experimental": 0, "control": 100, "natural_control": 0},
    "natural_control": {"experimental": 0, "control": 0, "natural_control": 100},
}


@pytest.fixture(autouse=True)
def admin_passcode(monkeypatch):
    monkeypatch.setattr(settings, "admin_passcode", "test-pass")


@pytest_asyncio.fixture
async def ac():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def admin(ac):
    res = await ac.post("/api/v1/admin/verify-passcode", json={"passcode": "test-pass"})
    return {"Authorization": f"Bearer {res.json()['token']}"}


async def _set_protocol(ac, admin, split, total_rounds=3, schedule=None):
    body = {
        "condition_split": split,
        "total_rounds": total_rounds,
        "ptsot_config": {"selected_questions": [1, 2], "time_limit_seconds": 300, "shuffle": False},
        "perspective_config": {"selected_scenarios": [1]},
        "lego_config": {"selected_puzzles": ["tut-01", "07-easy-01"], "time_limit_seconds": 600},
    }
    if schedule is not None:
        body["round_schedule"] = schedule
    res = await ac.put("/api/v1/admin/protocol", headers=admin, json=body)
    assert res.status_code == 200, res.text
    return res.json()


async def _participant(ac, name="Asha Rao", roll="7"):
    res = await ac.post("/api/v1/participants", json={
        "name": name, "age": 12, "gender": "female", "grade": "Grade 7",
        "section": "A", "roll_no": roll, "consent": True,
    })
    p = res.json()
    assert p["condition"] == "unassigned" and len(p["participant_code"]) == 6
    return p


async def _start(ac, participant_id):
    res = await ac.post("/api/v1/sessions", json={"participant_id": participant_id})
    assert res.status_code == 200, res.text
    return res.json()


async def _complete(ac, session_id, stage):
    res = await ac.post(f"/api/v1/sessions/{session_id}/stages/{stage}/complete", json={"stage_name": stage})
    assert res.status_code == 200, res.text


async def _finish(ac, session_id) -> list[str]:
    """Walk a session to the end, returning the stages it went through."""
    seen = []
    while True:
        stage = (await ac.get(f"/api/v1/sessions/{session_id}/next-stage")).json()["stage_name"]
        seen.append(stage)
        await _complete(ac, session_id, stage)
        if stage == "done":
            return seen


async def _lookup(ac, code):
    res = await ac.post("/api/v1/participants/lookup", json={"code": code.lower()})
    assert res.status_code == 200
    return res.json()


async def _assign(ac, admin):
    res = await ac.post("/api/v1/admin/assign-groups", headers=admin)
    assert res.status_code == 200
    return res.json()


def _rows(text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(text)))


@pytest.mark.asyncio
async def test_full_study_for_ai_feedback_group_and_exports(ac, admin):
    await _set_protocol(ac, admin, GROUP_ONLY["experimental"])
    p = await _participant(ac)

    # Session 1: everyone, no group, no hints, pre-test
    s1 = await _start(ac, p["id"])
    assert (s1["round_number"], s1["round_type"], s1["stages"], s1["feedback_stages"]) == (1, "pre", SESSION_1, [])
    assert s1["more_rounds"] is True
    trial = (await ac.post(f"/api/v1/sessions/{s1['id']}/trials", json={
        "task_type": "ptsot", "trial_number": 1, "stimulus_id": "ptsot_q1",
        "response_value": "5", "correct_response": "350", "reaction_time_ms": 4200,
    })).json()
    assert trial["correct"] is True  # 15 deg apart across north
    assert await _finish(ac, s1["id"]) == SESSION_1

    # Before the researcher assigns groups, the student can't continue
    assert (await _lookup(ac, p["participant_code"]))["status"] == "waiting"
    blocked = await ac.post("/api/v1/sessions", json={"participant_id": p["id"]})
    assert blocked.status_code == 409 and "isn't ready" in blocked.json()["detail"]
    status = (await ac.get("/api/v1/admin/assignment", headers=admin)).json()
    assert status["waiting"] == 1

    assert (await _assign(ac, admin))["assigned"] == {"experimental": 1, "control": 0, "natural_control": 0}

    # Session 2: training with hints
    found = await _lookup(ac, p["participant_code"])
    assert (found["status"], found["next_round"], found["first_name"]) == ("ready", 2, "Asha")
    s2 = await _start(ac, p["id"])
    assert s2["stages"] == ["spatial_perspective_taking", "lego", "done"]
    assert s2["feedback_stages"] == ["spatial_perspective_taking", "lego"]
    base = f"/api/v1/sessions/{s2['id']}"

    await ac.post(f"{base}/trials", json={
        "task_type": "spatial_perspective_taking", "trial_number": 1, "stimulus_id": "scenario_1_q_1",
        "response_value": "Left", "correct_response": "Right", "reaction_time_ms": 3100,
    })
    fb = (await ac.post(f"{base}/feedback", json={"task_type": "spatial_perspective_taking", "correct": False})).json()
    assert fb["shown"] is True and "character" in fb["message"]
    assert (await ac.post(f"{base}/feedback/{fb['feedback_id']}/acknowledge", json={"corrected": True})).status_code == 200

    lego_cfg = (await ac.get(f"{base}/task-config/lego")).json()
    assert lego_cfg["ai_hints_enabled"] is True and lego_cfg["selected_puzzles"] == ["tut-01", "easy-01"]
    await ac.post(f"{base}/lego/events", json={
        "event_type": "place", "puzzle_id": "tut-01", "block_id": "b1",
        "block_type": "2x2-red", "position_json": "[0,0,0]", "rotation_json": "0",
    })
    diagnoses = [{"code": "height-wrong"}, {"code": "region-mismatch", "view": "front", "area": "right"}]
    fb = (await ac.post(f"{base}/feedback", json={"task_type": "lego", "attempt": 1, "diagnoses": diagnoses})).json()
    assert fb["message"] == "Look at the side view. Count the layers."
    again = (await ac.post(f"{base}/feedback", json={"task_type": "lego", "attempt": 2, "diagnoses": diagnoses})).json()
    assert again["shown"] is False  # inside the cooldown window
    sub = (await ac.post(f"{base}/lego/submit", json={
        "final_build_json": "{}", "duration_seconds": 95, "puzzle_count": 2,
        "results": [
            {"puzzle_id": "tut-01", "solved": True, "checks": 2, "placements": 3},
            {"puzzle_id": "easy-01", "solved": False, "checks": 1, "placements": 2},
        ],
    })).json()
    assert sub["accuracy"] == 0.5 and sub["efficiency_score"] == pytest.approx(1 / 3)
    await _finish(ac, s2["id"])

    # Session 3: post-test
    s3 = await _start(ac, p["id"])
    assert (s3["round_number"], s3["stages"], s3["more_rounds"]) == (3, ["ptsot", "done"], False)
    await ac.post(f"/api/v1/sessions/{s3['id']}/trials", json={
        "task_type": "ptsot", "trial_number": 1, "response_value": "100", "correct_response": "123",
    })
    await _finish(ac, s3["id"])
    assert (await _lookup(ac, p["participant_code"]))["status"] == "complete"
    assert (await ac.post("/api/v1/sessions", json={"participant_id": p["id"]})).status_code == 409

    async def export(kind):
        res = await ac.get(f"/api/v1/admin/exports/{kind}", headers=admin)
        assert res.status_code == 200
        return _rows(res.text)

    # Pre- and post-test rows both carry the group assigned later
    ptsot = await export("ptsot_trials")
    assert [(r["condition"], r["round_number"], r["correct_within_22_5"]) for r in ptsot] == [
        ("experimental", "1", "True"), ("experimental", "3", "False"),
    ]
    persp = await export("perspective_trials")
    assert [(r["round_number"], r["response"], r["correct"]) for r in persp] == [("2", "Left", "False")]
    events = await export("lego_events")
    assert [(r["session_id"], r["puzzle_id"], r["event_type"]) for r in events] == [(s2["id"], "tut-01", "place")]
    assert (await export("lego_submissions"))[0]["accuracy"] == "0.5"
    feedback = await export("feedback_events")
    assert sorted((r["task_type"], r["corrected_after"], r["generated_by"]) for r in feedback) == [
        ("lego", "", "rule"), ("spatial_perspective_taking", "True", "rule"),
    ]
    participants = await export("participants")
    assert participants[0]["condition"] == "experimental" and participants[0]["participant_code"] == p["participant_code"]


@pytest.mark.asyncio
async def test_assignment_follows_split_exactly_and_never_reassigns(ac, admin):
    await _set_protocol(ac, admin, {"experimental": 40, "control": 40, "natural_control": 20})
    people = [await _participant(ac, f"Student {i}", str(i)) for i in range(10)]
    for p in people:
        await _finish(ac, (await _start(ac, p["id"]))["id"])
    late = await _participant(ac, "Late Starter", "99")
    await _start(ac, late["id"])  # session 1 not finished: not eligible yet

    first = await _assign(ac, admin)
    assert first["assigned"] == {"experimental": 4, "control": 4, "natural_control": 2}

    # Pressing again only picks up newly finished students; nobody moves
    await _set_protocol(ac, admin, GROUP_ONLY["control"])
    assert (await _assign(ac, admin))["total"] == 0
    counts = (await ac.get("/api/v1/admin/assignment", headers=admin)).json()["group_counts"]
    assert counts == {"experimental": 4, "control": 4, "natural_control": 2, "unassigned": 1}


@pytest.mark.asyncio
async def test_no_feedback_group_never_gets_hints(ac, admin):
    await _set_protocol(ac, admin, GROUP_ONLY["control"])
    p = await _participant(ac)
    await _finish(ac, (await _start(ac, p["id"]))["id"])
    await _assign(ac, admin)
    s2 = await _start(ac, p["id"])
    assert s2["stages"] == ["spatial_perspective_taking", "lego", "done"] and s2["feedback_stages"] == []
    for task in [
        {"task_type": "spatial_perspective_taking", "correct": False},
        {"task_type": "lego", "attempt": 1, "diagnoses": [{"code": "height-wrong"}]},
    ]:
        res = (await ac.post(f"/api/v1/sessions/{s2['id']}/feedback", json=task)).json()
        assert res["shown"] is False


@pytest.mark.asyncio
async def test_tests_only_group_goes_straight_to_post_test(ac, admin):
    await _set_protocol(ac, admin, GROUP_ONLY["natural_control"], total_rounds=4)
    p = await _participant(ac)
    await _finish(ac, (await _start(ac, p["id"]))["id"])
    await _assign(ac, admin)
    assert (await _lookup(ac, p["participant_code"]))["next_round"] == 4
    s = await _start(ac, p["id"])
    assert (s["round_number"], s["stages"], s["more_rounds"]) == (4, ["ptsot", "done"], False)


@pytest.mark.asyncio
async def test_admin_schedule_controls_every_session(ac, admin):
    schedule = {
        "session_1": {"stages": ["demographics", "ptsot", "lego"], "feedback": ["lego"]},  # no hints in session 1
        "groups": {
            "control": [
                {"stages": ["ptsot", "lego"], "feedback": ["lego"]},   # hints only here
                {"stages": ["ptsot"], "feedback": []},
            ],
            "natural_control": [
                {"stages": ["spatial_experience"], "feedback": []},    # comes in for session 2
                {"stages": ["ptsot"], "feedback": []},
            ],
        },
    }
    saved = (await _set_protocol(ac, admin, GROUP_ONLY["control"], schedule=schedule))["round_schedule"]
    assert saved["session_1"] == {"stages": ["demographics", "ptsot", "lego"], "feedback": []}
    recommended = (await ac.get("/api/v1/admin/protocol/recommended-schedule?total_rounds=3", headers=admin)).json()
    assert saved["groups"]["experimental"] == recommended["groups"]["experimental"]

    p = await _participant(ac, "Ravi", "9")
    assert await _finish(ac, (await _start(ac, p["id"]))["id"]) == ["demographics", "ptsot", "lego", "done"]
    await _assign(ac, admin)
    expected = [(["ptsot", "lego", "done"], True), (["ptsot", "done"], False)]
    for stages, lego_hints in expected:
        s = await _start(ac, p["id"])
        assert s["stages"] == stages
        assert (await ac.get(f"/api/v1/sessions/{s['id']}/task-config/lego")).json()["ai_hints_enabled"] is lego_hints
        await _finish(ac, s["id"])

    await _set_protocol(ac, admin, GROUP_ONLY["natural_control"], schedule=schedule)
    n = await _participant(ac, "Meera", "10")
    await _finish(ac, (await _start(ac, n["id"]))["id"])
    await _assign(ac, admin)
    rounds = []
    for _ in range(2):
        s = await _start(ac, n["id"])
        rounds.append((s["round_number"], s["stages"]))
        await _finish(ac, s["id"])
    assert rounds == [(2, ["spatial_experience", "done"]), (3, ["ptsot", "done"])]


@pytest.mark.asyncio
async def test_unfinished_session_is_resumed_not_restarted(ac, admin):
    p = await _participant(ac)
    s = await _start(ac, p["id"])
    await _complete(ac, s["id"], "intake_consent")
    resumed = await _start(ac, p["id"])
    assert resumed["id"] == s["id"] and resumed["current_stage"] == "demographics"


@pytest.mark.asyncio
async def test_unknown_code_is_rejected(ac):
    assert (await ac.post("/api/v1/participants/lookup", json={"code": "ZZZZZZ"})).status_code == 404


@pytest.mark.asyncio
async def test_group_split_must_total_100(ac, admin):
    res = await ac.put("/api/v1/admin/protocol", headers=admin, json={
        "condition_split": {"experimental": 50, "control": 30, "natural_control": 10},
        "ptsot_config": {}, "perspective_config": {}, "lego_config": {},
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_admin_api_rejects_missing_or_forged_tokens(ac):
    assert (await ac.get("/api/v1/admin/protocol")).status_code == 401
    assert (await ac.post("/api/v1/admin/assign-groups")).status_code == 401
    forged = {"Authorization": "Bearer 9999999999.not-a-signature"}
    assert (await ac.get("/api/v1/admin/exports/participants", headers=forged)).status_code == 401
