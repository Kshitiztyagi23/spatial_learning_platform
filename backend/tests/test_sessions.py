import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def _create_test_session(ac: AsyncClient) -> str:
    part_resp = await ac.post("/api/v1/participants/", json={
        "name": "Test User",
        "age": 14,
        "gender": "female",
        "grade": "Grade 8",
        "section": "B",
        "roll_no": "24",
        "consent": True
    })
    participant_id = part_resp.json()["id"]
    sess_resp = await ac.post("/api/v1/sessions/", json={
        "participant_id": participant_id
    })
    assert sess_resp.status_code == 200
    return sess_resp.json()["id"]

@pytest.mark.asyncio
async def test_create_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        session_id = await _create_test_session(ac)
        assert session_id is not None

@pytest.mark.asyncio
async def test_get_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        session_id = await _create_test_session(ac)
        response = await ac.get(f"/api/v1/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert "participant_id" in data

@pytest.mark.asyncio
async def test_next_stage():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        session_id = await _create_test_session(ac)
        response = await ac.get(f"/api/v1/sessions/{session_id}/next-stage")
        assert response.status_code == 200
        assert response.json()["stage_name"] == "demographics"
