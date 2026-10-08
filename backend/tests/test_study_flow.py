"""End-to-end study flow: session 1 for everyone, researcher assigns groups,
later sessions per group, then the exports."""
import csv
import io

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.core.config import settings
from app.main import app

SESSION_1 = ["intake_consent", "demographics", "spatial_experience", "ptsot", "window_test", "done"]
POST_TEST = ["ptsot", "window_test", "done"]

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
    assert (s3["round_number"], s3["stages"], s3["more_rounds"]) == (3, POST_TEST, False)
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
    assert (s["round_number"], s["stages"], s["more_rounds"]) == (4, POST_TEST, False)


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


@pytest.mark.asyncio
async def test_window_test_selection_scoring_and_late_answer_key(ac, admin, monkeypatch):
    from app.services import window_test

    res = await ac.put("/api/v1/admin/protocol", headers=admin, json={
        "condition_split": GROUP_ONLY["control"],
        "window_config": {"selected_questions": ["hard-03", "easy-01", "bogus"], "time_limit_seconds": 240},
        "ptsot_config": {}, "perspective_config": {}, "lego_config": {},
    })
    # Unknown ids dropped, bank order kept
    assert res.json()["window_config"]["selected_questions"] == ["easy-01", "hard-03"]
    catalog = (await ac.get("/api/v1/admin/catalogs", headers=admin)).json()["window_questions"]
    assert len(catalog) == 24 and {q["set"] for q in catalog} == {"easy", "hard"}

    p = await _participant(ac)
    s = await _start(ac, p["id"])
    cfg = (await ac.get(f"/api/v1/sessions/{s['id']}/task-config/window_test")).json()
    assert (cfg["selected_questions"], cfg["time_limit_seconds"]) == (["easy-01", "hard-03"], 240)

    # Answer recorded before the key exists: stored, not scored. The client
    # can't supply the correct answer itself.
    before = (await ac.post(f"/api/v1/sessions/{s['id']}/trials", json={
        "task_type": "window_test", "trial_number": 1, "stimulus_id": "easy-01",
        "response_value": "B", "correct_response": "B", "reaction_time_ms": 5000,
    })).json()
    assert before["correct"] is None

    # Key filled in later: new answers are scored, and the export re-scores old ones
    monkeypatch.setitem(window_test.WINDOW_ANSWER_KEY, "easy-01", "B")
    monkeypatch.setitem(window_test.WINDOW_ANSWER_KEY, "hard-03", "C")
    after = (await ac.post(f"/api/v1/sessions/{s['id']}/trials", json={
        "task_type": "window_test", "trial_number": 2, "stimulus_id": "hard-03",
        "response_value": "A", "reaction_time_ms": 7000,
    })).json()
    assert after["correct"] is False

    rows = _rows((await ac.get("/api/v1/admin/exports/window_trials", headers=admin)).text)
    assert [(r["question_id"], r["question_set"], r["correct_answer"], r["response"], r["correct"]) for r in rows] == [
        ("easy-01", "easy", "B", "B", "True"),
        ("hard-03", "hard", "C", "A", "False"),
    ]


@pytest.mark.asyncio
async def test_intake_does_the_details_form_in_one_request(ac, admin):
    res = await ac.post("/api/v1/participants/intake", json={
        "name": "Asha Rao", "age": 12, "gender": "female", "grade": "Grade 7",
        "section": "A", "roll_no": "7", "consent": True,
        "demographics": {"grade": "Grade 7", "section": "A"},
    })
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["participant"]["condition"] == "unassigned" and len(body["participant"]["participant_code"]) == 6
    s = body["session"]
    # Consent and details are already recorded; the student continues at the survey
    assert (s["round_number"], s["current_stage"]) == (1, "spatial_experience")
    assert await _finish(ac, s["id"]) == ["spatial_experience", "ptsot", "window_test", "done"]
    # Same student submitting again gets a new participant record, not a clash
    again = await ac.post("/api/v1/participants/intake", json={
        "name": "Asha Rao", "age": 12, "gender": "female", "grade": "Grade 7",
        "section": "A", "roll_no": "7", "consent": True,
    })
    assert again.status_code == 200


