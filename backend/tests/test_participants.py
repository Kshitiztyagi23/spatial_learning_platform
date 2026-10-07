import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_participant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/participants/", json={
            "name": "Test User",
            "age": 12,
            "gender": "male",
            "grade": "Grade 6",
            "section": "A",
            "roll_no": "12",
            "consent": True
        })
    assert response.status_code == 200
    data = response.json()
    assert data["condition"] == "unassigned"  # groups are assigned after session 1
    assert len(data["participant_code"]) == 6
    assert len(data["external_id"]) == 8

@pytest.mark.asyncio
async def test_create_participant_invalid_age():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/participants/", json={
            "name": "Test User",
            "age": 5,
            "gender": "male",
            "grade": "Grade 6",
            "section": "A",
            "roll_no": "12",
            "consent": True
        })
    assert response.status_code == 422
