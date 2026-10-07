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


def test_angular_error_wraps_around():
    from app.services.scoring import angular_error
    assert angular_error("350", "10") == 20
    assert angular_error("90", "270") == 180
    assert angular_error("abc", "10") is None


def test_trial_scoring_per_task():
    from app.services.scoring import score_trial
    assert score_trial("ptsot", "5", "350") is True    # 15 deg apart across 0
    assert score_trial("ptsot", "5", "340") is False   # 25 deg is outside 22.5
    assert score_trial("spatial_perspective_taking", "left", "Left") is True
    assert score_trial("spatial_perspective_taking", "Right", "Left") is False
    assert score_trial("ptsot", "90", None) is None


def test_legacy_perspective_rows_recognised():
    from app.services.scoring import classify_trial_task
    assert classify_trial_task("ptsot", "Left") == "spatial_perspective_taking"
    assert classify_trial_task("ptsot", "123") == "ptsot"


def test_lego_hint_ladder_goes_coarse_to_fine():
    from app.services.feedback_rules import lego_feedback
    diagnoses = [
        {"code": "brick-count-low"},
        {"code": "height-wrong"},
        {"code": "region-mismatch", "view": "right", "area": "left"},
    ]
    assert lego_feedback(1, diagnoses).message == "Some bricks are still in the tray."
    assert lego_feedback(2, diagnoses).message == "Look at the side view. Count the layers."
    assert lego_feedback(3, diagnoses).message == "In the side view, look at the left side."
    # Stays on the finest hint after the ladder runs out
    assert lego_feedback(7, diagnoses).trigger_reason.endswith("rung3")
    assert lego_feedback(0, diagnoses) is None
    assert lego_feedback(1, []) is None


def test_hint_wording_follows_spec():
    from app.services.feedback_rules import LEGO_DIAGNOSIS_MESSAGES, PERSPECTIVE_WRONG_MESSAGE
    for message in [*LEGO_DIAGNOSIS_MESSAGES.values(), PERSPECTIVE_WRONG_MESSAGE]:
        assert len(message.split()) < 12
        assert "!" not in message


def test_perspective_hint_only_when_wrong():
    from app.services.feedback_rules import perspective_feedback
    assert perspective_feedback(True) is None
    assert perspective_feedback(False).feedback_type == "directional"
