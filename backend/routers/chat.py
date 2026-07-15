"""
Athena — Streaming chat endpoint.

This is the core of the new ChatGPT-like flow.
User sends a message → Athena streams a teaching response.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from backend.config import settings
from backend.services.llm import llm_chat_stream
from backend.services.tts import text_to_speech_base64
from backend.services.store import save_conversation, load_conversation
from backend.services.token_tracker import get_tracker

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger("routers.chat")

# In-memory conversation store (survives within the process)
_conversations: dict[str, list[dict]] = {}

ATHENA_SYSTEM_PROMPT = """You are Athena — an expert AI teacher for Indian students (Class 1-12).

IMPORTANT: You are part of a system that CAN generate animations. When a student asks for animation, the system automatically generates a visual animation. You do NOT need to create it — the system handles that. You just teach the concept clearly.

STYLE:
- Professional, clear, concise
- Simple language a student can understand
- Real-world examples from Indian context
- Break complex topics into simple steps

WHEN STUDENT ASKS FOR ANIMATION/VISUAL:
- The system WILL automatically generate an animation — you don't need to say "I can't"
- Just explain the concept briefly in 3-5 bullet points (100 words max)
- The animation will appear below your text
- Example: "Here's how the Fourier Transform works:" then list key points

WHEN STUDENT ASKS A NORMAL QUESTION:
- Explain clearly in 200-300 words
- Use markdown: **bold** for key terms, bullet points
- End with a key takeaway

WHEN STUDENT UPLOADED A PDF:
- Explain concepts from their material
- Highlight important points for exams

LANGUAGE:
- Default: English
- If student writes in Hindi/other language, respond in that language
- Mix English with local language naturally

