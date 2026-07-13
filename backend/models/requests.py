"""API request/response models."""
from __future__ import annotations

from pydantic import BaseModel, Field


class UploadRequest(BaseModel):
    student_class: int = Field(default=5, ge=1, le=12, description="Student grade level (1-12)")
    language: str = Field(default="hi-IN", description="Preferred TTS language code")


class DirectQuestionRequest(BaseModel):
    question: str = Field(..., description="The student's question or doubt")
    student_class: int = Field(default=5, ge=1, le=12)
    language: str = Field(default="hi-IN")
    topic: str = Field(default="", description="Optional topic context")


class DoubtRequest(BaseModel):
    question: str = Field(..., description="Student's doubt during session")


class SessionResponse(BaseModel):
    session_id: str
    status: str
    topic: str = ""


class LessonPlanResponse(BaseModel):
    session_id: str
    topic: str
    total_steps: int
    steps: list[dict]


class DoubtResponse(BaseModel):
    answer: str
    session_paused: bool = True
