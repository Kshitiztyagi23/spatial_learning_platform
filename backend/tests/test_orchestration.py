import pytest
from app.services.orchestration import get_next_stage, advance_session_stage
from app.models.session import Session

def test_stage_sequence():
    assert get_next_stage("intake_consent") == "demographics"
    assert get_next_stage("demographics") == "spatial_experience"
    assert get_next_stage("spatial_experience") == "ptsot"
    assert get_next_stage("ptsot") == "spatial_perspective_taking"
    assert get_next_stage("spatial_perspective_taking") == "lego"
    assert get_next_stage("lego") == "done"
    assert get_next_stage("done") is None

def test_advance_stage():
    session = Session(current_stage="intake_consent", condition="control")
    
    # Valid advance
    next_stage = advance_session_stage(session, "intake_consent")
    assert next_stage == "demographics"
    assert session.current_stage == "demographics"
    
    # Invalid advance (mismatch)
    with pytest.raises(ValueError, match="Stage mismatch"):
        advance_session_stage(session, "intake_consent")
