"""Background task queue abstraction.

Currently provides an in-process asyncio queue fallback.
When a message broker (Redis/ARQ) is deployed (Phase 4), swap to the real backend.
"""

import asyncio
import logging
from contextlib import suppress
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


class BackgroundTaskQueue:
    """Simple in-process background task queue.

    Replace with ARQ + Redis for production (persistent, retry, concurrency control).
    """

    def __init__(self, max_concurrency: int = 10) -> None:
        self._queue: asyncio.Queue[tuple[Callable, tuple, dict]] = asyncio.Queue()
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._worker_task: asyncio.Task | None = None

    async def enqueue(self, func: Callable, *args, **kwargs) -> None:
        await self._queue.put((func, args, kwargs))

    async def _worker(self) -> None:
        while True:
            func, args, kwargs = await self._queue.get()
            async with self._semaphore:
                try:
                    if asyncio.iscoroutinefunction(func):
                        await func(*args, **kwargs)
                    else:
                        func(*args, **kwargs)
                except Exception:
                    logger.exception("Background task failed: %s", func.__name__)
            self._queue.task_done()

    def start(self) -> None:
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._worker(), name="bg-task-queue")

    async def stop(self) -> None:
        if self._worker_task:
            self._worker_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._worker_task
            self._worker_task = None

    async def join(self) -> None:
        await self._queue.join()


# Singleton
_task_queue = BackgroundTaskQueue()


async def enqueue_background(func: Callable, *args, **kwargs) -> None:
    await _task_queue.enqueue(func, *args, **kwargs)


def start_queue() -> None:
    _task_queue.start()


async def stop_queue() -> None:
    await _task_queue.stop()
