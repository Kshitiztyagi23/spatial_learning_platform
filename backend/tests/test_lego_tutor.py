"""LEGO AI tutor: what the model sees, and what a child may be shown."""
import json

import pytest

from app.core.config import settings
from app.services import ai_feedback
from app.services.feedback_rules import Feedback
from app.services.lego_engine import check, get_puzzle
from app.services.lego_tutor import bricks_left, build_context, safe_hint, tutor_hint, view_grids

RULE = Feedback("dimension", "Look at the side view. Count the layers.", "lego:height-wrong:rung1")


def test_grids_match_the_view_cards():
    # tut-02: a 2x4 yellow on the board with a 2x2 red on top (spec orientation)
    puzzle = get_puzzle("tut-02")
    target, child = view_grids(puzzle["solution"], puzzle)
    assert target == child
    assert target["front"] == ["RR", "YY"]          # red layer above yellow
    assert all(len(set(map(len, rows))) == 1 for rows in target.values())


def test_child_grid_shows_the_missing_layer_and_tray():
    puzzle = get_puzzle("tut-02")
    placed = puzzle["solution"][:1]                  # only the yellow brick
    target, child = view_grids(placed, puzzle)
    assert target["front"] == ["RR", "YY"] and child["front"] == ["..", "YY"]
    assert bricks_left(placed, puzzle) == ["2x2 red x1"]


def test_unsafe_hints_are_rejected():
    assert safe_hint("Compare the top view's outline with your model.")
    for bad in [
        "Put the red brick on top of the yellow one.",
        "Move the blue block one step left.",
        "Look at row 2 of the front view.",
        "The gap is at 1,2 in the top view.",
        "Great, now check the side view!",
    ]:
        assert safe_hint(bad) is None, bad


def _context():
    puzzle = get_puzzle("tut-02")
    placed = puzzle["solution"][:1]
    return build_context(puzzle, {**check(placed, puzzle), "placed": placed}, 2, [], ["LEGO tut-01: solved"])


def _enable(monkeypatch, reply):
    sent = []

    async def fake(system, user):
        sent.append(json.loads(user))
        return reply, "fake-model"

    monkeypatch.setattr(settings, "ai_feedback_enabled", True)
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "ai_api_key", "k")
    monkeypatch.setattr(settings, "ai_model", "m")
    monkeypatch.setitem(ai_feedback.PROVIDERS, "openai", fake)
    return sent


@pytest.mark.asyncio
async def test_tutor_hint_uses_the_models_decision(monkeypatch):
    sent = _enable(monkeypatch, '```json\n{"hint": "Your model is shorter than the side view shows.", '
                                '"focus_view": "side", "strategy": "compare heights"}\n```')
    hint = await tutor_hint(_context(), RULE)
    assert (hint.message, hint.generated_by, hint.strategy, hint.focus_view) == (
        "Your model is shorter than the side view shows.", "ai", "compare heights", "side")
    assert sent[0]["child_views"]["front"] == ["..", "YY"] and sent[0]["session_so_far"] == ["LEGO tut-01: solved"]


@pytest.mark.asyncio
@pytest.mark.parametrize("reply", [
    "not json at all",
    '{"hint": "Put the red brick on top.", "focus_view": "front", "strategy": "x"}',   # gives it away
    '{"hint": "", "strategy": "x"}',
])
async def test_bad_or_unsafe_replies_fall_back_to_the_rule(monkeypatch, reply):
    _enable(monkeypatch, reply)
    hint = await tutor_hint(_context(), RULE)
    assert (hint.message, hint.generated_by) == (RULE.message, "rule")
