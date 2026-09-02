import time
from contextlib import asynccontextmanager
from decimal import Decimal

import structlog
from fastapi import FastAPI, HTTPException, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .alerts import detect_portfolio_alerts
from .client import HyperliquidClient, HyperliquidError
from .config import get_settings
from .demo import demo_account
from .explainer import template_explanation
from .risk import calculate_portfolio_risk
from .schemas import AccountState, StressResult, StressScenario
from .stress import run_stress

settings = get_settings()
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_: FastAPI):
    structlog.configure(processors=[structlog.contextvars.merge_contextvars, structlog.processors.TimeStamper(fmt="iso", utc=True), structlog.processors.add_log_level, structlog.processors.JSONRenderer()])
    log.info("service_started", environment=settings.app_env)
    yield
    log.info("service_stopped")


app = FastAPI(title="HyperRisk API", version="0.1.0", description="Read-only portfolio risk and market intelligence for Hyperliquid.", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Request-ID"])


@app.middleware("http")
async def request_logging(request: Request, call_next):
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        log.exception("unhandled_request_error", path=request.url.path, error_type=type(exc).__name__)
        return JSONResponse(status_code=500, content={"detail": "internal service error"})
    log.info("request_complete", method=request.method, path=request.url.path, status=response.status_code, duration_ms=round((time.perf_counter() - started) * 1000, 2))
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/health", tags=["operations"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["operations"])
async def readiness() -> dict[str, str]:
    return {"status": "ready", "mode": "read-only"}


def portfolio_payload(account: AccountState) -> dict[str, object]:
    risk = calculate_portfolio_risk(account)
    alerts = detect_portfolio_alerts(risk)
    explanation = template_explanation(risk, alerts)
    return {"account": account, "risk": risk, "alerts": alerts, "explanation": explanation}


@app.get("/api/v1/demo", tags=["portfolio"])
async def demo() -> dict[str, object]:
    return portfolio_payload(demo_account())


@app.get("/api/v1/portfolio/{wallet}", tags=["portfolio"])
async def portfolio(wallet: str = Path(pattern=r"^0x[0-9a-fA-F]{40}$")) -> dict[str, object]:
    client = HyperliquidClient(settings.hyperliquid_rest_url, settings.request_timeout_seconds)
    try:
        account = await client.account_state(wallet.lower())
    except HyperliquidError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return portfolio_payload(account)


@app.get("/api/v1/markets", tags=["markets"])
async def markets() -> object:
    client = HyperliquidClient(settings.hyperliquid_rest_url, settings.request_timeout_seconds)
    try:
        return await client.market_contexts()
    except HyperliquidError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/v1/stress", response_model=StressResult, tags=["risk"])
async def stress(scenario: StressScenario) -> StressResult:
    return run_stress(demo_account(), scenario)


@app.get("/api/v1/replay", tags=["markets"])
async def replay() -> dict[str, object]:
    frames = []
    mid = Decimal("112840")
    for index in range(20):
        mid += Decimal(index % 5 - 2) * Decimal("1.25")
        spread = Decimal("0.40") + Decimal(index % 4) * Decimal("0.05")
        bid = mid - spread / 2
        ask = mid + spread / 2
        imbalance = Decimal(index % 7 - 3) / Decimal("10")
        frames.append({"offset_ms": index * 250, "coin": "BTC", "bid": str(bid), "ask": str(ask), "spread": str(spread), "imbalance": str(imbalance), "bid_depth": str(Decimal("18.2") + Decimal(index) / 5), "ask_depth": str(Decimal("17.6") - Decimal(index % 5) / 6), "event": "spread_zscore" if index == 14 else None})
    return {"fixture": "synthetic-btc-l2-2026-08-31", "deterministic": True, "frames": frames}
