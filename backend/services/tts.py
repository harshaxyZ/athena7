"""
Sarvam AI Text-to-Speech — supports 10 Indian languages.
Fixed: asyncio.gather with return_exceptions for resilience.
"""
from __future__ import annotations

import asyncio
import base64
import io
import logging
import re
import wave

import httpx

from backend.config import settings

logger = logging.getLogger("services.tts")

MAX_TTS_CHARS = 450


def _chunk_text(text: str, limit: int = MAX_TTS_CHARS) -> list[str]:
    text = text.strip()
    if len(text) <= limit:
        return [text] if text else []

    chunks: list[str] = []
    cur = ""
    for sentence in re.split(r"(?<=[.!?।])\s+", text):
        while len(sentence) > limit:
            head = sentence[:limit]
            cut = head.rfind(" ")
            if cut <= 0:
                cut = limit
            chunks.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if not sentence:
            continue
        if len(cur) + len(sentence) + 1 <= limit:
            cur = f"{cur} {sentence}".strip()
        else:
            if cur:
                chunks.append(cur)
            cur = sentence
    if cur:
        chunks.append(cur)
    return chunks


def _concat_wav(wavs: list[bytes]) -> bytes:
    wavs = [w for w in wavs if w and not isinstance(w, Exception)]
    if not wavs:
        return b""
    if len(wavs) == 1:
        return wavs[0]

    out = io.BytesIO()
    writer: wave.Wave_write | None = None
    try:
        for w in wavs:
            with wave.open(io.BytesIO(w), "rb") as reader:
                if writer is None:
                    writer = wave.open(out, "wb")
                    writer.setparams(reader.getparams())
                writer.writeframes(reader.readframes(reader.getnframes()))
    finally:
        if writer is not None:
            writer.close()
    return out.getvalue()


async def _tts_request(client: httpx.AsyncClient, text: str, lang: str, voice_id: str) -> bytes:
    response = await client.post(
        f"{settings.SARVAM_BASE_URL}/text-to-speech",
        headers={
            "Authorization": f"Bearer {settings.SARVAM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model": settings.SARVAM_TTS_MODEL,
            "speaker": voice_id,
            "target_language_code": lang,
            "speech_sample_rate": settings.SARVAM_SAMPLE_RATE,
        },
    )
    if response.status_code >= 400:
        logger.error(f"Sarvam TTS {response.status_code} ({len(text)} chars)")
        response.raise_for_status()

    data = response.json()
    audios = data.get("audios") or []
    audio_b64 = (
        (audios[0] if audios else "")
        or data.get("audio", {}).get("data", "")
        or data.get("audio_base64", "")
    )
    return base64.b64decode(audio_b64) if audio_b64 else b""


async def text_to_speech(
    text: str,
    language: str | None = None,
    voice: str | None = None,
) -> bytes:
    lang = language or settings.SARVAM_DEFAULT_LANGUAGE
    voice_id = voice or settings.SARVAM_DEFAULT_VOICE

    chunks = _chunk_text(text)
    if not chunks:
        return b""

    async with httpx.AsyncClient(timeout=30.0) as client:
        parts = await asyncio.gather(
            *[_tts_request(client, chunk, lang, voice_id) for chunk in chunks],
            return_exceptions=True,
        )

    return _concat_wav(list(parts))


async def text_to_speech_base64(
    text: str,
    language: str | None = None,
    voice: str | None = None,
) -> str:
    audio_bytes = await text_to_speech(text, language, voice)
    return base64.b64encode(audio_bytes).decode("utf-8")
