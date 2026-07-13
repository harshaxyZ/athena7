"""
Upload endpoint — accepts documents and starts the lesson pipeline.
Fixed: streaming file read, proper size validation, UUID path validation.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid

from fastapi import APIRouter, File, Form, UploadFile, BackgroundTasks

from backend.config import settings
from backend.dag.context import AgentContext, SessionStatus
from backend.a2a.orchestrator import run_lesson
from backend.services.store import save_lesson
from backend.models.requests import SessionResponse

router = APIRouter(prefix="/api", tags=["upload"])
logger = logging.getLogger("routers.upload")

_sessions: dict[str, AgentContext] = {}


def get_session(session_id: str) -> AgentContext | None:
    return _sessions.get(session_id)


def store_session(ctx: AgentContext):
    _sessions[ctx.session_id] = ctx


async def run_pipeline_bg(session_id: str, ctx: AgentContext):
    try:
        await run_lesson(ctx)
        save_lesson(ctx)
    except Exception as e:
        logger.error(f"Pipeline failed for session {session_id}: {e}")
        ctx.status = SessionStatus.ERROR
        ctx.error = str(e)
        for ev in ctx.step_ready.values():
            ev.set()
        for ev in ctx.audio_ready.values():
            ev.set()
    finally:
        store_session(ctx)


@router.post("/upload", response_model=SessionResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form(default="hi-IN"),
):
    """Upload a document and start the lesson generation pipeline."""
    session_id = str(uuid.uuid4())
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Stream-read file with size check (don't load entire file into memory first)
    content = bytearray()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    while chunk := await file.read(8192):
        content.extend(chunk)
        if len(content) > max_bytes:
            return SessionResponse(session_id=session_id, status="error", topic="File too large (max 20MB)")

    file_ext = "txt"
    if file.filename and "." in file.filename:
        raw_ext = file.filename.rsplit(".", 1)[-1].lower()
        if raw_ext in ("pdf", "txt", "md", "doc", "docx"):
            file_ext = raw_ext

    file_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}.{file_ext}")
    with open(file_path, "wb") as f:
        f.write(content)

    ctx = AgentContext(
        session_id=session_id,
        raw_file_path=file_path,
        file_type=file_ext,
        language=language,
    )
    store_session(ctx)
    background_tasks.add_task(run_pipeline_bg, session_id, ctx)

    return SessionResponse(session_id=session_id, status="processing")


@router.post("/ask", response_model=SessionResponse)
async def ask_direct_question(
    question: str = Form(...),
    language: str = Form(default="hi-IN"),
    topic: str = Form(default=""),
    background_tasks: BackgroundTasks = None,
):
    """Ask a direct question without uploading a file."""
    session_id = str(uuid.uuid4())
    ctx = AgentContext(
        session_id=session_id,
        user_question=question,
        language=language,
        topic=topic or "Student Question",
    )
    store_session(ctx)
    if background_tasks:
        background_tasks.add_task(run_pipeline_bg, session_id, ctx)
    return SessionResponse(session_id=session_id, status="processing")


@router.get("/session/{session_id}/status", response_model=SessionResponse)
async def get_session_status(session_id: str):
    ctx = get_session(session_id)
    if not ctx:
        return SessionResponse(session_id=session_id, status="not_found")
    return SessionResponse(
        session_id=session_id,
        status=ctx.status.value,
        topic=ctx.topic,
    )


@router.get("/session/{session_id}/plan")
async def get_lesson_plan(session_id: str):
    ctx = get_session(session_id)
    if not ctx:
        return {"error": "Session not found"}
    if ctx.status != SessionStatus.READY:
        return {"status": ctx.status.value, "error": ctx.error or "Still processing..."}
    return {
        "session_id": session_id,
        "topic": ctx.topic,
        "total_steps": ctx.total_steps,
        "steps": [
            {
                "step_id": s.step_id,
                "visual_script": s.visual_script,
                "speech_script": s.speech_script,
                "template_json": s.template_json,
                "duration_estimate": s.duration_estimate,
            }
            for s in ctx.lesson_steps
        ],
    }
