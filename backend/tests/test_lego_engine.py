"""The Python LEGO engine must agree with the browser's TypeScript engine.

The fixture holds 343 builds across all 21 puzzles (solutions, shifted
solutions, empty boards, missing/moved/raised/rotated/recoloured bricks,
swapped colours) with the result check.ts gave for each.
"""
import json
from pathlib import Path

import pytest

from app.services.lego_engine import check, get_puzzle, load_puzzles

GOLDEN = json.loads((Path(__file__).parent / "fixtures" / "lego_ts_golden.json").read_text())["cases"]


def _comparable(result: dict) -> dict:
    out = json.loads(json.dumps(result))
    for d in out["diagnoses"]:
        if d.get("region") is None:
            d.pop("region", None)   # TS omits undefined regions
    return out


@pytest.mark.parametrize("case", GOLDEN, ids=[c["name"] for c in GOLDEN])
def test_matches_typescript_engine(case):
    assert _comparable(check(case["placed"], get_puzzle(case["puzzle_id"]))) == case["expected"]


def test_every_puzzle_loads_and_its_solution_is_solved():
    puzzles = load_puzzles()
    assert len(puzzles) == 21
    for puzzle in puzzles.values():
        assert check(puzzle["solution"], puzzle)["outcome"] == "solved"
