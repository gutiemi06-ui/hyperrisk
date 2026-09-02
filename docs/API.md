# API specification

Base path: `/api/v1`. All endpoints are read-only except stress evaluation, which is a pure calculation and does not persist or trade. FastAPI publishes the machine-readable OpenAPI document at `/openapi.json` and interactive docs at `/docs`.

## Operations

### `GET /health`

Liveness probe. Returns `{"status":"ok"}`.

### `GET /ready`

Readiness and safety mode. Returns `{"status":"ready","mode":"read-only"}`.

## Portfolio

### `GET /api/v1/demo`

Returns the deterministic synthetic `account`, calculated `risk`, threshold `alerts`, and deterministic `explanation`. No network or database is required.

### `GET /api/v1/portfolio/{wallet}`

Reads a public wallet from Hyperliquid `clearinghouseState`. `wallet` must match `^0x[0-9a-fA-F]{40}$`. Returns the same envelope as the demo. Responses:

- `200`: normalized account and analytics.
- `422`: invalid address.
- `502`: upstream timeout, rate-limit exhaustion, server failure, or malformed data.

## Markets

### `GET /api/v1/markets`

Proxies the official `metaAndAssetCtxs` info response with bounded retry behavior. No inferred values are added.

### `GET /api/v1/stream/status`

Reports the background public WebSocket consumer state, reconnect attempts, malformed and dropped frame counts, last-message age, stale flag, and active channels. The service subscribes to `allMids`, BTC `l2Book`, BTC `trades`, and BTC `activeAssetCtx` and always prefers the freshest frame under backpressure.

### `GET /api/v1/replay`

Returns fixture id, deterministic flag, and 20 frames containing `offset_ms`, `coin`, `bid`, `ask`, `spread`, `imbalance`, `bid_depth`, `ask_depth`, and optional `event`.

## Risk

### `POST /api/v1/stress`

Request:

```json
{
  "name": "Crypto crash",
  "asset_shocks_pct": { "BTC": "-10", "ETH": "-15" },
  "volatility_expansion_pct": "60",
  "correlation_change_pct": "20",
  "funding_multiplier": "5"
}
```

Bounds: asset shocks `[-100, 500]`, funding multiplier `[0, 20]`. Unknown fields are rejected.

Response fields include scenario P&L, stressed equity, estimated leverage, concentration, minimum liquidation distance, stressed marks, and the complete assumptions list. Financial values serialize as decimal strings.

## Core schemas

- `Position`: asset, signed size, entry/mark/liquidation prices, leverage, margin mode, margin used, optional protocol P&L, and hourly funding rate.
- `PortfolioRisk`: exposures, leverage, P&L, funding estimate, concentration, liquidation distance, per-position risk, and exact/estimated field lists.
- `Alert`: type, severity, optional asset, title, explanation, observed value, threshold, and UTC timestamp.
- `Explanation`: headline, summary, risk list, disclaimer, source, and metric fingerprint.

The generated OpenAPI schema is authoritative for exact field constraints.
