from decimal import Decimal

from hyperrisk.alerts import detect_market_anomalies, detect_portfolio_alerts, rolling_z_score
from hyperrisk.demo import demo_account
from hyperrisk.risk import calculate_portfolio_risk
from hyperrisk.schemas import StressScenario
from hyperrisk.stress import run_stress


def test_btc_negative_shock_reduces_equity_for_net_long_demo() -> None:
    result = run_stress(demo_account(), StressScenario(name="BTC -10%", asset_shocks_pct={"BTC": "-10"}))
    assert result.estimated_pnl_change == Decimal("-7718.4202")
    assert result.estimated_account_equity == Decimal("42123.7598")
    assert result.estimated_effective_leverage > Decimal("2.8")


def test_funding_spike_and_volatility_haircuts_are_explicit() -> None:
    result = run_stress(demo_account(), StressScenario(name="Funding + vol", volatility_expansion_pct="50", correlation_change_pct="20", funding_multiplier="5"))
    assert result.estimated_pnl_change < 0
    assert len(result.assumptions) == 5
    assert "not an official liquidation calculation" in result.assumptions[-1]


def test_stress_is_deterministic() -> None:
    scenario = StressScenario(name="Composite", asset_shocks_pct={"BTC": "-7", "ETH": "-12"}, funding_multiplier="3")
    assert run_stress(demo_account(), scenario) == run_stress(demo_account(), scenario)


def test_portfolio_threshold_alerts_explain_measurements() -> None:
    alerts = detect_portfolio_alerts(calculate_portfolio_risk(demo_account()))
    kinds = {alert.alert_type for alert in alerts}
    assert "concentrated_exposure" in kinds
    assert "liquidation_buffer" in kinds
    assert all(str(alert.observed_value) in alert.explanation for alert in alerts)


def test_rolling_z_score_and_market_alert_threshold() -> None:
    normal = [Decimal("1.0"), Decimal("1.1"), Decimal("0.9"), Decimal("1.0")]
    anomaly = normal + [Decimal("4.0")]
    assert rolling_z_score(anomaly) > Decimal("2")
    alerts = detect_market_anomalies("BTC", anomaly, normal, normal)
    assert [alert.alert_type for alert in alerts] == ["spread_widening"]
    assert "does not predict price direction" in alerts[0].explanation
