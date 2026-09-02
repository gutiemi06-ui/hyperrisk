from decimal import ROUND_HALF_UP, Decimal

from .schemas import AccountState, PortfolioRisk, Position, PositionRisk

Q = Decimal("0.0001")


def quantize(value: Decimal) -> Decimal:
    return value.quantize(Q, rounding=ROUND_HALF_UP)


def position_notional(position: Position, mark: Decimal | None = None) -> Decimal:
    return abs(position.size) * (mark or position.mark_price)


def local_unrealized_pnl(position: Position, mark: Decimal | None = None) -> Decimal:
    active_mark = mark or position.mark_price
    return position.size * (active_mark - position.entry_price)


def liquidation_distance(position: Position, mark: Decimal | None = None) -> Decimal | None:
    if position.liquidation_price is None:
        return None
    active_mark = mark or position.mark_price
    return abs(active_mark - position.liquidation_price) / active_mark * Decimal("100")


def hourly_funding_estimate(position: Position, mark: Decimal | None = None, multiplier: Decimal = Decimal("1")) -> Decimal:
    # Positive funding: longs pay shorts. Returned value is account P&L impact.
    side_sign = Decimal("1") if position.size > 0 else Decimal("-1")
    return -(position_notional(position, mark) * position.funding_rate_hourly * side_sign * multiplier)


def calculate_portfolio_risk(account: AccountState) -> PortfolioRisk:
    risks: list[PositionRisk] = []
    long_exposure = Decimal("0")
    short_exposure = Decimal("0")
    total_pnl = Decimal("0")
    total_funding = Decimal("0")
    by_asset: dict[str, Decimal] = {}
    liq_distances: list[Decimal] = []

    for position in account.positions:
        notional = position_notional(position)
        pnl = position.unrealized_pnl_protocol if position.unrealized_pnl_protocol is not None else local_unrealized_pnl(position)
        funding = hourly_funding_estimate(position)
        distance = liquidation_distance(position)
        if position.size >= 0:
            long_exposure += notional
        else:
            short_exposure += notional
        total_pnl += pnl
        total_funding += funding
        by_asset[position.asset] = by_asset.get(position.asset, Decimal("0")) + notional
        if distance is not None:
            liq_distances.append(distance)
        risks.append(PositionRisk(asset=position.asset, side=position.side, margin_mode=position.margin_mode, notional=quantize(notional), unrealized_pnl=quantize(pnl), liquidation_distance_pct=quantize(distance) if distance is not None else None, hourly_funding_estimate=quantize(funding), protocol_pnl_available=position.unrealized_pnl_protocol is not None))

    gross = long_exposure + short_exposure
    concentration = {asset: quantize(notional / gross * 100) for asset, notional in by_asset.items()} if gross else {}
    exact = ["account_value", "withdrawable", "position.mark_price", "position.liquidation_price"]
    if account.total_margin_used_protocol is not None:
        exact.append("total_margin_used_protocol")
    if all(position.unrealized_pnl_protocol is not None for position in account.positions):
        exact.append("position.unrealized_pnl_protocol")
    return PortfolioRisk(
        account_value=quantize(account.account_value), gross_exposure=quantize(gross), long_exposure=quantize(long_exposure), short_exposure=quantize(short_exposure), net_exposure=quantize(long_exposure - short_exposure),
        effective_leverage=quantize(gross / account.account_value), unrealized_pnl=quantize(total_pnl), hourly_funding_estimate=quantize(total_funding), concentration_pct=concentration,
        minimum_liquidation_distance_pct=quantize(min(liq_distances)) if liq_distances else None, positions=risks, exact_protocol_fields=exact,
        estimated_fields=["gross_exposure", "long_exposure", "short_exposure", "net_exposure", "effective_leverage", "hourly_funding_estimate", "concentration_pct", "minimum_liquidation_distance_pct"],
    )
