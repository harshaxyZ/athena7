"""
A2A-shaped message primitives.

Mirrors the A2A protocol's data model (Message / Part / Artifact / Task) so
agents speak a wire-compatible shape, but stays in-process as plain dataclasses.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TaskState(str, Enum):
    SUBMITTED = "submitted"
    WORKING = "working"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Part:
    """A single piece of content in a message/artifact: text or structured data."""
    kind: str = "text"          # "text" | "data"
    text: str = ""
    data: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def of_text(text: str) -> "Part":
        return Part(kind="text", text=text)

    @staticmethod
    def of_data(data: dict[str, Any]) -> "Part":
        return Part(kind="data", data=data)


@dataclass
class Message:
    """A message routed to an agent (role="user") or emitted by one (role="agent")."""
    role: str = "user"          # "user" | "agent"
    parts: list[Part] = field(default_factory=list)
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str = ""
    context_id: str = ""        # groups messages for one session/lesson

    @property
    def text(self) -> str:
        return "\n".join(p.text for p in self.parts if p.kind == "text")

    @property
    def data(self) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for p in self.parts:
            if p.kind == "data":
                merged.update(p.data)
        return merged


@dataclass
class Artifact:
    """The output an agent produces for a task."""
    name: str = ""
    parts: list[Part] = field(default_factory=list)
    artifact_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    @property
    def text(self) -> str:
        return "\n".join(p.text for p in self.parts if p.kind == "text")

    @property
    def data(self) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for p in self.parts:
            if p.kind == "data":
                merged.update(p.data)
        return merged


@dataclass
class Task:
    """Lifecycle wrapper for one unit of agent work."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    context_id: str = ""
    skill: str = ""
    state: TaskState = TaskState.SUBMITTED
    input: Message | None = None
    artifact: Artifact | None = None
    error: str = ""
    created_at: float = field(default_factory=time.time)
