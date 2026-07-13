"""
GLM-5.2 via OpenRouter — streaming + structured JSON output.
Every call records token usage via TokenTracker.
"""
from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import httpx
from openai import AsyncOpenAI

from backend.config import settings
from backend.services.token_tracker import get_tracker

logger = logging.getLogger("services.llm")

_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.OPENROUTER_ENDPOINT,
            api_key=settings.OPENROUTER_API_KEY,
            timeout=httpx.Timeout(settings.LLM_TIMEOUT_SECONDS, connect=10.0),
            default_headers={
                "HTTP-Referer": "https://athena.app",
                "X-Title": "Athena AI Learning Platform",
            },
        )
    return _client


async def llm_chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: dict | None = None,
    agent: str = "unknown",
    session_id: str = "",
) -> str:
    client = get_llm_client()
    resolved_model = model or settings.OPENROUTER_MODEL
    models_to_try = [resolved_model]
    if settings.OPENROUTER_FALLBACK_MODEL and settings.OPENROUTER_FALLBACK_MODEL != resolved_model:
        models_to_try.append(settings.OPENROUTER_FALLBACK_MODEL)

    last_error = None
    for m in models_to_try:
        kwargs: dict = {
            "model": m,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "user": session_id or "anonymous",
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = await client.chat.completions.create(**kwargs)

            # Check choices array
            if not response.choices:
                logger.warning(f"Empty choices from {m} for {agent}")
                last_error = Exception("No choices in response")
                if m != resolved_model:
                    break
                continue

            # Track usage
            tracker = get_tracker()
            usage_obj = getattr(response, "usage", None)
            prompt_tokens = getattr(usage_obj, "prompt_tokens", 0) or 0
            completion_tokens = getattr(usage_obj, "completion_tokens", 0) or 0
            server_cost = getattr(usage_obj, "cost", None)
            cached_tokens = 0
            if hasattr(usage_obj, "prompt_tokens_details") and usage_obj.prompt_tokens_details:
                cached_tokens = getattr(usage_obj.prompt_tokens_details, "cached_tokens", 0) or 0

            tracker.record(
                model=m,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                agent=agent,
                session_id=session_id,
                server_cost=server_cost,
                cached_tokens=cached_tokens,
            )

            content = response.choices[0].message.content or ""
            if m != resolved_model:
                logger.info(f"Fallback model {m} succeeded for {agent}")
            return content

        except Exception as e:
            last_error = e
            if m != resolved_model:
                break
            logger.warning(f"Primary model {m} failed for {agent}: {type(e).__name__}: {e}")
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No models configured")


async def llm_chat_stream(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    agent: str = "unknown",
    session_id: str = "",
) -> AsyncIterator[str]:
    client = get_llm_client()
    resolved_model = model or settings.OPENROUTER_MODEL
    stream = await client.chat.completions.create(
        model=resolved_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        stream_options={"include_usage": True},
    )

    last_usage = None
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
        if hasattr(chunk, "usage") and chunk.usage is not None:
            last_usage = chunk.usage

    if last_usage:
        tracker = get_tracker()
        tracker.record(
            model=resolved_model,
            prompt_tokens=getattr(last_usage, "prompt_tokens", 0) or 0,
            completion_tokens=getattr(last_usage, "completion_tokens", 0) or 0,
            agent=agent,
            session_id=session_id,
        )


def _repair_truncated_json(s: str) -> str:
    out: list[str] = []
    stack: list[str] = []
    in_str = False
    escaped = False
    for ch in s:
        if in_str:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append(ch)
        elif ch in "}]" and stack:
            stack.pop()
        out.append(ch)

    repaired = "".join(out)
    if in_str:
        repaired += '"'
    repaired = repaired.rstrip()
    if repaired.endswith(","):
        repaired = repaired[:-1]
    for ch in reversed(stack):
        repaired += "}" if ch == "{" else "]"
    return repaired


async def llm_json(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 8192,
    agent: str = "unknown",
    session_id: str = "",
) -> dict:
    raw = await llm_chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
        agent=agent,
        session_id=session_id,
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    cleaned = raw
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"[{agent}] JSON truncated; attempting repair")
        try:
            return json.loads(_repair_truncated_json(cleaned))
        except json.JSONDecodeError:
            return {}
