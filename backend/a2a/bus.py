"""
In-process A2A message bus.

Agents register as consumers of a "skill" and pull Tasks from a per-skill
inbox queue, process them concurrently (bounded), and resolve the caller's
future with the resulting Artifact. `request()` is the request/reply helper the
orchestrator uses; agents genuinely run as independent parallel consumers.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from .messages import Artifact, Message, Task, TaskState

logger = logging.getLogger("a2a.bus")

# An agent handler: consumes an input Message, returns its output Artifact.
Handler = Callable[[Message], Awaitable[Artifact]]


class MessageBus:
    def __init__(self) -> None:
        self._inboxes: dict[str, asyncio.Queue[Task]] = {}
        self._pending: dict[str, asyncio.Future[Artifact]] = {}
        self._consumers: list[asyncio.Task] = []

    def _inbox(self, skill: str) -> asyncio.Queue[Task]:
        return self._inboxes.setdefault(skill, asyncio.Queue())

    # -- agent side ---------------------------------------------------------

    def register(self, skill: str, handler: Handler, concurrency: int = 1) -> None:
        """Start a consumer loop that serves `skill`, up to `concurrency` in parallel."""
        inbox = self._inbox(skill)
        sem = asyncio.Semaphore(concurrency)

        async def process(task: Task) -> None:
            task.state = TaskState.WORKING
            fut = self._pending.get(task.id)
            try:
                async with sem:
                    artifact = await handler(task.input)
                task.artifact = artifact
                task.state = TaskState.COMPLETED
                logger.info(f"[A2A] {skill} completed task={task.id[:8]} ctx={task.context_id[:8]}")
                if fut and not fut.done():
                    fut.set_result(artifact)
            except Exception as e:
                task.state = TaskState.FAILED
                task.error = str(e)
                logger.warning(f"[A2A] {skill} failed task={task.id[:8]}: {e}")
                if fut and not fut.done():
                    fut.set_exception(e)

        async def loop() -> None:
            while True:
                task = await inbox.get()
                asyncio.create_task(process(task))

        self._consumers.append(asyncio.create_task(loop()))

    # -- caller side --------------------------------------------------------

    async def request(self, skill: str, message: Message) -> Artifact:
        """Submit a task to `skill` and await its Artifact."""
        task = Task(skill=skill, context_id=message.context_id, input=message)
        message.task_id = task.id
        fut: asyncio.Future[Artifact] = asyncio.get_running_loop().create_future()
        self._pending[task.id] = fut
        logger.info(f"[A2A] submit {skill} task={task.id[:8]} ctx={task.context_id[:8]}")
        await self._inbox(skill).put(task)
        try:
            return await fut
        finally:
            self._pending.pop(task.id, None)

    async def aclose(self) -> None:
        """Stop all consumer loops (called when a session's work is done)."""
        for c in self._consumers:
            c.cancel()
        for c in self._consumers:
            try:
                await c
            except asyncio.CancelledError:
                pass
        self._consumers.clear()
