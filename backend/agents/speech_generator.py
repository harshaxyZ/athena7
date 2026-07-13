"""
Agent 5: Speech Script Generator (runs in PARALLEL)
Optimizes speech scripts for TTS and translates to the user's language.
"""
from __future__ import annotations

from backend.dag.context import AgentContext, LessonStep
from backend.services.llm import llm_chat

LANGUAGE_NAMES = {
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

STEP_SPEECH_SYSTEM_PROMPT = """You are an expert educational scriptwriter optimizing ONE lesson step's narration for text-to-speech (TTS).

Rewrite the narration in the TARGET LANGUAGE, optimized for natural spoken delivery:
- Keep technical terms in English where that sounds natural
- Break long sentences into short spoken phrases; add natural pauses with "..."
- Use spoken language, not written language
- Keep numbers and math formulas readable

NEVER read code or symbols out character-by-character. A teacher SAYS what code MEANS,
they don't spell out punctuation. Convert every code snippet, symbol, and operator into the
plain spoken words a human teacher would actually say:
- `__name__ == "__main__"` → "the special main check" or "when the file is run directly"
- `==` → "is equal to"; `=` → "is set to"; `!=` → "is not equal to"; `>=` → "is at least"
- `board[i]` → "board at index i"; `()` / `[]` / `{}` → describe purpose, don't say "bracket"
- `_`, `__`, `#`, `*`, `/`, `\`, backticks, quotes → NEVER say "underscore", "hash", "star", "backtick" etc.
- Function/variable names in snake_case or camelCase → say them as normal words (check_draw → "check draw")
- Strip markdown, backticks, and quote characters entirely.
If the source narration contains raw code, PARAPHRASE it into what it does — do not transcribe it.

Return ONLY the rewritten narration text — no JSON, no quotes, no labels, no explanation."""


async def generate_step_speech(ctx: AgentContext, step: "LessonStep") -> str:
    """Localize+optimize ONE step's narration. Runs per-scene so audio starts ASAP."""
    if not step.speech_script:
        return ""

    target_lang = LANGUAGE_NAMES.get(ctx.language, ctx.language)
    messages = [
        {"role": "system", "content": STEP_SPEECH_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Target Language: {target_lang}\n"
                f"Student Class Level: {ctx.student_class}\n\n"
                f"Narration:\n{step.speech_script}"
            ),
        },
    ]

    try:
        text = (await llm_chat(
            messages=messages, temperature=0.3, max_tokens=1500,
            agent="speech_generator", session_id=ctx.session_id,
        )).strip()
    except Exception:
        text = step.speech_script  # fall back to the original narration

    step.speech_script_localized = text
    ctx.localized_speech_map[step.step_id] = text
    return text
