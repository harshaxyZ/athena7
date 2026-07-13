from __future__ import annotations

import hashlib
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.config import settings
from backend.services.tts import text_to_speech

router = APIRouter(prefix="/api/narration", tags=["narration"])
CACHE_DIR = Path(__file__).parent.parent / "lessons" / "audio"


class NarrationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2500)
    language: str = "en-IN"
    voice: str | None = None


@router.post("")
async def create_narration(payload: NarrationRequest):
    if not settings.SARVAM_API_KEY:
        raise HTTPException(status_code=503, detail="Narration is not configured")

    cache_key = hashlib.sha256(
        f"{payload.language}:{payload.voice or ''}:{payload.text}".encode()
    ).hexdigest()[:24]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    audio_path = CACHE_DIR / f"{cache_key}.wav"

    if not audio_path.exists():
        audio = await text_to_speech(payload.text, payload.language, payload.voice)
        if not audio:
            raise HTTPException(status_code=502, detail="Narration generation failed")
        audio_path.write_bytes(audio)

    return FileResponse(audio_path, media_type="audio/wav", filename="athena-narration.wav")
