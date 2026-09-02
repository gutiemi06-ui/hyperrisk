import asyncio

import pytest
import respx
from httpx import Response

from hyperrisk.client import HyperliquidClient, HyperliquidError
from hyperrisk.websocket import ResilientWebSocket


@respx.mock
@pytest.mark.asyncio
async def test_client_retries_then_reports_malformed_account_data() -> None:
    route = respx.post("https://api.hyperliquid.xyz/info").mock(return_value=Response(200, json={"unexpected": True}))
    client = HyperliquidClient("https://api.hyperliquid.xyz", timeout=1, max_retries=1)
    with pytest.raises(HyperliquidError, match="malformed"):
        await client.account_state("0x0000000000000000000000000000000000000000")
    assert route.call_count == 1


@respx.mock
@pytest.mark.asyncio
async def test_client_retries_rate_limits() -> None:
    route = respx.post("https://api.hyperliquid.xyz/info").mock(side_effect=[Response(429), Response(200, json=[{}, []])])
    client = HyperliquidClient("https://api.hyperliquid.xyz", timeout=1, max_retries=2)
    assert await client.market_contexts() == [{}, []]
    assert route.call_count == 2


@pytest.mark.asyncio
async def test_websocket_reconnects_with_backoff(monkeypatch) -> None:
    def fail_connect(*args, **kwargs):
        raise OSError("offline")

    monkeypatch.setattr("hyperrisk.websocket.websockets.connect", fail_connect)
    socket = ResilientWebSocket("wss://example.invalid/ws", [{"type": "allMids"}], max_backoff_seconds=0.005)
    stop = asyncio.Event()

    async def handler(message):
        raise AssertionError(f"unexpected message: {message}")

    task = asyncio.create_task(socket.run(handler, stop))
    await asyncio.sleep(0.02)
    stop.set()
    await task
    assert socket.status.reconnect_attempts >= 2
    assert socket.status.state == "disconnected"
