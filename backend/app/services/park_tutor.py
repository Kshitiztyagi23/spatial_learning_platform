"""AI tutor for the park perspective task.

1. Once per scenario, the model looks at the scene photos and writes a text
   layout map; a researcher checks and approves it in the admin console.
2. For each hint, the model gets the approved map, the question, the
   child's wrong answers, the correct answer and the session history, and
   decides the hint. It must never name a direction: any hint containing
   left/right/front/behind is rejected and the rule hint is used instead.
"""
import json
import logging
import re
from dataclasses import dataclass

from app.core.config import settings
from app.services import ai_feedback
from app.services.ai_feedback import AIUnavailable, clean_hint
from app.services.feedback_rules import Feedback
from app.services.park_scenarios import answer_relation, scenario_photos

log = logging.getLogger(__name__)

PARK_PROMPT_VERSION = "park-v1"
MAP_PROMPT_VERSION = "map-v1"

_PHOTO_CAPTIONS = {
    "main_view_1": "Main view 1 (overall scene)",
    "main_view_2": "Main view 2 (another angle)",
    "perspective_a": "What character A sees",
    "perspective_b": "What character B sees",
    "perspective_c": "What character C sees",
    "perspective_d": "What character D sees",
}

MAP_SYSTEM_PROMPT = """You turn photos of a park scene into a written layout map that another assistant will use to help children answer questions like "If C stands at the swing facing the monkey bar, where is the see-saw?" (answers are Left, Right, Front or Behind).

Write plain text, at most 350 words, with these sections:
OBJECTS: every labelled object, one per line.
OVERHEAD LAYOUT: where each object sits as if seen from above, using the first main view as reference (say what is near, far, to the left and to the right in that photo, and which objects are next to each other).
VIEWPOINTS: for each character A-D, where they stand and what they face, if the photos show it.
UNCERTAIN: anything the photos don't make clear.

Describe only what the photos show. Do not answer any question."""

TUTOR_SYSTEM_PROMPT = """You are a patient tutor for a child aged 10 to 14 doing a perspective task in a park: imagine standing at one object, facing another, and say where a third object is (Left, Right, Front or Behind).

You get JSON with: scene_map (the park layout), question, correct_answer, child_answers (their wrong answers so far, with how each relates to the correct one: "opposite" means left/right or front/behind reversed), hints_so_far on this question, and session_so_far.

Work out why the child is probably wrong, for example answering from their own point of view instead of the character's, or mixing up left and right. Then write one hint that helps them imagine the character's view.

Rules for the hint:
- One sentence, at most 12 words, plain words a 10-year-old reads easily.
- Never use the words left, right, front or behind, and never give the answer.
- You may name objects from the scene and say what the character is facing.
- If an earlier hint did not help, try a different way. Do not repeat it.
- No praise, no exclamation marks, no emoji, no questions back to the child.

Reply with JSON only: {"hint": "...", "mistake_type": "own_view" | "left_right" | "front_behind" | "other", "strategy": "a 2-4 word label"}"""

_DIRECTION_WORDS = re.compile(r"\b(left|right|front|behind)\b", re.I)
MISTAKE_TYPES = ("own_view", "left_right", "front_behind", "other")


@dataclass(frozen=True)
class ParkHint:
    message: str
    generated_by: str
    model: str | None = None
    strategy: str | None = None
    mistake_type: str | None = None


# ---- scene maps ---------------------------------------------------------------------

async def generate_scene_map(scenario: dict) -> tuple[str, str]:
    """(map text, model) from the scenario's photos. Raises AIUnavailable."""
    photos = scenario_photos(scenario["id"])
    if not photos:
        raise AIUnavailable("this scenario has no photos yet")
    captions = [f"Photo {i + 1}: {_PHOTO_CAPTIONS.get(p.stem, p.stem)}" for i, p in enumerate(photos)]
    questions = "\n".join(f"- {q['text']}" for q in scenario["questions"])
    user = (
        f"Scene: {scenario['title']}\n\nThe photos, in order:\n" + "\n".join(captions)
        + f"\n\nObjects the questions mention:\n{questions}"
    )
    images = [("image/jpeg", p.read_bytes()) for p in photos]
    text, model = await ai_feedback.VISION_PROVIDERS[settings.ai_provider](MAP_SYSTEM_PROMPT, user, images)
    if not text.strip():
        raise AIUnavailable("empty map")
    return text.strip(), model


# ---- hints ----------------------------------------------------------------------------

def build_context(scene_map: str, question: dict, wrong_answers: list[str], hints: list[str], history: list[str]) -> dict:
    correct = question["correctAnswer"]
    return {
        "scene_map": scene_map,
        "question": question["text"],
        "correct_answer": correct,
        "child_answers": [{"answer": a, "relation": answer_relation(a, correct)} for a in wrong_answers],
        "hints_so_far": hints,
        "session_so_far": history,
    }


def safe_hint(text: str, correct_answer: str) -> str | None:
    sentence = clean_hint(text)
    if not sentence or _DIRECTION_WORDS.search(sentence) or correct_answer.lower() in sentence.lower():
        return None
    return sentence


def _parse(reply: str) -> dict | None:
    match = re.search(r"\{.*\}", reply or "", re.S)
    try:
        data = json.loads(match.group(0)) if match else None
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


async def tutor_hint(context: dict, fallback: Feedback) -> ParkHint:
    rule = ParkHint(fallback.message, "rule")
    if not ai_feedback.ai_status()["enabled"]:
        return rule
    try:
        reply, model = await ai_feedback.PROVIDERS[settings.ai_provider](TUTOR_SYSTEM_PROMPT, json.dumps(context))
    except AIUnavailable as e:
        log.warning("Park tutor unavailable (%s); using rule hint", e)
        return rule
    data = _parse(reply)
    sentence = safe_hint(str(data.get("hint", "")), context["correct_answer"]) if data else None
    if not sentence:
        log.info("Park tutor reply rejected: %r", reply)
        return rule
    mistake = data.get("mistake_type") if data.get("mistake_type") in MISTAKE_TYPES else None
    return ParkHint(sentence, "ai", model, str(data.get("strategy") or "")[:40] or None, mistake)
