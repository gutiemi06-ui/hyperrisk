import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from .demo import demo_account
from .persistence import AccountSnapshot, Base, MarketSnapshot, PositionSnapshot, session_factory
from .risk import calculate_portfolio_risk


async def seed() -> None:
    engine, factory = session_factory()
    account = demo_account()
    risk = calculate_portfolio_risk(account)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with factory() as session:
        for index in range(24):
            observed_at = datetime.now(UTC) - timedelta(hours=23 - index)
            drift = Decimal(index - 12) * Decimal("71.25")
            snapshot = AccountSnapshot(wallet=account.wallet, account_value=account.account_value + drift, withdrawable=account.withdrawable, realized_pnl=Decimal("2184.20"), unrealized_pnl=risk.unrealized_pnl + drift, fees=Decimal("-386.42"), funding=Decimal("-38.96"), observed_at=observed_at)
            snapshot.positions = [PositionSnapshot(asset=position.asset, size=position.size, mark_price=position.mark_price * (Decimal("0.98") + Decimal(index) / Decimal("1200")), entry_price=position.entry_price, liquidation_price=position.liquidation_price, margin_mode=position.margin_mode.value) for position in account.positions]
            session.add(snapshot)
        session.add_all([
            MarketSnapshot(asset="BTC", mark_price="112842.40", funding_rate="0.000012", open_interest="3820000000", spread_bps="0.0354", book_imbalance="0.17"),
            MarketSnapshot(asset="ETH", mark_price="4318.60", funding_rate="0.000008", open_interest="1740000000", spread_bps="0.0463", book_imbalance="-0.08"),
            MarketSnapshot(asset="SOL", mark_price="218.74", funding_rate="0.000021", open_interest="684000000", spread_bps="0.1371", book_imbalance="0.31"),
        ])
        await session.commit()
    await engine.dispose()
    print("Seeded 24 deterministic account snapshots and 3 synthetic market snapshots.")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
