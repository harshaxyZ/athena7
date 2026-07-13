"""Shared state passed between agents in the DAG."""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SessionStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    PLAYING = "playing"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class LessonStep:
    """One step in the teaching session."""
    step_id: int
    visual_script: str = ""
    speech_script: str = ""
    speech_script_localized: str = ""
    html_content: str = ""
    template_json: str = ""  # NEW: template-based animation JSON
    avatar_gesture: str = "explain"
    duration_estimate: float = 0.0
    sync_timestamp: float = 0.0


@dataclass
class ChatMessage:
    """A single message in a conversation."""
    role: str = "user"         # "user" or "assistant"
    content: str = ""
    timestamp: float = 0.0
    has_animation: bool = False
    animation_data: dict = field(default_factory=dict)
    cost_usd: float = 0.0
    cost_inr: float = 0.0
    tokens_used: int = 0


@dataclass
class AgentContext:
    """Mutable state shared across all DAG nodes."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # Input
    raw_text: str = ""
    raw_file_path: str = ""
    file_type: str = ""
    student_class: int = 5
    language: str = "hi-IN"
    secondary_language: str = ""  # NEW: secondary language for bilingual
    user_question: str = ""

    # Conversation messages
    messages: list[ChatMessage] = field(default_factory=list)
    conversation_title: str = ""

    # Node 1 output
    extracted_blocks: list[dict[str, Any]] = field(default_factory=list)

    # Node 2 output
    knowledge_graph: dict[str, Any] = field(default_factory=dict)
    topic: str = ""
    difficulty: str = ""

    # Node 3 output
    lesson_steps: list[LessonStep] = field(default_factory=list)
    total_steps: int = 0

    # Node 4 output (parallel)
    visual_html_map: dict[int, str] = field(default_factory=dict)

    # Node 5 output (parallel)
    localized_speech_map: dict[int, str] = field(default_factory=dict)

    # Progressive producer output
    audio_map: dict[int, str] = field(default_factory=dict)
    step_ready: dict[int, asyncio.Event] = field(default_factory=dict)
    audio_ready: dict[int, asyncio.Event] = field(default_factory=dict)

    # Node 6 output (parallel)
    qa_pairs: list[dict[str, str]] = field(default_factory=list)
    anticipated_doubts: list[str] = field(default_factory=list)

    # Meta
    status: SessionStatus = SessionStatus.UPLOADING
    error: str = ""
    event_queue: Any = None

    # Cost tracking
    total_cost_usd: float = 0.0
    total_cost_inr: float = 0.0
    total_tokens: int = 0
    animation_cost_usd: float = 0.0
    animation_cost_inr: float = 0.0
