"""Athena configuration — loads from .env, validates at startup."""
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env from project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class Settings:
    # ── OpenRouter / GLM-5.2 ───────────────────────────────────────
    OPENROUTER_ENDPOINT: str = os.getenv("OPENROUTER_ENDPOINT", "https://openrouter.ai/api/v1")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "z-ai/glm-5.2")
    OPENROUTER_FALLBACK_MODEL: str = os.getenv("OPENROUTER_FALLBACK_MODEL", "google/gemini-2.5-flash")

    # ── Sarvam AI TTS ──────────────────────────────────────────────
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    SARVAM_BASE_URL: str = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")
    SARVAM_TTS_MODEL: str = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
    SARVAM_DEFAULT_VOICE: str = os.getenv("SARVAM_DEFAULT_VOICE", "shubh")
    SARVAM_DEFAULT_LANGUAGE: str = os.getenv("SARVAM_DEFAULT_LANGUAGE", "hi-IN")
    SARVAM_SAMPLE_RATE: int = int(os.getenv("SARVAM_SAMPLE_RATE", "22050"))
    SARVAM_AUDIO_FORMAT: str = os.getenv("SARVAM_AUDIO_FORMAT", "wav")

    # ── App settings ───────────────────────────────────────────────
    UPLOAD_DIR: str = str(Path(__file__).parent / "uploads")
    LESSONS_DIR: str = str(Path(__file__).parent / "lessons")
    CONVERSATIONS_DIR: str = str(Path(__file__).parent / "conversations")
    MAX_FILE_SIZE_MB: int = 20
    LLM_MAX_CONCURRENT: int = 5
    LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
    VISUAL_MAX_CONCURRENT: int = int(os.getenv("VISUAL_MAX_CONCURRENT", "5"))

    # ── Cost ───────────────────────────────────────────────────────
    USD_TO_INR: float = float(os.getenv("USD_TO_INR", "83.5"))

    # ── Supported languages ────────────────────────────────────────
    SUPPORTED_LANGUAGES: dict = {
        "en-IN": "English",
        "hi-IN": "Hindi",
        "ta-IN": "Tamil",
        "te-IN": "Telugu",
        "kn-IN": "Kannada",
        "bn-IN": "Bengali",
        "mr-IN": "Marathi",
        "gu-IN": "Gujarati",
        "ml-IN": "Malayalam",
        "pa-IN": "Punjabi",
    }


settings = Settings()
