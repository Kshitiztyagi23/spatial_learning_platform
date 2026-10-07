from app.api.v1.lego import score_lego_results
from app.models.protocol import normalize_stages, normalize_puzzle_ids
from app.schemas.lego import LegoPuzzleResult


def _r(solved: bool, checks: int) -> LegoPuzzleResult:
    return LegoPuzzleResult(puzzle_id="p", solved=solved, checks=checks, placements=0)


def test_stages_reordered_with_done_last():
    assert normalize_stages(["demographics", "done", "spatial_experience"]) == [
        "demographics", "spatial_experience", "done"
    ]


def test_demographics_always_enabled():
    assert normalize_stages(["intake_consent", "lego"]) == ["intake_consent", "demographics", "lego", "done"]


def test_unknown_stages_dropped():
    assert normalize_stages(["bogus", "ptsot"]) == ["demographics", "ptsot", "done"]


def test_puzzle_ids_lose_file_prefix():
    assert normalize_puzzle_ids(["07-easy-01", "tut-01", "12-d-01"]) == ["easy-01", "tut-01", "d-01"]


def test_lego_scoring():
    accuracy, efficiency = score_lego_results([_r(True, 1), _r(True, 3), _r(False, 2)], puzzle_count=4)
    assert accuracy == 0.5
    assert efficiency == 2 / 6


def test_lego_scoring_nothing_to_score():
    assert score_lego_results([], puzzle_count=0) == (None, None)
