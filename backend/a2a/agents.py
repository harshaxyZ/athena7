"""
A2A agents — thin wrappers around the existing agent functions.

Each agent has an Agent Card (name + skill) and a handler that consumes an
input Message, calls the existing function in backend/agents/*, and returns an
Artifact. Agents are bound to one session's AgentContext (the shared store) and
registered on a per-session MessageBus.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from backend.agents.document_analyzer import analyze_document
from backend.agents.knowledge_extractor import extract_knowledge
from backend.agents.lesson_planner import plan_lesson
from backend.agents.speech_generator import generate_step_speech
from backend.agents.visual_generator import generate_step_visual
from backend.agents.qa_handler import handle_doubt
from backend.dag.context import AgentContext
from backend.services.tts import text_to_speech_base64

from .bus import MessageBus
from .messages import Artifact, Message, Part

# Skill names (the bus topics).
SKILL_ANALYZE = "analyze_document"
SKILL_EXTRACT = "extract_knowledge"
SKILL_PLAN = "plan_lesson"
SKILL_SPEECH = "generate_speech"
SKILL_VISUAL = "generate_visual"
SKILL_AUDIO = "generate_audio"
SKILL_DOUBT = "handle_doubt"


@dataclass
class AgentCard:
    name: str
    skill: str
    description: str = ""
    concurrency: int = 1


def register_agents(bus: MessageBus, ctx: AgentContext, visual_concurrency: int) -> list[AgentCard]:
    """Bind all agents to `ctx` and register them on `bus`. Returns their cards."""

    async def on_analyze(_: Message) -> Artifact:
        await analyze_document(ctx)
        return Artifact(name="document", parts=[Part.of_data({"blocks": len(ctx.extracted_blocks)})])

    async def on_extract(_: Message) -> Artifact:
        await extract_knowledge(ctx)
        return Artifact(name="knowledge", parts=[Part.of_data({"topic": ctx.topic})])

    async def on_plan(_: Message) -> Artifact:
        await plan_lesson(ctx)
        return Artifact(name="lesson_plan", parts=[Part.of_data({"total_steps": ctx.total_steps})])

    async def on_speech(msg: Message) -> Artifact:
        step_id = msg.data.get("step_id")
        step = next((s for s in ctx.lesson_steps if s.step_id == step_id), None)
        text = await generate_step_speech(ctx, step) if step else ""
        return Artifact(name="speech", parts=[Part.of_data({"step_id": step_id, "text": text})])

    async def on_visual(msg: Message) -> Artifact:
        step_id = msg.data.get("step_id")
        step = next((s for s in ctx.lesson_steps if s.step_id == step_id), None)
        template_json = await generate_step_visual(ctx, step) if step else ""
        return Artifact(name="visual", parts=[Part.of_data({"step_id": step_id, "html": template_json, "template_json": template_json})])

    async def on_audio(msg: Message) -> Artifact:
        step_id = msg.data.get("step_id")
        text = msg.data.get("text", "")
        audio_b64 = await text_to_speech_base64(text, language=ctx.language) if text else ""
        return Artifact(name="audio", parts=[Part.of_data({"step_id": step_id, "audio_b64": audio_b64})])

    async def on_doubt(msg: Message) -> Artifact:
        ctx.user_question = msg.text
        await handle_doubt(ctx)
        answer = ctx.knowledge_graph.get("doubt_answer", "")
        return Artifact(name="doubt_answer", parts=[Part.of_text(answer)])

    cards = [
        AgentCard("DocumentAnalyzer", SKILL_ANALYZE, "Extracts text/structure from the upload"),
        AgentCard("KnowledgeExtractor", SKILL_EXTRACT, "Builds a knowledge graph"),
        AgentCard("LessonPlanner", SKILL_PLAN, "Plans the step-by-step lesson"),
        AgentCard("SpeechGenerator", SKILL_SPEECH, "Localizes + optimizes narration", concurrency=visual_concurrency),
        AgentCard("VisualGenerator", SKILL_VISUAL, "Renders per-step HTML/SVG", concurrency=visual_concurrency),
        AgentCard("AudioGenerator", SKILL_AUDIO, "Synthesizes per-step TTS audio", concurrency=visual_concurrency),
        AgentCard("DoubtHandler", SKILL_DOUBT, "Answers live student doubts"),
    ]
    handlers = {
        SKILL_ANALYZE: on_analyze,
        SKILL_EXTRACT: on_extract,
        SKILL_PLAN: on_plan,
        SKILL_SPEECH: on_speech,
        SKILL_VISUAL: on_visual,
        SKILL_AUDIO: on_audio,
        SKILL_DOUBT: on_doubt,
    }
    for card in cards:
        bus.register(card.skill, handlers[card.skill], concurrency=card.concurrency)
    return cards
