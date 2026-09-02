from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator


def to_decimal(value: object) -> Decimal:
    if value is None or isinstance(value, bool):
        raise ValueError("financial values cannot be null or boolean")
    try:
        return Decimal(str(value))
    except Exception as exc:
        raise ValueError("invalid decimal value") from exc


Money = Annotated[Decimal, BeforeValidator(to_decimal)]


class MarginMode(StrEnum):
    CROSS = "cross"
    ISOLATED = "isolated"


class Position(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset: str = Field(pattern=r"^[A-Z0-9:@._-]{1,24}$")
    size: Money
    entry_price: Money = Field(gt=0)
    mark_price: Money = Field(gt=0)
    liquidation_price: Money | None = Field(default=None, gt=0)
    leverage: Money = Field(gt=0)
    margin_mode: MarginMode
    margin_used: Money = Field(ge=0)
    unrealized_pnl_protocol: Money | None = None
    funding_rate_hourly: Money = Decimal("0")

    @property
    def side(self) -> Literal["long", "short"]:
        return "long" if self.size >= 0 else "short"


class AccountState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wallet: str
    account_value: Money = Field(gt=0)
    withdrawable: Money = Field(ge=0)
    total_margin_used_protocol: Money | None = Field(default=None, ge=0)
    positions: list[Position]
    observed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    source: Literal["hyperliquid", "synthetic_fixture"] = "synthetic_fixture"

    @field_validator("wallet")
    @classmethod
    def validate_wallet(cls, value: str) -> str:
        if len(value) != 42 or not value.startswith("0x"):
            raise ValueError("wallet must be a 42-character 0x address")
        try:
            int(value[2:], 16)
        except ValueError as exc:
            raise ValueError("wallet must contain hexadecimal characters") from exc
        return value.lower()


class PositionRisk(BaseModel):
    asset: str
    side: Literal["long", "short"]
    margin_mode: MarginMode
    notional: Money
    unrealized_pnl: Money
    liquidation_distance_pct: Money | None
    hourly_funding_estimate: Money
    protocol_pnl_available: bool


class PortfolioRisk(BaseModel):
    account_value: Money
    gross_exposure: Money
    long_exposure: Money
    short_exposure: Money
    net_exposure: Money
    effective_leverage: Money
    unrealized_pnl: Money
    hourly_funding_estimate: Money
    concentration_pct: dict[str, Money]
    minimum_liquidation_distance_pct: Money | None
    positions: list[PositionRisk]
    exact_protocol_fields: list[str]
    estimated_fields: list[str]


class StressScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    asset_shocks_pct: dict[str, Money] = Field(default_factory=dict)
    volatility_expansion_pct: Money = Decimal("0")
    correlation_change_pct: Money = Decimal("0")
    funding_multiplier: Money = Field(default=Decimal("1"), ge=0, le=20)

    @field_validator("asset_shocks_pct")
    @classmethod
    def validate_shocks(cls, shocks: dict[str, Decimal]) -> dict[str, Decimal]:
        if any(value < -100 or value > 500 for value in shocks.values()):
            raise ValueError("asset shocks must be between -100% and 500%")
        return {asset.upper(): value for asset, value in shocks.items()}


class StressResult(BaseModel):
    scenario: str
    estimated_pnl_change: Money
    estimated_account_equity: Money
    estimated_effective_leverage: Money | None
    estimated_concentration_pct: dict[str, Money]
    minimum_liquidation_distance_pct: Money | None
    stressed_marks: dict[str, Money]
    assumptions: list[str]


class Alert(BaseModel):
    alert_type: str
    severity: Literal["info", "medium", "high"]
    asset: str | None = None
    title: str
    explanation: str
    observed_value: Money
    threshold: Money
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Explanation(BaseModel):
    headline: str
    summary: str
    risks: list[str] = Field(max_length=5)
    disclaimer: str
    source: Literal["template", "model"]
    metric_fingerprint: str
