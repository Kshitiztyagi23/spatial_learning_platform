"""End-of-session reports, the next session's tutor briefing, and the hint review list."""
import csv
import io
import json

import pytest

from app.api.v1 import feedback as feedback_api
from app.core.config import settings
from app.services import ai_feedback
from app.services.session_report import _parse_report
from tests.test_study_flow import (  # noqa: F401  (fixtures)
    GROUP_ONLY, _assign, _finish, _participant, _set_protocol, _start, ac, admin, admin_passcode,
)

REPORT = {"summary": "Accurate on PTSOT; reversed sides in the park task.", "strengths": ["PTSOT"],
          "difficulties": ["park"], "error_patterns": ["reverses sides"], "strategy_observations": [],
          "response_to_hints": "no hints", "next_focus": "Imagining the character's view."}


def test_report_reply_is_checked_and_trimmed():
    assert _parse_report("no json") is None and _parse_report('{"summary": ""}') is None
    parsed = _parse_report("```json\n" + json.dumps({**REPORT, "strengths": "not a list"}) + "\n```")
    assert parsed["summary"] == REPORT["summary"] and parsed["strengths"] == []


def _enable(monkeypatch):
    sent = []

    async def fake_text(system, user):
        sent.append(json.loads(user))
        return '{"hint": "Picture standing at the swing.", "mistake_type": "own_view", "strategy": "take her place"}', "fake"

    async def fake_slow(system, user, images):
        sent.append(json.loads(user))
        return json.dumps(REPORT), "fake-report"

    monkeypatch.setattr(settings, "ai_feedback_enabled", True)
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "ai_api_key", "k")
    monkeypatch.setattr(settings, "ai_model", "m")
    monkeypatch.setitem(ai_feedback.PROVIDERS, "openai", fake_text)
    monkeypatch.setitem(ai_feedback.VISION_PROVIDERS, "openai", fake_slow)
    monkeypatch.setattr(feedback_api, "COOLDOWN_SECONDS", 0)
    return sent


@pytest.mark.asyncio
async def test_report_is_made_when_a_session_ends_and_briefs_the_next_tutor(ac, admin, monkeypatch):
    await _set_protocol(ac, admin, GROUP_ONLY["experimental"])
    p = await _participant(ac)
    s1 = await _start(ac, p["id"])
    for n, (answer, correct) in enumerate([("10", "350"), ("90", "350")], start=1):
        await ac.post(f"/api/v1/sessions/{s1['id']}/trials", json={
            "task_type": "ptsot", "trial_number": n, "stimulus_id": f"ptsot_q{n}",
            "response_value": answer, "correct_response": correct, "reaction_time_ms": 4000,
        })
    await _finish(ac, s1["id"])   # AI is off: the background report has facts only

    listed = (await ac.get("/api/v1/admin/reports", headers=admin)).json()
    report = listed[0]["report"]
    assert listed[0]["participant_code"] == p["participant_code"] and report["status"] == "facts_only"
    assert report["facts"]["tasks"]["ptsot"] == {**report["facts"]["tasks"]["ptsot"],
                                                 "answered": 2, "correct": 1, "accuracy": 0.5,
                                                 "mean_angular_error_deg": 60.0}

    sent = _enable(monkeypatch)
    regenerated = (await ac.post(f"/api/v1/admin/reports/{s1['id']}/regenerate", headers=admin)).json()
    assert regenerated["status"] == "ready" and regenerated["report"]["summary"] == REPORT["summary"]
    assert "condition" not in json.dumps(sent[-1]) and p["participant_code"] not in json.dumps(sent[-1])

    # Next session: the tutor hears last session's summary
    await _assign(ac, admin)
    base = f"/api/v1/sessions/{(await _start(ac, p['id']))['id']}"
    await ac.post(f"{base}/perspective/answer", json={"stimulus_id": "scenario_1_q_1", "answer": "Left"})
    fb = (await ac.post(f"{base}/feedback", json={"task_type": "spatial_perspective_taking",
                                                  "item_id": "scenario_1_q_1"})).json()
    assert fb["shown"]
    assert sent[-1]["session_so_far"][0] == f"Last session: {REPORT['summary']}"

    review = (await ac.get("/api/v1/admin/feedback", headers=admin)).json()
    assert review[0] == {**review[0], "participant_code": p["participant_code"], "item_id": "scenario_1_q_1",
                         "task_type": "spatial_perspective_taking", "failed_tries": 1}
    assert (await ac.get("/api/v1/admin/feedback")).status_code in (401, 403)

    exported = (await ac.get("/api/v1/admin/exports/session_reports", headers=admin)).text
    rows = list(csv.DictReader(io.StringIO(exported)))
    assert rows[0]["summary"] == REPORT["summary"] and rows[0]["error_patterns"] == "reverses sides"
