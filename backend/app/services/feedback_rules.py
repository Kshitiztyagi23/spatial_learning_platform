"""Rule-based feedback: which message a participant sees, and when.

All wording lives here so researchers can review and change it in one place.
Bump RULE_VERSION whenever a message or rule changes; it is stored with every
feedback event so analyses can tell rule sets apart.

Wording follows the LEGO spec's writing rules (docs/lego-task/SPEC.md §9):
short, says what to do, no praise, no exclamation marks, under 12 words.
"""
from dataclasses import dataclass

RULE_VERSION = "v1"

# Minimum gap between two hints in the same task, so rapid repeated Checks
# don't produce a burst of messages.
COOLDOWN_SECONDS = 3


@dataclass(frozen=True)
class Feedback:
    feedback_type: str
    message: str
    trigger_reason: str


# LEGO: one message per diagnosis code from frontend core/diagnose.ts.
LEGO_DIAGNOSIS_MESSAGES = {
    "brick-count-low": "Some bricks are still in the tray.",
    "brick-count-high": "You used more bricks than the model has.",
    "footprint-wrong": "Look at the top view. The outline is different.",
    "height-wrong": "Look at the side view. Count the layers.",
    "shape-right-colour-wrong": "The shape is right. The colours aren't.",
    "colour-swap": "The colours are right but in the wrong places.",
    "hidden-brick": "The views match. A brick inside is different.",
}

VIEW_NAMES = {"front": "front", "right": "side", "top": "top"}
AREA_NAMES = {"left": "the left side", "right": "the right side", "middle": "the middle"}

PERSPECTIVE_WRONG_MESSAGE = "Imagine standing where the character is, facing the same way."


def lego_feedback(attempt: int, diagnoses: list[dict]) -> Feedback | None:
    """Hint ladder: failed check n shows diagnosis n (ranked coarse to fine),
    staying on the finest one after that. Never names a brick."""
    if attempt < 1 or not diagnoses:
        return None
    rung = min(attempt, len(diagnoses)) - 1
    diagnosis = diagnoses[rung]
    code = diagnosis.get("code")

    if code == "region-mismatch":
        view = VIEW_NAMES.get(diagnosis.get("view") or "")
        if not view:
            return None
        area = AREA_NAMES.get(diagnosis.get("area") or "")
        message = f"In the {view} view, look at {area}." if area else f"Look closely at the {view} view."
        return Feedback("region", message, f"lego:{code}:{view}:rung{rung + 1}")

    message = LEGO_DIAGNOSIS_MESSAGES.get(code or "")
    if not message:
        return None
    return Feedback("dimension", message, f"lego:{code}:rung{rung + 1}")


def perspective_feedback(correct: bool) -> Feedback | None:
    if correct:
        return None
    return Feedback("directional", PERSPECTIVE_WRONG_MESSAGE, "perspective:wrong_answer")
