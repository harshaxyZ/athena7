"""
A2A orchestrator — replaces the DAG.

Runs the prep pipeline sequentially over the bus (each stage depends on the
prior one), then fans out per-step visual + audio agents concurrently. Each
step signals `step_ready` the moment BOTH its artifacts land, so the SSE
consumer streams parts as early as possible.
"""
from __future__ import annotations

import asyncio
import logging

from backend.config import settings
from backend.dag.context import AgentContext, SessionStatus

from .agents import (
    SKILL_ANALYZE,
    SKILL_AUDIO,
    SKILL_DOUBT,
    SKILL_EXTRACT,
    SKILL_PLAN,
    SKILL_SPEECH,
    SKILL_VISUAL,
    register_agents,
)
from .bus import MessageBus
from .messages import Message, Part

logger = logging.getLogger("a2a.orchestrator")


def _msg(ctx: AgentContext, **data) -> Message:
    parts = [Part.of_data(data)] if data else []
    return Message(role="user", parts=parts, context_id=ctx.session_id)


async def run_lesson(ctx: AgentContext) -> None:
    """Prep the lesson, then produce every part progressively over the A2A bus."""
    bus = MessageBus()
    register_agents(bus, ctx, visual_concurrency=settings.VISUAL_MAX_CONCURRENT)
    try:
        # Prep — visuals only need the PLAN, so we stop the blocking chain there.
        await bus.request(SKILL_ANALYZE, _msg(ctx))
        await bus.request(SKILL_EXTRACT, _msg(ctx))
        await bus.request(SKILL_PLAN, _msg(ctx))
        logger.info(f"Plan ready for session {ctx.session_id}")

        # Per-step ready signals + timeline (min 5s per step).
        # step_ready = VISUAL ready (gates the SSE scene stream);
        # audio_ready = AUDIO ready (client fetches audio per-scene over HTTP).
        ctx.step_ready = {s.step_id: asyncio.Event() for s in ctx.lesson_steps}
        ctx.audio_ready = {s.step_id: asyncio.Event() for s in ctx.lesson_steps}
        cumulative = 0.0
        for step in ctx.lesson_steps:
            step.sync_timestamp = cumulative
            step.duration_estimate = max(step.duration_estimate, 5.0)
            cumulative += step.duration_estimate

        # Plan is ready — the SSE stream may connect and start awaiting parts.
        ctx.status = SessionStatus.READY

        async def produce_visual(step) -> None:
            # A scene streams as soon as its VISUAL is ready — never waits on audio.
            try:
                res = await bus.request(SKILL_VISUAL, _msg(ctx, step_id=step.step_id))
                html = res.data.get("html", "")
                template_json = res.data.get("template_json", "")

                step.html_content = html
                step.template_json = template_json
                ctx.visual_html_map[step.step_id] = html
            except Exception as e:
                logger.warning(f"Visual failed for step {step.step_id}: {e}")
            finally:
                ctx.step_ready[step.step_id].set()
                logger.info(f"Step {step.step_id} visual ready for session {ctx.session_id}")

        async def produce_audio(step) -> None:
            # Per-scene pipeline: localize THIS step's narration, then TTS it.
            # Each scene's audio is independent, so scene 1's audio is ready fast
            # instead of waiting for the whole lesson to be localized.
            try:
                sres = await bus.request(SKILL_SPEECH, _msg(ctx, step_id=step.step_id))
                speech_text = sres.data.get("text") or step.speech_script
                if not speech_text:
                    return
                ares = await bus.request(SKILL_AUDIO, _msg(ctx, step_id=step.step_id, text=speech_text))
                ctx.audio_map[step.step_id] = ares.data.get("audio_b64", "")
            except Exception as e:
                logger.warning(f"Audio failed for step {step.step_id}: {e}")
            finally:
                ctx.audio_ready[step.step_id].set()

        # Fan out visuals and audio independently; each signals its own event.
        tasks = []
        for s in ctx.lesson_steps:
            tasks.append(produce_visual(s))
            tasks.append(produce_audio(s))
        await asyncio.gather(*tasks)
        logger.info(f"All parts produced for session {ctx.session_id}")
    finally:
        await bus.aclose()


async def answer_doubt(ctx: AgentContext, question: str) -> str:
    """Answer a live student doubt over the A2A bus (spins up a short-lived bus)."""
    bus = MessageBus()
    register_agents(bus, ctx, visual_concurrency=settings.VISUAL_MAX_CONCURRENT)
    try:
        msg = Message(role="user", parts=[Part.of_text(question)], context_id=ctx.session_id)
        artifact = await bus.request(SKILL_DOUBT, msg)
        return artifact.text
    finally:
        await bus.aclose()
