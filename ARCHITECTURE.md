# Architecture

## Goals and constraints

HyperRisk is a read-only risk-monitoring surface. The architectural boundary that matters most is that no module accepts a private key or constructs a signed action. The only upstream HTTP path is `/info`; the only WebSocket actions are public `subscribe` messages.

The MVP uses a Next.js/TypeScript client, FastAPI analytics service, and PostgreSQL. Redis is omitted because one bounded asynchronous queue provides backpressure for a single ingestion replica. If ingestion scales horizontally, Redis Streams or Kafka can replace that queue behind the same normalized-event interface.

## Modules

### Hyperliquid client

`backend/hyperrisk/client.py` calls official public info types such as `metaAndAssetCtxs`, `l2Book`, and `clearinghouseState`. It applies a five-second timeout by default, retries rate limits and transient server failures, and converts malformed responses to a domain error.

### WebSocket ingestion

`backend/hyperrisk/websocket.py` connects with heartbeat timeouts, subscribes to typed public feeds, rejects malformed JSON/shapes, records status counters, and places normalized messages on a bounded queue. When full, it drops the oldest message so the risk UI prefers fresher state over an ever-growing backlog. Reconnect uses capped exponential backoff and resubscribes after every connection.

### Normalized schemas

`backend/hyperrisk/schemas.py` owns module contracts. Pydantic forbids unexpected fields in financial inputs, validates addresses and symbols, converts numeric strings through `Decimal(str(value))`, and distinguishes `cross` from `isolated` margin.

### Risk and stress engines

`risk.py` is pure and deterministic. It prefers protocol-reported P&L, labels exact versus estimated fields, and calculates exposure, leverage, concentration, funding impact, and liquidation distance. `stress.py` applies price shocks, modelled volatility/correlation haircuts, and one-hour funding multipliers without mutating account state.

### Alerts

`alerts.py` implements configured thresholds and rolling population z-scores. Every alert includes the observed value, threshold, reason, UTC detection time, and a non-predictive explanation.

### Explainer

`explainer.py` produces a deterministic summary by default. Optional model-shaped output must pass a strict Pydantic schema, match a fingerprint of the current metrics and alerts, contain no unknown numbers, and contain no buy/sell/long/short recommendation language.

### Persistence

SQLAlchemy models use PostgreSQL `NUMERIC(38, 12+)` for financial values and timezone-aware columns. Account snapshots own position snapshots; market snapshots store mark, funding, open interest, spread, and imbalance. The seed command writes deterministic reviewer data.

### Frontend

The client defaults to the synthetic fixture and remains useful with no API. A live wallet path validates the address before calling FastAPI. Each view has loading/error/freshness cues and uses restrained semantic green, red, and amber. Mobile layout changes the left rail to a bottom navigation bar.

## Data ownership and provenance

| Data                                                               | Owner                                | Label                              |
| ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------- |
| Account value, withdrawable, reported P&L, mark/liquidation prices | Hyperliquid response                 | Exact protocol value when returned |
| Exposure, leverage, concentration, funding impact, liq distance    | Risk engine                          | Local estimate                     |
| Stress results                                                     | Stress engine                        | Local scenario estimate            |
| Historical demo/replay                                             | Seed fixture                         | Synthetic                          |
| AI brief                                                           | Template or validated optional model | Derived only from current metrics  |

Unavailable upstream fields stay `null` or zero only where zero is semantically correct. They are never filled with plausible-looking invented values.

## Failure model

- **REST timeout/429/5xx:** exponential retry, then `502` with a stable domain message.
- **Malformed REST data:** reject the payload; preserve the last known snapshot in a full ingestion deployment.
- **WebSocket disconnect:** visible reconnecting state, capped backoff, resubscribe.
- **Malformed frame:** increment counter and discard.
- **Backpressure:** drop oldest queue item and increment counter.
- **Staleness:** compare current UTC with the last message; UI warns after the configured threshold.
- **Database unavailable:** readiness can be extended to fail; seeded client demo remains functional.
- **AI unavailable/invalid:** deterministic template fallback; no metric changes.

## Scaling path

At higher volume, run independent ingestion and API deployments, replace the process queue with a durable partitioned log, batch PostgreSQL writes, add Timescale hypertables/retention, cache immutable fixture responses at the edge, and publish OpenTelemetry metrics for lag, reconnects, rejected frames, and persistence latency.
