from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.participants import router as participants_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.stages import router as stages_router
from app.api.v1.trials import router as trials_router
from app.api.v1.lego import router as lego_router

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

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(participants_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(stages_router, prefix="/api/v1")
app.include_router(trials_router, prefix="/api/v1")
app.include_router(lego_router, prefix="/api/v1")
