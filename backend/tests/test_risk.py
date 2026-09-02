from decimal import Decimal

import pytest
from pydantic import ValidationError

from hyperrisk.demo import demo_account
from hyperrisk.risk import calculate_portfolio_risk, hourly_funding_estimate, local_unrealized_pnl
from hyperrisk.schemas import MarginMode, Position


def test_long_and_short_pnl_have_correct_direction() -> None:
    long = Position(asset="BTC", size="0.1", entry_price="100", mark_price="110", leverage="2", margin_mode=MarginMode.CROSS, margin_used="5")
    short = Position(asset="ETH", size="-2", entry_price="100", mark_price="90", leverage="2", margin_mode=MarginMode.CROSS, margin_used="50")
    assert local_unrealized_pnl(long) == Decimal("1.0")
    assert local_unrealized_pnl(short) == Decimal("20")


def test_exposure_leverage_concentration_and_margin_modes() -> None:
    risk = calculate_portfolio_risk(demo_account())
    assert risk.gross_exposure == Decimal("133584.5216")
    assert risk.long_exposure == Decimal("97308.2816")
    assert risk.short_exposure == Decimal("36276.2400")
    assert risk.net_exposure == Decimal("61032.0416")
    assert risk.effective_leverage == Decimal("2.6802")
    assert risk.concentration_pct["BTC"] == Decimal("57.7793")
    assert {position.margin_mode for position in risk.positions} == {MarginMode.CROSS, MarginMode.ISOLATED}


def test_protocol_pnl_is_used_and_labelled_exact() -> None:
    risk = calculate_portfolio_risk(demo_account())
    assert risk.unrealized_pnl == Decimal("5684.3000")
    assert "position.unrealized_pnl_protocol" in risk.exact_protocol_fields
    assert all(position.protocol_pnl_available for position in risk.positions)


def test_funding_long_pays_positive_rate_short_receives() -> None:
    long, short, _ = demo_account().positions
    assert hourly_funding_estimate(long) < 0
    assert hourly_funding_estimate(short) > 0


def test_decimal_precision_is_not_binary_float_based() -> None:
    position = Position(asset="TEST", size="0.1", entry_price="0.2", mark_price="0.3", leverage="1", margin_mode=MarginMode.CROSS, margin_used="0.1")
    assert local_unrealized_pnl(position) == Decimal("0.01")


@pytest.mark.parametrize("field,value", [("mark_price", None), ("entry_price", "bad"), ("size", True)])
def test_missing_or_malformed_financial_data_rejected(field: str, value: object) -> None:
    payload = dict(asset="BTC", size="1", entry_price="100", mark_price="101", leverage="2", margin_mode="cross", margin_used="20")
    payload[field] = value
    with pytest.raises(ValidationError):
        Position.model_validate(payload)
