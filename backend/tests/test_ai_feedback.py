"""AI phrasing layer with fake providers (no network, no cost)."""
import json

import httpx
import pytest

from app.core.config import settings
from app.services import ai_feedback
from app.services.ai_feedback import AIUnavailable, ai_status, clean_hint, phrase_hint
from app.services.feedback_rules import Feedback

RULE = Feedback("directional", "Imagine standing where the character is, facing the same way.", "perspective:wrong_answer")


def configure(monkeypatch, provider="anthropic", key="test-key", model="", base_url=""):
    monkeypatch.setattr(settings, "ai_feedback_enabled", True)
    monkeypatch.setattr(settings, "ai_provider", provider)
    monkeypatch.setattr(settings, "ai_api_key", key)
    monkeypatch.setattr(settings, "ai_model", model)
    monkeypatch.setattr(settings, "ai_base_url", base_url)


def fake_provider(monkeypatch, reply=None, error=None):
    calls = []

    async def provider(system, user):
        calls.append(json.loads(user))
        if error:
            raise error
        return reply, "fake-model"

    monkeypatch.setitem(ai_feedback.PROVIDERS, settings.ai_provider, provider)
    return calls


def test_clean_hint_enforces_writing_rules():
    assert clean_hint(" Stand at the swing and face the monkey bars. ") == "Stand at the swing and face the monkey bars."
    assert clean_hint("Great job, try again.") is None              # praise
    assert clean_hint("Look again!") is None                          # exclamation
    assert clean_hint("Which way is the slide?") is None              # question back
    assert clean_hint("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen") is None
    assert clean_hint("") is None


def test_status_reports_configuration_without_the_key(monkeypatch):
    configure(monkeypatch, provider="anthropic", key="")
    assert ai_status() == {"enabled": False, "provider": "anthropic", "model": "claude-opus-5-5"}
    configure(monkeypatch, provider="openai", key="", model="llama3.1", base_url="http://localhost:11434/v1")
    assert ai_status() == {"enabled": True, "provider": "openai", "model": "llama3.1"}
    configure(monkeypatch, provider="openai", key="sk-x", model="")
    assert ai_status()["enabled"] is False                            # no model chosen


@pytest.mark.asyncio
async def test_unconfigured_uses_rule_text(monkeypatch):
    configure(monkeypatch, key="")
    hint = await phrase_hint("spatial_perspective_taking", RULE, {})
    assert (hint.message, hint.generated_by) == (RULE.message, "rule")


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["anthropic", "openai"])
async def test_ai_sentence_is_used_and_only_task_context_is_sent(monkeypatch, provider):
    configure(monkeypatch, provider=provider, model="some-model")
    calls = fake_provider(monkeypatch, reply="Stand at the yellow swing and face the monkey bars.")
    hint = await phrase_hint(
        "spatial_perspective_taking", RULE,
        {"question": "If C is at the yellow swing facing the monkey bar, where is the see-saw?",
         "answer": "Left", "name": "Asha Rao"},
    )
    assert (hint.message, hint.generated_by, hint.model) == (
        "Stand at the yellow swing and face the monkey bars.", "ai", "fake-model"
    )
    sent = calls[0]
    assert "Asha" not in json.dumps(sent) and "answer" not in sent
    assert sent["fixed_hint"] == RULE.message


@pytest.mark.asyncio
@pytest.mark.parametrize("reply, error", [
    ("Amazing work, look at the swing!", None),   # breaks writing rules
    (None, AIUnavailable("declined")),           # refusal / timeout / HTTP error
])
async def test_any_ai_problem_falls_back_to_rule_text(monkeypatch, reply, error):
    configure(monkeypatch)
    fake_provider(monkeypatch, reply=reply, error=error)
    hint = await phrase_hint("spatial_perspective_taking", RULE, {})
    assert (hint.message, hint.generated_by) == (RULE.message, "rule")


@pytest.mark.asyncio
async def test_lego_sends_only_the_diagnosis(monkeypatch):
    configure(monkeypatch)
    calls = fake_provider(monkeypatch, reply="Look at the side view and count the rows.")
    rule = Feedback("dimension", "Look at the side view. Count the layers.", "lego:height-wrong:rung1")
    hint = await phrase_hint("lego", rule, {"puzzle_id": "tut-01"}, {"code": "height-wrong", "view": None})
    assert hint.generated_by == "ai"
    assert calls[0]["what_is_wrong"] == {"code": "height-wrong"}


# ---- the OpenAI-compatible provider against a mock HTTP server ------------------

def mock_http(monkeypatch, handler):
    seen = []

    def wrapped(request: httpx.Request):
        seen.append(request)
        return handler(request)

    monkeypatch.setattr(ai_feedback, "_http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(wrapped)))
    return seen


@pytest.mark.asyncio
async def test_openai_compatible_request_shape(monkeypatch):
    configure(monkeypatch, provider="openai", key="sk-test", model="gemini-2.5-flash",
              base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    seen = mock_http(monkeypatch, lambda r: httpx.Response(200, json={
        "model": "gemini-2.5-flash",
        "choices": [{"message": {"content": "Picture yourself at the swing first."}, "finish_reason": "stop"}],
    }))
    hint = await phrase_hint("spatial_perspective_taking", RULE, {})
    assert (hint.message, hint.generated_by, hint.model) == ("Picture yourself at the swing first.", "ai", "gemini-2.5-flash")
    request = seen[0]
    assert str(request.url) == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert request.headers["Authorization"] == "Bearer sk-test"
    body = json.loads(request.content)
    assert body["model"] == "gemini-2.5-flash" and body["messages"][0]["role"] == "system"


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [
    httpx.Response(500, json={"error": "boom"}),
    httpx.Response(200, json={"unexpected": True}),
    httpx.Response(200, json={"choices": [{"message": {"content": "x"}, "finish_reason": "content_filter"}]}),
])
async def test_openai_compatible_failures_fall_back(monkeypatch, response):
    configure(monkeypatch, provider="openai", key="sk-test", model="gpt-x")
    mock_http(monkeypatch, lambda r: response)
    hint = await phrase_hint("spatial_perspective_taking", RULE, {})
    assert hint.generated_by == "rule"