RULES:
- NEVER use emojis
- NEVER use LaTeX notation ($$...$$, \\frac, \\int, etc) — write formulas in plain text like "F(w) = integral of f(t) * e^(-iwt) dt"
- NEVER output code, HTML, JavaScript, or script blocks
- NEVER say "I cannot generate animations" — the system generates them automatically
- Never make up facts
- Maximum 300 words
"""


@router.post("/chat")
async def chat_message(
    message: str = Form(...),
    conversation_id: str = Form(default=""),
    language: str = Form(default="en-IN"),
    secondary_language: str = Form(default=""),
    voice: str = Form(default=""),
    file: UploadFile | None = File(default=None),
):
    """
    Streaming chat endpoint. Returns SSE stream with:
    - text chunks (streaming response)
    - animation data (if user asked for visual)
    - cost data (real-time cost tracking)
    """
    # Create or continue conversation
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    # Load existing messages from memory or disk so context survives restarts.
    messages = _conversations.get(conversation_id, [])
    if not messages:
        persisted = load_conversation(conversation_id)
        if persisted:
            messages = persisted.get("messages", [])

    # Retain the latest attachment context across follow-up turns.
    document_context = next((msg.get("document_context", "") for msg in reversed(messages) if msg.get("document_context")), "")
    document_name = next((msg.get("document_name", "") for msg in reversed(messages) if msg.get("document_name")), "")
    extraction_notice = ""
    if file:
        try:
            content = await file.read()
            if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                raise ValueError(f"File too large (maximum {settings.MAX_FILE_SIZE_MB} MB)")
            suffix = Path(file.filename or "upload").suffix.lower()
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
                temporary.write(content)
                temporary_path = temporary.name
            try:
                from backend.services.file_processor import extract_content
                blocks = extract_content(temporary_path, suffix)
            finally:
                Path(temporary_path).unlink(missing_ok=True)
            labelled = []
            for block in blocks:
                if block.get("type") != "text":
                    continue
                label = block.get("section") or (f"Page {block.get('page')}" if block.get("page") else "Document")
                labelled.append(f"[{label}]\n{block.get('content', '')}")
            document_context = "\n\n".join(labelled)[:40000]
            document_name = file.filename or "attachment"
            extraction_notice = f"Extracted {len(labelled)} text sections from {document_name}."
        except Exception as exc:
            logger.warning("Attachment extraction failed: %s", exc)
            extraction_notice = str(exc)

    # Add user message
    user_msg = {
        "role": "user",
        "content": message,
        "timestamp": time.time(),
        "document_name": document_name,
        "document_context": document_context,
    }
    messages.append(user_msg)

    # Build context for LLM
    system_prompt = ATHENA_SYSTEM_PROMPT
    if language != "en-IN":
        lang_name = settings.SUPPORTED_LANGUAGES.get(language, language)
        system_prompt += f"\n\nIMPORTANT: The student prefers {lang_name}. Mix English with {lang_name} naturally."

    if secondary_language and secondary_language != language:
        lang2_name = settings.SUPPORTED_LANGUAGES.get(secondary_language, secondary_language)
        system_prompt += f"\n\nThe student also understands {lang2_name}. Use it occasionally for emphasis."

    if document_context:
        system_prompt += f"\n\nRETAINED STUDY MATERIAL ({document_name}):\n---\n{document_context[:30000]}\n---\nUse this material for the current and follow-up questions. Cite page, slide, or section labels when available."
    if extraction_notice:
        system_prompt += f"\nAttachment status: {extraction_notice}"

    # Check if user wants animation
    wants_animation = any(kw in message.lower() for kw in [
        "animate", "animation", "visual", "visualize", "show me",
        "diagram", "illustrate", "draw", "demonstrate", "explains using",
        "animation", "visual explain", "graph", "chart",
    ])

    # Build LLM messages
    llm_messages = [{"role": "system", "content": system_prompt}]
    # Add conversation history (last 20 messages max)
    for msg in messages[-20:]:
        llm_messages.append({"role": msg["role"], "content": msg["content"]})

    async def event_generator():
        full_response = ""
        animation_data = None

        try:
            # Stream text response
            async for token in llm_chat_stream(
                messages=llm_messages,
                agent="teacher",
                session_id=conversation_id,
                max_tokens=2000,
            ):
                full_response += token
                yield f"data: {json.dumps({'type': 'text', 'content': token})}\n\n"

            # V2 Pipeline: Director outputs Scene JSON → frontend renderer handles visuals
            if wants_animation and full_response:
                try:
                    yield f"data: {json.dumps({'type': 'status', 'content': 'Director is planning the visual story'})}\n\n"
                    from backend.agents.visual_generator import generate_scene_json
                    scene_result = await generate_scene_json(
                        topic=message,
                        explanation=full_response,
                        session_id=conversation_id,
                    )
                    animation_data = scene_result  # Capture for saving to message

                    # Send Scene JSON to frontend renderer
                    yield f"data: {json.dumps({'type': 'status', 'content': 'Rendering animation'})}\n\n"
                    yield f"data: {json.dumps({'type': 'scene', 'data': scene_result})}\n\n"

                    # Generate TTS for the combined narration
                    narration = scene_result.get("narration", "")
                    if narration:
                        try:
                            voice_id = voice if voice else None
                            audio_b64 = await text_to_speech_base64(narration[:1500], language=language, voice=voice_id)
                            yield f"data: {json.dumps({'type': 'audio', 'data': audio_b64})}\n\n"
                        except Exception as e:
                            logger.warning(f"TTS failed: {e}")

                    yield f"data: {json.dumps({'type': 'status', 'content': ''})}\n\n"

                    # LEGACY: Also try old pipeline as fallback if scene_json has no scenes
                    if not scene_result.get("scene_json", {}).get("scenes"):
                        raise ValueError("Empty scene JSON")

                except Exception as exc:
                    logger.error("Animation generation failed: %s", exc, exc_info=True)
                    error_msg = f"Animation generation failed: {str(exc)}"
                    yield f"data: {json.dumps({'type': 'animation_error', 'content': error_msg})}\n\n"
                    yield f"data: {json.dumps({'type': 'status', 'content': ''})}\n\n"

            # Generate TTS for non-animation requests (animation TTS is in the scene pipeline)
            if full_response and not wants_animation:
                try:
                    tts_text = full_response[:1500]
                    voice_id = voice if voice else None
                    audio_b64 = await text_to_speech_base64(tts_text, language=language, voice=voice_id)
                    yield f"data: {json.dumps({'type': 'audio', 'data': audio_b64})}\n\n"
                except Exception as e:
                    logger.warning(f"TTS failed: {e}")

            # Save assistant message
            assistant_msg = {
                "role": "assistant",
                "content": full_response,
                "timestamp": time.time(),
                "has_animation": animation_data is not None,
                "animation_data": animation_data or {},
            }
            messages.append(assistant_msg)
            _conversations[conversation_id] = messages

            # Save to disk
            title = messages[0]["content"][:60] if messages else "New Chat"
            save_conversation(conversation_id, title, messages, language)

            # Send final cost data
            tracker = get_tracker()
            session_usage = tracker.get_session_summary(conversation_id)
            if session_usage:
                yield f"data: {json.dumps({'type': 'cost', 'data': session_usage})}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id})}\n\n"

        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chat/visual")
async def generate_visual(
    topic: str = Form(...),
    description: str = Form(...),
    conversation_id: str = Form(default=""),
):
    """Generate animation on-demand for a chat message."""
    from backend.agents.visual_generator import generate_chat_visual

    animation = await generate_chat_visual(topic, description, conversation_id)

    tracker = get_tracker()
    session_usage = tracker.get_session_summary(conversation_id) if conversation_id else None

    return {
        "animation": animation,
        "cost": session_usage,
    }


@router.get("/chat/conversations")
async def list_conversations():
    """List all conversations (for sidebar)."""
    from backend.services.store import list_conversations as list_convs
    return {"conversations": list_convs()}


@router.get("/chat/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get full conversation history."""
    conv = load_conversation(conversation_id)
    if not conv:
        # Try in-memory
        msgs = _conversations.get(conversation_id, [])
        if msgs:
            return {"conversation_id": conversation_id, "messages": msgs}
        return {"error": "Conversation not found"}
    return conv


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    from backend.services.store import delete_conversation as del_conv
    _conversations.pop(conversation_id, None)
    del_conv(conversation_id)
    return {"status": "deleted"}


@router.get("/chat/cost/{conversation_id}")
async def get_conversation_cost(conversation_id: str):
    """Get cost breakdown in USD and INR for a conversation."""
    tracker = get_tracker()
    summary = tracker.get_session_summary(conversation_id)
    if not summary:
        return {"total_cost_usd": 0, "total_cost_inr": 0, "total_tokens": 0}
    return summary
