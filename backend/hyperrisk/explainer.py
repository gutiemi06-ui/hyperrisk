import hashlib
import json
import re
from decimal import Decimal

from pydantic import ValidationError

from .schemas import Alert, Explanation, PortfolioRisk

NUMBER_RE = re.compile(r"(?<![A-Za-z])[-+]?\d[\d,]*(?:\.\d+)?%?")


def metric_fingerprint(risk: PortfolioRisk, alerts: list[Alert]) -> str:
    payload = {"risk": risk.model_dump(mode="json"), "alerts": [alert.model_dump(mode="json") for alert in alerts]}
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


def template_explanation(risk: PortfolioRisk, alerts: list[Alert]) -> Explanation:
    top_asset, top_concentration = max(risk.concentration_pct.items(), key=lambda item: item[1]) if risk.concentration_pct else ("No asset", Decimal("0"))
    liq = f"{risk.minimum_liquidation_distance_pct}%" if risk.minimum_liquidation_distance_pct is not None else "unavailable"
    risks = [f"{top_asset} is {top_concentration}% of gross exposure.", f"Effective leverage is {risk.effective_leverage}×.", f"The nearest reported liquidation distance is {liq}."]
    if alerts:
        risks.append(f"{len(alerts)} threshold-based alert{'s are' if len(alerts) != 1 else ' is'} active.")
    return Explanation(headline="Portfolio risk is elevated" if alerts else "Portfolio risk is within configured thresholds", summary=f"Gross exposure is ${risk.gross_exposure} against ${risk.account_value} of account equity. Estimated hourly funding impact is ${risk.hourly_funding_estimate}.", risks=risks[:5], disclaimer="Read-only risk monitoring. Estimates are not official Hyperliquid liquidation calculations, predictions, trading recommendations, or financial advice.", source="template", metric_fingerprint=metric_fingerprint(risk, alerts))


def validate_model_explanation(payload: dict[str, object], risk: PortfolioRisk, alerts: list[Alert]) -> Explanation:
    try:
        explanation = Explanation.model_validate(payload)
    except ValidationError as exc:
        raise ValueError("model output failed schema validation") from exc
    if explanation.metric_fingerprint != metric_fingerprint(risk, alerts):
        raise ValueError("model output fingerprint does not match source metrics")
    allowed = set()
    source_json = json.dumps({"risk": risk.model_dump(mode="json"), "alerts": [alert.model_dump(mode="json") for alert in alerts]})
    allowed.update(NUMBER_RE.findall(source_json))
    allowed.update({str(len(alerts)), "1.5", "100"})
    output_text = " ".join([explanation.headline, explanation.summary, *explanation.risks])
    invented = [token for token in NUMBER_RE.findall(output_text) if token.replace(",", "") not in {value.replace(",", "") for value in allowed}]
    if invented:
        raise ValueError(f"model output contains unverified numeric values: {invented}")
    if re.search(r"\b(buy|sell|long|short|trade now|guaranteed)\b", output_text, flags=re.IGNORECASE):
        raise ValueError("model output contains a prohibited recommendation")
    return explanation
