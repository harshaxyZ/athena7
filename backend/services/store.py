"""
Athena — persistence layer.

Saves finished lessons and conversations to disk as JSON.
Fixed: path traversal (UUID validation), atomic writes.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from pathlib import Path

from backend.config import settings
from backend.dag.context import AgentContext

logger = logging.getLogger("services.store")

# Only allow valid UUIDs to prevent path traversal
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _validate_id(session_id: str) -> bool:
    return bool(_UUID_RE.match(session_id))


def _dir(name: str | None = None) -> Path:
    base = Path(settings.LESSONS_DIR if name == "lessons" else settings.CONVERSATIONS_DIR if name == "conversations" else settings.LESSONS_DIR)
    base.mkdir(parents=True, exist_ok=True)
    return base


def _atomic_write(path: Path, content: str) -> None:
    """Write to a temp file then rename (atomic on most filesystems)."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(content, encoding="utf-8")
    tmp.replace(path)


# ── Lessons ────────────────────────────────────────────────────────

def _lesson_path(session_id: str) -> Path:
    return _dir("lessons") / f"{session_id}.json"


def save_lesson(ctx: AgentContext) -> None:
    if not ctx.lesson_steps:
        return
    record = {
        "session_id": ctx.session_id,
        "topic": ctx.topic,
        "language": ctx.language,
        "secondary_language": ctx.secondary_language,
        "student_class": ctx.student_class,
        "created_at": time.time(),
        "total_steps": ctx.total_steps,
        "total_cost_usd": ctx.total_cost_usd,
        "total_cost_inr": ctx.total_cost_inr,
        "total_tokens": ctx.total_tokens,
        "steps": [
            {
                "step_id": s.step_id,
                "html_content": html if html and "Generating visual" not in html else "",
                "template_json": s.template_json,
                "speech_script": s.speech_script_localized or s.speech_script,
                "avatar_gesture": s.avatar_gesture,
                "duration_estimate": s.duration_estimate,
                "sync_timestamp": s.sync_timestamp,
            }
            for s in ctx.lesson_steps
            for html in [ctx.visual_html_map.get(s.step_id, s.html_content)]
        ],
        "audio_map": {str(k): v for k, v in ctx.audio_map.items()},
    }
    try:
        _atomic_write(_lesson_path(ctx.session_id), json.dumps(record, ensure_ascii=False))
        logger.info(f"Saved lesson {ctx.session_id} ({ctx.total_steps} steps)")
    except Exception as e:
        logger.warning(f"Failed to save lesson {ctx.session_id}: {e}")


def load_lesson(session_id: str) -> dict | None:
    if not _validate_id(session_id):
        return None
    p = _lesson_path(session_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Failed to load lesson {session_id}: {e}")
        return None


def list_lessons() -> list[dict]:
    from backend.services.token_tracker import get_tracker
    tracker = get_tracker()
    out: list[dict] = []
    for p in _dir("lessons").glob("*.json"):
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        sid = rec.get("session_id", p.stem)
        summary = {
            "session_id": sid,
            "topic": rec.get("topic", "Untitled"),
            "language": rec.get("language", ""),
            "created_at": rec.get("created_at", 0),
            "total_steps": rec.get("total_steps", len(rec.get("steps", []))),
            "total_cost_usd": rec.get("total_cost_usd", 0),
            "total_cost_inr": rec.get("total_cost_inr", 0),
        }
        usage = tracker.get_session_summary(sid)
        if usage:
            summary["total_cost_usd"] = usage.get("total_cost_usd", 0)
            summary["total_tokens"] = usage.get("total_tokens", 0)
        out.append(summary)
    out.sort(key=lambda r: r.get("created_at", 0), reverse=True)
    return out


# ── Conversations ──────────────────────────────────────────────────

def _conv_path(conversation_id: str) -> Path:
    return _dir("conversations") / f"{conversation_id}.json"


def save_conversation(conversation_id: str, title: str, messages: list[dict], language: str = "en-IN") -> None:
    """Save a full conversation (chat messages) to disk."""
    record = {
        "conversation_id": conversation_id,
        "title": title,
        "language": language,
        "messages": messages,
        "created_at": messages[0]["timestamp"] if messages else time.time(),
        "updated_at": time.time(),
        "message_count": len(messages),
    }
    try:
        _atomic_write(_conv_path(conversation_id), json.dumps(record, ensure_ascii=False))
    except Exception as e:
        logger.warning(f"Failed to save conversation {conversation_id}: {e}")


def load_conversation(conversation_id: str) -> dict | None:
    if not _validate_id(conversation_id):
        return None
    p = _conv_path(conversation_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def list_conversations() -> list[dict]:
    """List all conversations (lightweight summaries), newest first."""
    out: list[dict] = []
    conv_dir = _dir("conversations")
    for p in conv_dir.glob("*.json"):
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.append({
            "conversation_id": rec.get("conversation_id", p.stem),
            "title": rec.get("title", "New Chat"),
            "language": rec.get("language", "en-IN"),
            "created_at": rec.get("created_at", 0),
            "updated_at": rec.get("updated_at", 0),
            "message_count": rec.get("message_count", 0),
        })
    out.sort(key=lambda r: r.get("updated_at", 0), reverse=True)
    return out


def delete_conversation(conversation_id: str) -> bool:
    if not _validate_id(conversation_id):
        return False
    p = _conv_path(conversation_id)
    if p.exists():
        p.unlink()
        return True
    return False
