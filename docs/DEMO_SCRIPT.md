# Two-minute interview demo

**0:00–0:20 — Safety and product.** “HyperRisk is a read-only risk terminal for Hyperliquid. It starts with a deterministic synthetic account, needs no wallet connection or API key, and the codebase contains no signing or trade path.” Point to the fixture label, connection status, and read-only badge.

**0:20–0:45 — Risk overview.** Call out account equity, gross exposure, effective leverage, unrealized P&L, and the nearest liquidation distance. Open Portfolio and explain that protocol values and local Decimal calculations are labelled separately. Show long/short/net exposure and concentration.

**0:45–1:15 — Stress engine.** Open Stress test and select “Crypto crash.” Move the BTC slider. Explain signed mark-to-market P&L, stressed equity, leverage, fixed position/liquidation assumptions, and the explicit volatility/funding haircuts. Emphasize that results are estimates, not a reimplementation of Hyperliquid’s liquidation engine.

**1:15–1:35 — Explainable alerts.** Open Alerts. Show an event’s observed value, configured threshold, method, and why it fired. Mention rolling z-scores for market anomalies and that the product does not claim predictive power.

**1:35–1:50 — Replay and resilience.** Open Replay, select 4×, and play. Show bid/ask, spread, depth, imbalance, and the deterministic event. Mention the bounded queue, malformed-message rejection, heartbeat, resubscription, and exponential backoff.

**1:50–2:00 — Engineering close.** “FastAPI owns validation and Decimal analytics, PostgreSQL stores UTC snapshots, React renders the terminal, tests cover calculations and reconnect behavior, and CI runs formatting, lint, types, unit tests, E2E, and builds. The AI brief has a deterministic fallback and cannot change or invent metrics.”
