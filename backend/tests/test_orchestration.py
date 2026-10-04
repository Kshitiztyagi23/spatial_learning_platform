import pytest
from app.services.orchestration import get_next_stage, assign_condition, advance_session_stage
from app.models.session import Session

def test_stage_sequence():
    assert get_next_stage("intake_consent") == "demographics"
    assert get_next_stage("demographics") == "spatial_experience"
    assert get_next_stage("spatial_experience") == "ptsot"
    assert get_next_stage("ptsot") == "lego"
    assert get_next_stage("lego") == "done"
    assert get_next_stage("done") is None

def test_assign_condition():
    conditions = [assign_condition() for _ in range(100)]
    assert "experimental" in conditions
    assert "control" in conditions
    for c in conditions:
        assert c in ["experimental", "control"]

def test_advance_stage():
    session = Session(current_stage="intake_consent", condition="control")
    
    # Valid advance
    next_stage = advance_session_stage(session, "intake_consent")
    assert next_stage == "demographics"
    assert session.current_stage == "demographics"
    
    # Invalid advance (mismatch)
    with pytest.raises(ValueError, match="Stage mismatch"):
        advance_session_stage(session, "intake_consent")
