from decimal import Decimal

from .schemas import AccountState, MarginMode, Position

DEMO_WALLET = "0x7a3e0000000000000000000000000000000091c2"


def demo_account() -> AccountState:
    return AccountState(
        wallet=DEMO_WALLET,
        account_value=Decimal("49842.18"),
        withdrawable=Decimal("21308.44"),
        total_margin_used_protocol=Decimal("21476.80"),
        source="synthetic_fixture",
        positions=[
            Position(asset="BTC", size="0.684", entry_price="108215.20", mark_price="112842.40", liquidation_price="93420", leverage="3.2", margin_mode=MarginMode.CROSS, margin_used="11340.25", unrealized_pnl_protocol="3165.80", funding_rate_hourly="0.000012"),
            Position(asset="ETH", size="-8.4", entry_price="4472.10", mark_price="4318.60", liquidation_price="4890.70", leverage="2.4", margin_mode=MarginMode.CROSS, margin_used="8338.10", unrealized_pnl_protocol="1289.40", funding_rate_hourly="0.000008"),
            Position(asset="SOL", size="92", entry_price="205.38", mark_price="218.74", liquidation_price="174.12", leverage="4.1", margin_mode=MarginMode.ISOLATED, margin_used="1798.45", unrealized_pnl_protocol="1229.10", funding_rate_hourly="0.000021"),
        ],
    )
