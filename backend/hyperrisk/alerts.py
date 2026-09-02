from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from statistics import mean, pstdev

from .schemas import Alert, PortfolioRisk


def rolling_z_score(values: Sequence[Decimal]) -> Decimal:
    if len(values) < 3:
        return Decimal("0")
    floats = [float(value) for value in values]
    deviation = pstdev(floats[:-1])
    if deviation == 0:
        return Decimal("0")
    return Decimal(str((floats[-1] - mean(floats[:-1])) / deviation))


def detect_portfolio_alerts(risk: PortfolioRisk, *, leverage_threshold: Decimal = Decimal("3"), concentration_threshold: Decimal = Decimal("50"), liquidation_threshold: Decimal = Decimal("22")) -> list[Alert]:
    alerts: list[Alert] = []
    now = datetime.now(UTC)
    if risk.effective_leverage >= leverage_threshold:
        alerts.append(Alert(alert_type="elevated_leverage", severity="high", title="Effective leverage is elevated", explanation=f"Gross exposure is {risk.effective_leverage}× account equity, meeting the configured {leverage_threshold}× threshold.", observed_value=risk.effective_leverage, threshold=leverage_threshold, detected_at=now))
    for asset, concentration in risk.concentration_pct.items():
        if concentration >= concentration_threshold:
            alerts.append(Alert(alert_type="concentrated_exposure", severity="medium", asset=asset, title=f"{asset} exposure concentration", explanation=f"{asset} represents {concentration}% of gross exposure, meeting the configured {concentration_threshold}% threshold.", observed_value=concentration, threshold=concentration_threshold, detected_at=now))
    if risk.minimum_liquidation_distance_pct is not None and risk.minimum_liquidation_distance_pct <= liquidation_threshold:
        alerts.append(Alert(alert_type="liquidation_buffer", severity="high", title="Liquidation buffer is narrowing", explanation=f"The nearest mark-to-liquidation distance is {risk.minimum_liquidation_distance_pct}%, at or below the configured {liquidation_threshold}% threshold.", observed_value=risk.minimum_liquidation_distance_pct, threshold=liquidation_threshold, detected_at=now))
    return alerts


def detect_market_anomalies(asset: str, spreads_bps: Sequence[Decimal], imbalances: Sequence[Decimal], funding_rates: Sequence[Decimal], z_threshold: Decimal = Decimal("2")) -> list[Alert]:
    signals = [("spread_widening", "Unusual spread widening", spreads_bps), ("book_imbalance", "Order-book imbalance", imbalances), ("funding_change", "Rapid funding change", funding_rates)]
    alerts: list[Alert] = []
    for alert_type, title, values in signals:
        score = abs(rolling_z_score(values))
        if score >= z_threshold:
            alerts.append(Alert(alert_type=alert_type, severity="medium", asset=asset, title=title, explanation=f"The latest {alert_type.replace('_', ' ')} reading has a rolling z-score of {score:.2f}, meeting the {z_threshold} threshold. This alert does not predict price direction.", observed_value=score, threshold=z_threshold))
    return alerts
