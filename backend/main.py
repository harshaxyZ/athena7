"""
Athena — AI Visual Learning Platform
FastAPI backend entry point
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import upload, session, chat, history, narration
from backend.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(
    title="Athena AI Learning Platform",
    description="AI-powered visual learning for Indian students",
    version="1.4.0",
)

# CORS — allow frontend origin + wildcard for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router)
app.include_router(session.router)
app.include_router(chat.router)
app.include_router(history.router)
app.include_router(narration.router)


@app.get("/")
async def root():
    return {
        "name": "Athena AI Learning Platform",
        "version": "1.4.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "athena-backend",
        "version": app.version,
        "model": settings.OPENROUTER_MODEL,
        "openrouter_configured": bool(settings.OPENROUTER_API_KEY),
        "sarvam_configured": bool(settings.SARVAM_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
