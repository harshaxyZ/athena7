"""
Token usage tracker and cost calculator — tracks per-session costs in USD and INR.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from backend.config import settings

logger = logging.getLogger("services.token_tracker")


# Pricing per million tokens (USD)
MODEL_PRICING: dict[str, dict[str, float]] = {
    "z-ai/glm-5.2": {"input": 0.392, "output": 1.232},
    "default": {"input": 0.50, "output": 1.50},
}


def _usd_to_inr(usd: float) -> float:
    return round(usd * settings.USD_TO_INR, 4)


@dataclass
class TokenUsage:
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    input_cost: float = 0.0
    output_cost: float = 0.0
    total_cost: float = 0.0
    total_cost_inr: float = 0.0
    agent: str = ""
    session_id: str = ""
    cached_tokens: int = 0
    server_cost: float | None = None


@dataclass
class AgentUsage:
    agent: str = ""
    calls: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    total_cost_inr: float = 0.0


@dataclass
class SessionUsage:
    session_id: str = ""
    agents: dict[str, AgentUsage] = field(default_factory=dict)
    total_calls: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    total_cost_inr: float = 0.0


class TokenTracker:
    def __init__(self):
        self._sessions: dict[str, SessionUsage] = {}
        self._global = AgentUsage(agent="_global")

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> tuple[float, float]:
        pricing = MODEL_PRICING.get(model, MODEL_PRICING["default"])
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        return input_cost, output_cost

    def record(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        agent: str = "unknown",
        session_id: str = "",
        server_cost: float | None = None,
        cached_tokens: int = 0,
    ) -> TokenUsage:
        total_tokens = prompt_tokens + completion_tokens
        input_cost, output_cost = self._calculate_cost(model, prompt_tokens, completion_tokens)
        total_cost = server_cost if server_cost is not None else (input_cost + output_cost)
        total_cost_inr = _usd_to_inr(total_cost)

        usage = TokenUsage(
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=total_cost,
            total_cost_inr=total_cost_inr,
            agent=agent,
            session_id=session_id,
            cached_tokens=cached_tokens,
            server_cost=server_cost,
        )

        if session_id:
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionUsage(session_id=session_id)
            session = self._sessions[session_id]
            session.total_calls += 1
            session.total_prompt_tokens += prompt_tokens
            session.total_completion_tokens += completion_tokens
            session.total_tokens += total_tokens
            session.total_cost += total_cost
            session.total_cost_inr += total_cost_inr

            if agent not in session.agents:
                session.agents[agent] = AgentUsage(agent=agent)
            agent_usage = session.agents[agent]
            agent_usage.calls += 1
            agent_usage.prompt_tokens += prompt_tokens
            agent_usage.completion_tokens += completion_tokens
            agent_usage.total_tokens += total_tokens
            agent_usage.total_cost += total_cost
            agent_usage.total_cost_inr += total_cost_inr

        self._global.calls += 1
        self._global.prompt_tokens += prompt_tokens
        self._global.completion_tokens += completion_tokens
        self._global.total_tokens += total_tokens
        self._global.total_cost += total_cost
        self._global.total_cost_inr += total_cost_inr

        logger.info(f"[Tokens] {agent}: {prompt_tokens}in/{completion_tokens}out = ${total_cost:.6f} / Rs.{total_cost_inr:.2f}")
        return usage

    def record_from_response(self, response: Any, model: str = "z-ai/glm-5.2", agent: str = "unknown", session_id: str = "") -> TokenUsage | None:
        if not hasattr(response, "usage") or response.usage is None:
            return None
        usage = response.usage
        return self.record(
            model=model,
            prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
            completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
            agent=agent,
            session_id=session_id,
        )

    def get_session(self, session_id: str) -> SessionUsage | None:
        return self._sessions.get(session_id)

    def get_session_summary(self, session_id: str) -> dict | None:
        session = self._sessions.get(session_id)
        if not session:
            return None
        return {
            "session_id": session_id,
            "total_calls": session.total_calls,
            "total_prompt_tokens": session.total_prompt_tokens,
            "total_completion_tokens": session.total_completion_tokens,
            "total_tokens": session.total_tokens,
            "total_cost_usd": round(session.total_cost, 6),
            "total_cost_formatted": f"${session.total_cost:.6f}",
            "total_cost_inr": round(session.total_cost_inr, 2),
            "total_cost_inr_formatted": f"₹{session.total_cost_inr:.2f}",
            "agents": {
                name: {
                    "calls": a.calls,
                    "prompt_tokens": a.prompt_tokens,
                    "completion_tokens": a.completion_tokens,
                    "total_tokens": a.total_tokens,
                    "cost_usd": round(a.total_cost, 6),
                    "cost_inr": round(a.total_cost_inr, 2),
                }
                for name, a in session.agents.items()
            },
        }

    def get_global(self) -> dict:
        return {
            "total_calls": self._global.calls,
            "total_prompt_tokens": self._global.prompt_tokens,
            "total_completion_tokens": self._global.completion_tokens,
            "total_tokens": self._global.total_tokens,
            "total_cost_usd": round(self._global.total_cost, 6),
            "total_cost_inr": round(self._global.total_cost_inr, 2),
        }


_tracker: TokenTracker | None = None


def get_tracker() -> TokenTracker:
    global _tracker
    if _tracker is None:
        _tracker = TokenTracker()
    return _tracker
