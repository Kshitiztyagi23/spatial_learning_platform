"""Park AI tutor: answers checked on the server, scene maps, and what a child may be shown."""
import json

import pytest

from app.core.config import settings
from app.api.v1 import feedback as feedback_api
from app.services import ai_feedback
from app.services.feedback_rules import Feedback
from app.services.park_scenarios import answer_relation, get_question, scenario_photos
from app.services.park_tutor import build_context, safe_hint, tutor_hint
from tests.test_study_flow import (  # noqa: F401  (fixtures)
    GROUP_ONLY, _assign, _finish, _participant, _set_protocol, _start, ac, admin, admin_passcode,
)

RULE = Feedback("perspective", "Imagine you are the character.", "park:rung1")
MAP = "OBJECTS: swing, see-saw, monkey bar, slide."


def test_questions_and_relations_come_from_the_shared_file():
    scenario, question = get_question("scenario_1_q_1")
    assert scenario["id"] == 1 and question["correctAnswer"] == "Right"
    assert get_question("scenario_1_q_99") is None and get_question("bad") is None
    assert [answer_relation(a, "Right") for a in ("Right", "Left", "Front")] == ["correct", "opposite", "adjacent"]
    assert scenario_photos(1) and not scenario_photos(2)


def test_hints_naming_a_direction_are_rejected():
    assert safe_hint("Picture standing at the swing, facing the slide.", "Right")
    for bad in ["Turn to your right and look again.", "The see-saw is behind you.",
                "Think about what is in front of C.", "Great job!"]:
        assert safe_hint(bad, "Right") is None, bad


def _enable(monkeypatch, reply=None, vision_reply=None):
    sent = []

    async def fake(system, user):
        sent.append(json.loads(user))
        return reply, "fake-model"

    async def fake_vision(system, user, images):
        sent.append({"user": user, "images": len(images)})
        return vision_reply, "fake-vision"

    monkeypatch.setattr(settings, "ai_feedback_enabled", True)
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "ai_api_key", "k")
    monkeypatch.setattr(settings, "ai_model", "m")
    monkeypatch.setitem(ai_feedback.PROVIDERS, "openai", fake)
    monkeypatch.setitem(ai_feedback.VISION_PROVIDERS, "openai", fake_vision)
    return sent


@pytest.mark.asyncio
async def test_tutor_uses_the_models_hint_and_mistake_label(monkeypatch):
    _enable(monkeypatch, '{"hint": "Stand at the swing and face the monkey bar.", '
                         '"mistake_type": "own_view", "strategy": "take her place"}')
    _, question = get_question("scenario_1_q_1")
    context = build_context(MAP, question, ["Left"], [], [])
    assert context["child_answers"] == [{"answer": "Left", "relation": "opposite"}]
    hint = await tutor_hint(context, RULE)
    assert (hint.generated_by, hint.mistake_type, hint.strategy) == ("ai", "own_view", "take her place")


@pytest.mark.asyncio
@pytest.mark.parametrize("reply", ["no json", '{"hint": "It is on your right side."}', '{"hint": ""}'])
async def test_bad_tutor_replies_fall_back_to_the_rule_hint(monkeypatch, reply):
    _enable(monkeypatch, reply)
    _, question = get_question("scenario_1_q_1")
    hint = await tutor_hint(build_context(MAP, question, ["Left"], [], []), RULE)
    assert (hint.message, hint.generated_by) == (RULE.message, "rule")


@pytest.mark.asyncio
async def test_scene_map_is_drafted_approved_then_briefs_the_tutor(ac, admin, monkeypatch):
    monkeypatch.setattr(feedback_api, "COOLDOWN_SECONDS", 0)
    sent = _enable(monkeypatch, '{"hint": "Stand at the swing and face the monkey bar.", '
                                '"mistake_type": "left_right", "strategy": "swap sides"}', MAP)
    maps = (await ac.get("/api/v1/admin/park/maps", headers=admin)).json()
    assert maps[0] == {**maps[0], "scenario_id": 1, "has_photos": True, "map": None}
    assert (await ac.get("/api/v1/admin/park/maps")).status_code in (401, 403)

    draft = (await ac.post("/api/v1/admin/park/maps/1/generate", headers=admin)).json()
    assert draft["map"]["status"] == "draft" and sent[-1]["images"] == len(scenario_photos(1))
    assert (await ac.post("/api/v1/admin/park/maps/2/generate", headers=admin)).status_code == 502  # no photos

    # A student in the feedback group gets a hint; the draft map isn't used yet
    await _set_protocol(ac, admin, GROUP_ONLY["experimental"])
    p = await _participant(ac)
    await _finish(ac, (await _start(ac, p["id"]))["id"])
    await _assign(ac, admin)
    base = f"/api/v1/sessions/{(await _start(ac, p['id']))['id']}"
    await ac.post(f"{base}/perspective/answer", json={"stimulus_id": "scenario_1_q_1", "answer": "Left"})
    calls = len(sent)
    fb = (await ac.post(f"{base}/feedback", json={"task_type": "spatial_perspective_taking",
                                                  "item_id": "scenario_1_q_1"})).json()
    assert fb["shown"] and "scene_map" not in (sent[calls] if len(sent) > calls else {})

    edited = (await ac.put("/api/v1/admin/park/maps/1", headers=admin,
                           json={"map_text": MAP + " Checked.", "status": "approved"})).json()
    assert edited["map"]["status"] == "approved" and edited["map"]["approved_at"]

    await ac.post(f"{base}/perspective/answer", json={"stimulus_id": "scenario_1_q_2", "answer": "Front"})
    calls = len(sent)
    fb = (await ac.post(f"{base}/feedback", json={"task_type": "spatial_perspective_taking",
                                                  "item_id": "scenario_1_q_2"})).json()
    assert fb["shown"] and fb["message"] == "Stand at the swing and face the monkey bar."
    assert sent[calls]["scene_map"] == MAP + " Checked." and sent[calls]["child_answers"][0]["answer"] == "Front"
    assert sent[calls]["session_so_far"][0].startswith('Park scenario_1_q_1: answered Left; hint "')
