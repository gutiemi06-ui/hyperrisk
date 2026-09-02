import asyncio
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

import httpx

from .schemas import AccountState, MarginMode, Position


class HyperliquidError(RuntimeError):
    pass


class HyperliquidClient:
    """Read-only client for the official Hyperliquid info endpoint."""

    def __init__(self, base_url: str, timeout: float = 5.0, max_retries: int = 3):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    async def _info(self, payload: Mapping[str, Any]) -> Any:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    response = await client.post("/info", json=dict(payload))
                    if response.status_code == 429 or response.status_code >= 500:
                        raise httpx.HTTPStatusError("retryable response", request=response.request, response=response)
                    response.raise_for_status()
                    return response.json()
                except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError, ValueError) as exc:
                    if attempt + 1 == self.max_retries:
                        raise HyperliquidError(f"Hyperliquid info request failed after {self.max_retries} attempts") from exc
                    await asyncio.sleep(0.2 * 2**attempt)
        raise HyperliquidError("unreachable retry state")

    async def market_contexts(self) -> Any:
        return await self._info({"type": "metaAndAssetCtxs"})

    async def order_book(self, coin: str) -> Any:
        return await self._info({"type": "l2Book", "coin": coin.upper()})

    async def account_state(self, wallet: str) -> AccountState:
        raw = await self._info({"type": "clearinghouseState", "user": wallet})
        try:
            summary = raw["marginSummary"]
            positions: list[Position] = []
            for wrapper in raw.get("assetPositions", []):
                item = wrapper["position"]
                leverage_info = item.get("leverage") or {}
                positions.append(Position(asset=item["coin"], size=item["szi"], entry_price=item["entryPx"], mark_price=item.get("markPx") or item["entryPx"], liquidation_price=item.get("liquidationPx"), leverage=leverage_info.get("value", "1"), margin_mode=MarginMode.ISOLATED if leverage_info.get("type") == "isolated" else MarginMode.CROSS, margin_used=item.get("marginUsed", "0"), unrealized_pnl_protocol=item.get("unrealizedPnl"), funding_rate_hourly="0"))
            return AccountState(wallet=wallet, account_value=summary["accountValue"], withdrawable=raw.get("withdrawable", "0"), total_margin_used_protocol=summary.get("totalMarginUsed"), positions=positions, observed_at=datetime.now(UTC), source="hyperliquid")
        except (KeyError, TypeError, ValueError) as exc:
            raise HyperliquidError("malformed clearinghouseState response") from exc
