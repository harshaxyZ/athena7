"""
History endpoints — list and fetch persisted lessons and conversations.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from backend.services.store import list_lessons, load_lesson, list_conversations, load_conversation

router = APIRouter(prefix="/api", tags=["history"])
logger = logging.getLogger("routers.history")


@router.get("/history")
async def get_history():
    """Lightweight summaries of all saved lessons, newest first."""
    return {"lessons": list_lessons()}


@router.get("/history/{session_id}")
async def get_history_item(session_id: str):
    """Full stored lesson record."""
    rec = load_lesson(session_id)
    if not rec:
        return {"error": "Lesson not found"}
    return rec


@router.get("/conversations")
async def get_conversations():
    """List all conversations (chat-based)."""
    return {"conversations": list_conversations()}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Full conversation with messages."""
    rec = load_conversation(conversation_id)
    if not rec:
        return {"error": "Conversation not found"}
    return rec
