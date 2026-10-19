"""AI tutor for LEGO: the model sees the target and the child's build as
text grids and decides the hint itself.

The server owns the facts (puzzle + the bricks from its own latest check);
the model decides what to say. Its reply is checked before a child sees it
(writing rules, no positions, no "move/put this brick"), and the rule-based
ladder hint is the fallback.
"""
import json
import logging
import re
from collections import Counter
from dataclasses import dataclass

from app.core.config import settings
from app.services import ai_feedback
from app.services.ai_feedback import AIUnavailable, clean_hint
from app.services.feedback_rules import Feedback
from app.services.lego_engine import VIEWS, align, project_colors, to_display_cell

log = logging.getLogger(__name__)

TUTOR_PROMPT_VERSION = "lego-v2"
COLOUR_LETTER = {"red": "R", "blue": "B", "yellow": "Y", "green": "G", "white": "W"}
VIEW_LABEL = {"front": "front", "right": "side", "top": "top"}

SYSTEM_PROMPT = """You are a patient tutor for a child aged 10 to 14 building a LEGO model from three flat views (front, side, top).

You get JSON describing:
- target_views and child_views: each view as rows of text, exactly as the child sees the view cards. Letters are brick colours (R red, B blue, Y yellow, G green, W white, # any colour), "." is empty. Front and side views: top row is the highest layer. Top view: top row is the back of the board. The side view is seen from the right.
- views_match: which of the child's views already match.
- problems: what the app found wrong, most general first.
- bricks_left: bricks still in the tray.
- failed_checks and hints_so_far on this puzzle, and session_so_far: earlier in today's session.

First compare the grids yourself and work out what is actually different: a missing or extra layer, a part that sticks out, a gap, a different outline, colours mixed up, or a hidden brick inside. Decide the single most useful thing for the child to notice next, then write one hint that names that difference in child-friendly words.

Good hints (specific, but they do not give the answer):
- "Your model is one layer shorter than the side view shows."
- "Two colours are the wrong way round. Check the front view."
- "The top view is wider than your model at the back."
Bad hints:
- "Compare your front view with the target." (too vague: say what differs)
- "Put the red brick on the yellow one." (gives the answer)

Rules for the hint:
- One sentence, at most 12 words, plain words a 10-year-old reads easily.
- Point the child at what to compare or notice. Never give positions, rows, columns or coordinates, and never say which brick to move, add, remove or where to put it.
- If an earlier hint did not help, try a different way of looking. Do not repeat it.
- No praise, no exclamation marks, no emoji, no questions back to the child.

Reply with JSON only: {"hint": "...", "focus_view": "front" | "side" | "top" | "none", "strategy": "a 2-4 word label for your approach"}"""

# Hints that hand over the solution instead of pointing at it
_FORBIDDEN = [
    re.compile(r"\b(row|column|col)s?\b", re.I),
    re.compile(r"\d+\s*,\s*\d+"),
    re.compile(r"\b(put|place|move|swap|remove|add|take|shift|slide)\b.*\b(brick|block|piece)s?\b", re.I),
]


@dataclass(frozen=True)
class TutorHint:
    message: str
    generated_by: str              # "ai" or "rule"
    model: str | None = None
    strategy: str | None = None
    focus_view: str | None = None


def _grid(view_map: dict[str, str], view: str, board: dict, monochrome: bool, window: tuple) -> list[str]:
    r0, r1, c0, c1 = window
    rows = [["."] * (c1 - c0 + 1) for _ in range(r1 - r0 + 1)]
    for key, colour in view_map.items():
        r, c = to_display_cell(view, key, board)
        rows[r - r0][c - c0] = "#" if monochrome else COLOUR_LETTER.get(colour, "?")
    return ["".join(row) for row in rows]


def view_grids(placed: list[dict], puzzle: dict) -> tuple[dict, dict]:
    """Target and child views as text rows, the child's build shifted onto
    the target (where it sits on the board doesn't matter)."""
    board, mono = puzzle["board"], bool(puzzle.get("monochrome"))
    child_cells, target_cells = align(placed, puzzle["solution"])
    child, target = project_colors(child_cells), project_colors(target_cells)
    target_out, child_out = {}, {}
    for v in VIEWS:
        spots = [to_display_cell(v, k, board) for k in list(target[v]) + list(child[v])]
        window = (min(r for r, _ in spots), max(r for r, _ in spots), min(c for _, c in spots), max(c for _, c in spots))
        target_out[VIEW_LABEL[v]] = _grid(target[v], v, board, mono, window)
        child_out[VIEW_LABEL[v]] = _grid(child[v], v, board, mono, window)
    return target_out, child_out


def bricks_left(placed: list[dict], puzzle: dict) -> list[str]:
    left = Counter(b["typeId"] for b in puzzle["solution"]) - Counter(b["typeId"] for b in placed)
    return [f"{t.replace('-', ' ')} x{n}" for t, n in sorted(left.items())]


def build_context(puzzle: dict, check: dict, failed: int, hints: list[str], history: list[str]) -> dict:
    placed = check.get("placed", [])
    target, child = view_grids(placed, puzzle) if placed else ({}, {})
    return {
        "target_views": target,
        "child_views": child,
        "views_match": {VIEW_LABEL[v]: ok for v, ok in check.get("views", {}).items()},
        "problems": [
            {k: v for k, v in d.items() if k in ("code", "view", "area") and v}
            for d in check.get("diagnoses", [])
        ],
        "bricks_left": bricks_left(placed, puzzle),
        "failed_checks": failed,
        "hints_so_far": hints,
        "session_so_far": history,
    }


def safe_hint(text: str) -> str | None:
    sentence = clean_hint(text)
    if not sentence or any(p.search(sentence) for p in _FORBIDDEN):
        return None
    return sentence


def _parse(reply: str) -> dict | None:
    match = re.search(r"\{.*\}", reply or "", re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


async def tutor_hint(context: dict, fallback: Feedback) -> TutorHint:
    rule = TutorHint(fallback.message, "rule")
    if not ai_feedback.ai_status()["enabled"] or not context.get("target_views"):
        return rule
    try:
        reply, model = await ai_feedback.PROVIDERS[settings.ai_provider](SYSTEM_PROMPT, json.dumps(context))
    except AIUnavailable as e:
        log.warning("LEGO tutor unavailable (%s); using rule hint", e)
        return rule
    data = _parse(reply)
    sentence = safe_hint(str(data.get("hint", ""))) if data else None
    if not sentence:
        log.info("LEGO tutor reply rejected: %r", reply)
        return rule
    focus = data.get("focus_view") if data.get("focus_view") in ("front", "side", "top", "none") else None
    return TutorHint(sentence, "ai", model, str(data.get("strategy") or "")[:40] or None, focus)
