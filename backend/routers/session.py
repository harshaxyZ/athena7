"""
SSE streaming endpoint for teaching sessions.
Fixed: proper error responses, path traversal protection.
"""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse, Response

from backend.dag.context import AgentContext, LessonStep, SessionStatus
from backend.routers.upload import get_session
from backend.services.store import load_lesson
from backend.services.tts import text_to_speech_base64
from backend.services.token_tracker import get_tracker
from backend.config import settings

router = APIRouter(prefix="/api", tags=["session"])
logger = logging.getLogger("routers.session")


def _hydrate_from_store(session_id: str) -> AgentContext | None:
    rec = load_lesson(session_id)
    if not rec:
        return None

    ctx = AgentContext(
        session_id=rec.get("session_id", session_id),
        language=rec.get("language", "hi-IN"),
    )
    ctx.topic = rec.get("topic", "")
    ctx.total_steps = rec.get("total_steps", len(rec.get("steps", [])))
    ctx.total_cost_usd = rec.get("total_cost_usd", 0)
    ctx.total_cost_inr = rec.get("total_cost_inr", 0)
    for s in rec.get("steps", []):
        step = LessonStep(
            step_id=s["step_id"],
            speech_script=s.get("speech_script", ""),
            html_content=s.get("html_content", ""),
            template_json=s.get("template_json", ""),
            avatar_gesture=s.get("avatar_gesture", "explain"),
            duration_estimate=s.get("duration_estimate", 5.0),
            sync_timestamp=s.get("sync_timestamp", 0.0),
        )
        ctx.lesson_steps.append(step)
        ctx.visual_html_map[step.step_id] = step.html_content
        ready = asyncio.Event(); ready.set()
        aready = asyncio.Event(); aready.set()
        ctx.step_ready[step.step_id] = ready
        ctx.audio_ready[step.step_id] = aready
    ctx.audio_map = {int(k): v for k, v in rec.get("audio_map", {}).items()}
    ctx.status = SessionStatus.READY
    return ctx


@router.get("/session/{session_id}/stream")
async def stream_session(session_id: str):
    """SSE endpoint for teaching session."""
    ctx = get_session(session_id) or _hydrate_from_store(session_id)
    if not ctx:
        async def error_gen():
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': 'Session not found'}})}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    if ctx.status == SessionStatus.ERROR:
        async def error_gen():
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': ctx.error}})}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    async def event_generator():
        for _ in range(120):
            if ctx.status in (SessionStatus.READY, SessionStatus.PLAYING):
                break
            if ctx.status == SessionStatus.ERROR:
                yield f"data: {json.dumps({'event': 'error', 'data': {'message': ctx.error}})}\n\n"
                return
            await asyncio.sleep(0.5)

        if ctx.status not in (SessionStatus.READY, SessionStatus.PLAYING):
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': 'Timed out'}})}\n\n"
            return

        ctx.status = SessionStatus.PLAYING
        yield f"data: {json.dumps({'event': 'session:start', 'data': {'topic': ctx.topic, 'total_steps': ctx.total_steps}})}\n\n"

        for step in ctx.lesson_steps:
            event = ctx.step_ready.get(step.step_id)
            if event is not None:
                await event.wait()

            step_data = {
                "step_id": step.step_id,
                "total_steps": ctx.total_steps,
                "html_content": step.html_content,
                "template_json": step.template_json,
                "speech_script": step.speech_script_localized or step.speech_script,
                "avatar_gesture": step.avatar_gesture,
                "audio_b64": ctx.audio_map.get(step.step_id, ""),
                "duration_estimate": step.duration_estimate,
                "sync_timestamp": step.sync_timestamp,
            }
            yield f"data: {json.dumps({'event': 'session:step', 'data': step_data})}\n\n"

        ctx.status = SessionStatus.COMPLETED
        yield f"data: {json.dumps({'event': 'session:end', 'data': {'topic': ctx.topic}})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/session/{session_id}/audio/{step_id}")
async def get_step_audio(session_id: str, step_id: int):
    """Get TTS audio for a step."""
    ctx = get_session(session_id) or _hydrate_from_store(session_id)
    if not ctx:
        return Response(content=json.dumps({"error": "Session not found"}), media_type="application/json", status_code=404)

    event = ctx.audio_ready.get(step_id)
    if event is not None:
        try:
            await asyncio.wait_for(event.wait(), timeout=60.0)
        except asyncio.TimeoutError:
            logger.warning(f"Audio timeout for session {session_id} step {step_id}")

    if step_id in ctx.audio_map:
        import base64
        return Response(content=base64.b64decode(ctx.audio_map[step_id]), media_type="audio/wav")

    step = next((s for s in ctx.lesson_steps if s.step_id == step_id), None)
    if not step:
        return Response(content=json.dumps({"error": "Step not found"}), media_type="application/json", status_code=404)

    speech_text = step.speech_script_localized or step.speech_script
    if not speech_text:
        return Response(content=json.dumps({"error": "No speech script"}), media_type="application/json", status_code=404)

    audio_b64 = await text_to_speech_base64(speech_text, language=ctx.language)
    import base64
    return Response(content=base64.b64decode(audio_b64), media_type="audio/wav")


@router.get("/session/{session_id}/usage")
async def get_session_usage(session_id: str):
    tracker = get_tracker()
    summary = tracker.get_session_summary(session_id)
    if not summary:
        return {"error": "No usage data"}
    return summary


@router.get("/tokens/global")
async def get_global_usage():
    tracker = get_tracker()
    return tracker.get_global()