@pytest.mark.asyncio
async def test_intake_retries_when_a_code_clashes(ac, monkeypatch):
    from app.api.v1 import participants as module
    first = (await ac.post("/api/v1/participants/intake", json={
        "name": "First", "age": 12, "gender": "female", "grade": "Grade 7", "section": "A", "roll_no": "1", "consent": True,
    })).json()["participant"]["participant_code"]
    codes = iter([first, "ZZZZZZ"])          # first try clashes, second is fresh
    monkeypatch.setattr(module, "generate_participant_code", lambda: next(codes))
    res = await ac.post("/api/v1/participants/intake", json={
        "name": "Second", "age": 12, "gender": "female", "grade": "Grade 7", "section": "A", "roll_no": "2", "consent": True,
    })
    assert res.status_code == 200 and res.json()["participant"]["participant_code"] == "ZZZZZZ"


@pytest.mark.asyncio
async def test_active_session_gates_who_can_start_and_labels_the_data(ac, admin):
    async def set_today(active, label):
        await _set_protocol(ac, admin, GROUP_ONLY["control"])
        res = await ac.put("/api/v1/admin/protocol", headers=admin, json={
            "condition_split": GROUP_ONLY["control"], "total_rounds": 3,
            "active_round": active, "run_label": label,
            "ptsot_config": {}, "perspective_config": {}, "lego_config": {},
        })
        assert res.status_code == 200, res.text
        assert (res.json()["active_round"], res.json()["run_label"]) == (active, label)

    intake = {"name": "Asha Rao", "age": 12, "gender": "female", "grade": "Grade 7",
              "section": "A", "roll_no": "7", "consent": True}

    # Session 1 day: new students can join; their sessions carry the label
    await set_today(1, "Session 1 - 15 Oct - School A")
    s1 = (await ac.post("/api/v1/participants/intake", json=intake)).json()
    code, sid = s1["participant"]["participant_code"], s1["session"]["id"]
    await _finish(ac, sid)
    await _assign(ac, admin)
    found = await _lookup(ac, code)
    assert (found["status"], found["next_round"], found["active_round"]) == ("not_today", 2, 1)

    # Session 2 day: no new registrations; returning students start session 2
    await set_today(2, "Session 2 - 22 Oct - School A")
    blocked = await ac.post("/api/v1/participants/intake", json={**intake, "name": "Late"})
    assert blocked.status_code == 409 and "session 1" in blocked.json()["detail"]
    assert (await _lookup(ac, code))["status"] == "ready"
    pid = (await ac.get(f"/api/v1/sessions/{sid}")).json()["participant_id"]
    s2 = await _start(ac, pid)
    assert s2["round_number"] == 2

    # An unfinished session can always be finished, even if the day changes
    await set_today(3, None)
    assert (await _start(ac, pid))["id"] == s2["id"]
    await _finish(ac, s2["id"])
    assert (await _lookup(ac, code))["status"] == "ready"      # session 3 is running

    # Back to "any session": students continue at their own pace
    await set_today(None, None)
    assert (await _lookup(ac, code))["status"] == "ready"

    header = (await ac.get("/api/v1/admin/exports/ptsot_trials", headers=admin)).text.splitlines()[0]
    assert "round_number,session_label" in header
    sessions = (await ac.get("/api/v1/admin/sessions", headers=admin)).json()["sessions"]
    assert {s["round_number"]: s["session_label"] for s in sessions} == {
        1: "Session 1 - 15 Oct - School A", 2: "Session 2 - 22 Oct - School A",
    }

    # The running session can't be beyond the number of sessions
    bad = await ac.put("/api/v1/admin/protocol", headers=admin, json={
        "condition_split": GROUP_ONLY["control"], "total_rounds": 3, "active_round": 5,
        "ptsot_config": {}, "perspective_config": {}, "lego_config": {},
    })
    assert bad.status_code == 422
