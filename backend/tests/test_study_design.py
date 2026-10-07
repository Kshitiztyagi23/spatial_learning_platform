import random

from app.services.study_design import (
    allocate_groups, default_schedule, first_round_stages, has_more_rounds,
    normalize_code, normalize_schedule, participant_progress, round_plan, round_type,
)

TRAINING = ["spatial_perspective_taking", "lego"]


def test_round_types():
    assert [round_type(r, 4) for r in (1, 2, 3, 4)] == ["pre", "training", "training", "post"]


def test_recommended_design():
    s = default_schedule(3)
    # Session 1 is the same for everyone, whatever the group, with no hints
    for group in ("unassigned", "experimental", "natural_control"):
        assert round_plan(s, group, 1) == {
            "stages": ["intake_consent", "demographics", "spatial_experience", "ptsot", "done"], "feedback": []
        }
    assert round_plan(s, "experimental", 2) == {"stages": TRAINING + ["done"], "feedback": TRAINING}
    assert round_plan(s, "control", 2) == {"stages": TRAINING + ["done"], "feedback": []}
    assert round_plan(s, "natural_control", 2)["stages"] == []          # skipped
    for group in ("experimental", "control", "natural_control"):
        assert round_plan(s, group, 3) == {"stages": ["ptsot", "done"], "feedback": []}


def test_normalize_repairs_a_bad_schedule():
    raw = {
        "session_1": {"stages": ["lego", "bogus"], "feedback": ["lego"]},
        "groups": {"experimental": [{"stages": ["demographics", "lego", "ptsot"], "feedback": ["lego", "ptsot"]}]},
    }
    s = normalize_schedule(raw, 3)
    assert s["session_1"] == {"stages": ["demographics", "lego"], "feedback": []}
    assert s["groups"]["experimental"][0] == {"stages": ["ptsot", "lego"], "feedback": ["lego"]}
    assert s["groups"]["experimental"][1] == default_schedule(3)["groups"]["experimental"][1]
    assert s["groups"]["control"] == default_schedule(3)["groups"]["control"]
    assert normalize_schedule("garbage", 2) == default_schedule(2)


def test_progress_through_the_study():
    s = default_schedule(4)
    assert participant_progress("unassigned", 0, s) == ("ready", 1)
    assert participant_progress("unassigned", 1, s) == ("waiting", None)
    assert [participant_progress("control", done, s) for done in (1, 2, 3, 4)] == [
        ("ready", 2), ("ready", 3), ("ready", 4), ("complete", None)
    ]
    assert participant_progress("natural_control", 1, s) == ("ready", 4)
    assert has_more_rounds("unassigned", 1, s) is True
    assert has_more_rounds("control", 4, s) is False


def test_first_round_stages():
    assert first_round_stages(default_schedule(3))[-1] == "done"


def test_allocation_matches_split_exactly():
    ids = [str(i) for i in range(10)]
    out = allocate_groups(ids, {"experimental": 34, "control": 33, "natural_control": 33}, random.Random(1))
    counts = sorted(list(out.values()).count(c) for c in ("experimental", "control", "natural_control"))
    assert counts == [3, 3, 4] and set(out) == set(ids)
    assert set(allocate_groups(ids, {"experimental": 0, "control": 100, "natural_control": 0}).values()) == {"control"}
    assert allocate_groups([], {"experimental": 50, "control": 50, "natural_control": 0}) == {}


def test_typed_codes_are_forgiving():
    assert normalize_code(" k7q-2xm ") == "K7Q2XM"
