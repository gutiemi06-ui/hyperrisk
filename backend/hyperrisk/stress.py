from decimal import Decimal

from .risk import liquidation_distance, position_notional, quantize
from .schemas import AccountState, StressResult, StressScenario


def run_stress(account: AccountState, scenario: StressScenario) -> StressResult:
    pnl_change = Decimal("0")
    stressed_marks: dict[str, Decimal] = {}
    notionals: dict[str, Decimal] = {}
    liq_distances: list[Decimal] = []

    for position in account.positions:
        shock = scenario.asset_shocks_pct.get(position.asset, Decimal("0")) / Decimal("100")
        stressed_mark = position.mark_price * (Decimal("1") + shock)
        stressed_marks[position.asset] = quantize(stressed_mark)
        pnl_change += position.size * (stressed_mark - position.mark_price)
        notional = position_notional(position, stressed_mark)
        notionals[position.asset] = notionals.get(position.asset, Decimal("0")) + notional
        distance = liquidation_distance(position, stressed_mark)
        if distance is not None:
            liq_distances.append(distance)

    gross = sum(notionals.values(), Decimal("0"))
    volatility_haircut = gross * abs(scenario.volatility_expansion_pct) / Decimal("100") * Decimal("0.015")
    correlation_haircut = gross * abs(scenario.correlation_change_pct) / Decimal("100") * Decimal("0.01")
    funding_change = Decimal("0")
    for position in account.positions:
        mark = stressed_marks[position.asset]
        side_sign = Decimal("1") if position.size > 0 else Decimal("-1")
        baseline = -(abs(position.size) * mark * position.funding_rate_hourly * side_sign)
        funding_change += baseline * (scenario.funding_multiplier - Decimal("1"))
    pnl_change -= volatility_haircut + correlation_haircut
    pnl_change += funding_change
    equity = account.account_value + pnl_change
    leverage = gross / equity if equity > 0 else None
    concentration = {asset: quantize(notional / gross * 100) for asset, notional in notionals.items()} if gross else {}
    return StressResult(
        scenario=scenario.name, estimated_pnl_change=quantize(pnl_change), estimated_account_equity=quantize(equity), estimated_effective_leverage=quantize(leverage) if leverage is not None else None,
        estimated_concentration_pct=concentration, minimum_liquidation_distance_pct=quantize(min(liq_distances)) if liq_distances else None, stressed_marks=stressed_marks,
        assumptions=["Linear mark-to-market P&L; position sizes do not change.", "Liquidation distance uses protocol-supplied liquidation prices held constant.", "Volatility expansion applies a 1.5% of gross notional haircut per 100% expansion.", "Correlation change applies a 1% of gross notional haircut per 100 percentage-point change.", "Funding spike models one hourly payment at the stressed notional; this is not an official liquidation calculation."],
    )
