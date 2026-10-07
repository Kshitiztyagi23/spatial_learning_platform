"""AI phrasing of feedback: rules decide WHAT to say, an AI model decides HOW.

The rule engine (feedback_rules.py) has already chosen the hint and its fixed
wording. The model rewrites it into one short, child-friendly sentence, using
the task context (e.g. the objects named in a park question). If anything
goes wrong (no provider configured, timeout, refusal, error, or output that
breaks the writing rules) the fixed rule text is shown instead, so a child
never waits on or sees a bad hint.

Providers (AI_PROVIDER in backend/.env):
  anthropic  Claude via the Anthropic SDK (AI_MODEL defaults to claude-opus-5-5)
  openai     any OpenAI-compatible chat completions API: OpenAI, Gemini's
             OpenAI endpoint, Groq, OpenRouter, Together, a local Ollama...
             Set AI_BASE_URL and AI_MODEL for the service you use.

Privacy: the model only receives the task context listed in `_context_for`,
never the participant's name, demographics, or the correct answer.
"""
import json
import logging
import re
from dataclasses import dataclass

import anthropic
import httpx

from app.core.config import settings
from app.services.feedback_rules import Feedback

log = logging.getLogger(__name__)

MAX_WORDS = 14
PRAISE_WORDS = {"great", "awesome", "nice", "perfect", "amazing", "excellent", "brilliant", "fantastic", "wonderful"}
DEFAULT_MODELS = {"anthropic": "claude-opus-5-5"}
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

SYSTEM_PROMPT = """You write one hint for a child aged 10 to 14 doing a spatial reasoning activity.

You are given the activity, what the child's answer got wrong (already worked out by the app), and a fixed hint. Rewrite the fixed hint so it is clearer and more concrete for this exact situation, for example by naming the objects or the view involved.

Rules:
- One sentence, at most 12 words, plain words a 10-year-old reads easily.
- Say what to look at or think about next. Point the child toward the idea; do not give the answer, a direction, or which brick is wrong.
- No praise, no exclamation marks, no emoji, no questions back to the child.
- Reply with the sentence only."""


class AIUnavailable(Exception):
    """The provider couldn't produce a usable reply; use the rule text."""


@dataclass(frozen=True)
class PhrasedHint:
    message: str
    generated_by: str          # "ai" or "rule"
    model: str | None = None


def active_model() -> str:
    return settings.ai_model or DEFAULT_MODELS.get(settings.ai_provider, "")


def ai_status() -> dict:
    """What the admin console shows about AI hints (never the key)."""
    provider = settings.ai_provider
    model = active_model()
    if provider == "anthropic":
        configured = bool(settings.ai_api_key)
    elif provider == "openai":
        configured = bool(model) and bool(settings.ai_api_key or settings.ai_base_url)
    else:
        configured = False
    return {
        "enabled": settings.ai_feedback_enabled and configured,
        "provider": provider,
        "model": model or None,
    }


# ---- providers ---------------------------------------------------------------

_anthropic_client: anthropic.AsyncAnthropic | None = None


async def _anthropic(system: str, user: str) -> tuple[str, str]:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(
            api_key=settings.ai_api_key,
            timeout=settings.ai_feedback_timeout_seconds,
            max_retries=0,  # a late hint is worse than the fixed one
        )
    try:
        response = await _anthropic_client.beta.messages.create(
            model=active_model(),
            max_tokens=1024,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.APIConnectionError as e:   # includes timeouts
        raise AIUnavailable(f"connection/timeout: {e}") from e
    except anthropic.RateLimitError as e:
        raise AIUnavailable("rate limited") from e
    except anthropic.APIStatusError as e:
        raise AIUnavailable(f"HTTP {e.status_code}: {e.message}") from e
    if response.stop_reason == "refusal":
        raise AIUnavailable("declined")
    text = "".join(block.text for block in response.content if block.type == "text")
    return text, response.model


def _http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=settings.ai_feedback_timeout_seconds)


async def _openai_compatible(system: str, user: str) -> tuple[str, str]:
    base_url = (settings.ai_base_url or DEFAULT_OPENAI_BASE_URL).rstrip("/")
    headers = {"Authorization": f"Bearer {settings.ai_api_key}"} if settings.ai_api_key else {}
    body = {
        "model": active_model(),
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    try:
        async with _http_client() as client:
            res = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError as e:
        raise AIUnavailable(f"{type(e).__name__}: {e}") from e
    try:
        choice = data["choices"][0]
        text = choice["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as e:
        raise AIUnavailable("unexpected response shape") from e
    if choice.get("finish_reason") == "content_filter":
        raise AIUnavailable("declined")
    return text, data.get("model") or active_model()


PROVIDERS = {"anthropic": _anthropic, "openai": _openai_compatible}


# ---- hint phrasing --------------------------------------------------------------

def _context_for(task_type: str, request_context: dict, diagnosis: dict | None) -> dict:
    """Only these fields ever leave the server."""
    if task_type == "lego":
        out = {"activity": "Rebuild a LEGO model from its front, side and top views."}
        if diagnosis:
            out["what_is_wrong"] = {k: v for k, v in diagnosis.items() if k in ("code", "view", "area") and v}
        return out
    out = {"activity": "Park perspective test: imagine standing at one object, facing another, and say where a third object is."}
    if isinstance(request_context.get("question"), str):
        out["question"] = request_context["question"][:300]
    out["what_is_wrong"] = "The child's direction was wrong. They may be answering from their own view, not the character's."
    return out


def clean_hint(text: str) -> str | None:
    """The model's sentence if it follows the writing rules, else None."""
    sentence = text.strip().strip('"').strip()
    if not sentence or "\n" in sentence or "!" in sentence or "?" in sentence:
        return None
    words = re.findall(r"[A-Za-z']+", sentence.lower())
    if not words or len(sentence.split()) > MAX_WORDS or PRAISE_WORDS & set(words):
        return None
    return sentence


async def phrase_hint(task_type: str, feedback: Feedback, request_context: dict, diagnosis: dict | None = None) -> PhrasedHint:
    fallback = PhrasedHint(feedback.message, "rule")
    if not ai_status()["enabled"]:
        return fallback

    payload = {**_context_for(task_type, request_context, diagnosis), "fixed_hint": feedback.message}
    try:
        text, model = await PROVIDERS[settings.ai_provider](SYSTEM_PROMPT, json.dumps(payload))
    except AIUnavailable as e:
        log.warning("AI hint unavailable (%s); using rule text", e)
        return fallback

    sentence = clean_hint(text)
    if not sentence:
        log.info("AI hint rejected by writing rules: %r", text)
        return fallback
    return PhrasedHint(sentence, "ai", model)
