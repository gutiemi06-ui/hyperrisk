import pytest

from hyperrisk.alerts import detect_portfolio_alerts
from hyperrisk.demo import demo_account
from hyperrisk.explainer import template_explanation, validate_model_explanation
from hyperrisk.risk import calculate_portfolio_risk


def source_metrics():
    risk = calculate_portfolio_risk(demo_account())
    return risk, detect_portfolio_alerts(risk)


def test_template_fallback_is_deterministic_and_non_advisory() -> None:
    risk, alerts = source_metrics()
    first = template_explanation(risk, alerts)
    second = template_explanation(risk, alerts)
    assert first == second
    assert first.source == "template"
    assert "financial advice" in first.disclaimer


def test_model_output_rejects_fabricated_number() -> None:
    risk, alerts = source_metrics()
    valid = template_explanation(risk, alerts).model_dump()
    valid["source"] = "model"
    valid["summary"] = "Loss probability is 99.9%."
    with pytest.raises(ValueError, match="unverified numeric"):
        validate_model_explanation(valid, risk, alerts)


def test_model_output_rejects_recommendations_and_wrong_fingerprint() -> None:
    risk, alerts = source_metrics()
    payload = template_explanation(risk, alerts).model_dump()
    payload["source"] = "model"
    payload["headline"] = "Buy now"
    with pytest.raises(ValueError, match="prohibited recommendation"):
        validate_model_explanation(payload, risk, alerts)
    payload = template_explanation(risk, alerts).model_dump()
    payload["metric_fingerprint"] = "tampered"
    with pytest.raises(ValueError, match="fingerprint"):
        validate_model_explanation(payload, risk, alerts)
