import asyncio
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import websockets


@dataclass
class ConnectionStatus:
    state: str = "disconnected"
    reconnect_attempts: int = 0
    malformed_messages: int = 0
    dropped_messages: int = 0
    last_message_at: datetime | None = None


@dataclass
class ResilientWebSocket:
    url: str
    subscriptions: list[dict[str, Any]]
    queue_size: int = 1000
    max_backoff_seconds: float = 30.0
    status: ConnectionStatus = field(default_factory=ConnectionStatus)

    async def run(self, handler: Callable[[dict[str, Any]], Awaitable[None]], stop: asyncio.Event) -> None:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=self.queue_size)

        async def consume() -> None:
            while not stop.is_set():
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=0.5)
                except TimeoutError:
                    continue
                try:
                    await handler(message)
                finally:
                    queue.task_done()

        consumer = asyncio.create_task(consume())
        try:
            while not stop.is_set():
                try:
                    self.status.state = "connecting"
                    async with websockets.connect(self.url, open_timeout=5, ping_interval=20, ping_timeout=10, max_size=2**20) as socket:
                        self.status.state = "connected"
                        for subscription in self.subscriptions:
                            await socket.send(json.dumps({"method": "subscribe", "subscription": subscription}))
                        async for raw in socket:
                            if stop.is_set():
                                break
                            try:
                                message = json.loads(raw)
                                if not isinstance(message, dict) or "channel" not in message:
                                    raise ValueError("unexpected message shape")
                            except (json.JSONDecodeError, ValueError):
                                self.status.malformed_messages += 1
                                continue
                            self.status.last_message_at = datetime.now(UTC)
                            if queue.full():
                                queue.get_nowait()
                                queue.task_done()
                                self.status.dropped_messages += 1
                            queue.put_nowait(message)
                    self.status.reconnect_attempts = 0
                except (OSError, websockets.WebSocketException, TimeoutError):
                    self.status.state = "reconnecting"
                    self.status.reconnect_attempts += 1
                    delay = min(self.max_backoff_seconds, 0.5 * 2 ** (self.status.reconnect_attempts - 1))
                    try:
                        await asyncio.wait_for(stop.wait(), timeout=delay)
                    except TimeoutError:
                        pass
        finally:
            self.status.state = "disconnected"
            consumer.cancel()
            await asyncio.gather(consumer, return_exceptions=True)
