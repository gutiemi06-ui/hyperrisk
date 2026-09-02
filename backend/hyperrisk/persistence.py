from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from .config import get_settings


class Base(AsyncAttrs, DeclarativeBase):
    pass


class AccountSnapshot(Base):
    __tablename__ = "account_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    wallet: Mapped[str] = mapped_column(String(42), index=True)
    account_value: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    withdrawable: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(38, 12), default=Decimal("0"))
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(38, 12), default=Decimal("0"))
    fees: Mapped[Decimal] = mapped_column(Numeric(38, 12), default=Decimal("0"))
    funding: Mapped[Decimal] = mapped_column(Numeric(38, 12), default=Decimal("0"))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    positions: Mapped[list["PositionSnapshot"]] = relationship(back_populates="account_snapshot", cascade="all, delete-orphan")


class PositionSnapshot(Base):
    __tablename__ = "position_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_snapshot_id: Mapped[int] = mapped_column(ForeignKey("account_snapshots.id", ondelete="CASCADE"), index=True)
    asset: Mapped[str] = mapped_column(String(24), index=True)
    size: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    mark_price: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    entry_price: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    liquidation_price: Mapped[Decimal | None] = mapped_column(Numeric(38, 12), nullable=True)
    margin_mode: Mapped[str] = mapped_column(String(12))
    account_snapshot: Mapped[AccountSnapshot] = relationship(back_populates="positions")


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset: Mapped[str] = mapped_column(String(24), index=True)
    mark_price: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    funding_rate: Mapped[Decimal] = mapped_column(Numeric(38, 18))
    open_interest: Mapped[Decimal] = mapped_column(Numeric(38, 12))
    spread_bps: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    book_imbalance: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


def session_factory():
    engine = create_async_engine(get_settings().database_url, pool_pre_ping=True, pool_recycle=300)
    return engine, async_sessionmaker(engine, expire_on_commit=False)
