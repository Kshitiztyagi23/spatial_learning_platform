from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.participants import router as participants_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.stages import router as stages_router
from app.api.v1.trials import router as trials_router
from app.api.v1.lego import router as lego_router
from app.api.v1.admin import router as admin_router
from app.api.v1.feedback import router as feedback_router

app = FastAPI(
    title="Adaptive Spatial Learning Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import json
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.orchestration import get_or_create_active_protocol
from app.services.orchestration import protocol_schedule
from app.services.study_design import first_round_stages

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/v1/protocol/active")
async def get_active_protocol_public(db: AsyncSession = Depends(get_db)):
    protocol = await get_or_create_active_protocol(db)
    stages = first_round_stages(protocol_schedule(protocol))
    first_stage = stages[0]
    return {
        "enabled_stages": stages,
        "first_stage": first_stage,
        "ai_feedback_percentage": protocol.ai_feedback_percentage,
        "total_rounds": protocol.total_rounds,
        "active_round": protocol.active_round
    }

app.include_router(participants_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(stages_router, prefix="/api/v1")
app.include_router(trials_router, prefix="/api/v1")
app.include_router(lego_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

# ---- Built frontend (production / demo) --------------------------------------
# When frontend/dist exists (after `npm run build`), the backend also serves the
# app, so students and the admin console share one URL with the API and no
# CORS setup. Unknown paths get index.html so React Router can handle
# /admin, /lego, ... on a page refresh. In development Vite serves the app.
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_file() and FRONTEND_DIST in file.parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
