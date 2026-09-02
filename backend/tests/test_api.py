from fastapi.testclient import TestClient

from hyperrisk.main import app


def test_health_readiness_and_demo_workflow() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        ready = client.get("/ready").json()
        assert ready == {"status": "ready", "mode": "read-only"}
        response = client.get("/api/v1/demo")
        assert response.status_code == 200
        payload = response.json()
        assert payload["account"]["source"] == "synthetic_fixture"
        assert payload["risk"]["effective_leverage"] == "2.6802"
        assert payload["alerts"]
        assert payload["explanation"]["source"] == "template"
        stream = client.get("/api/v1/stream/status")
        assert stream.status_code == 200
        assert set(stream.json()) >= {
            "state",
            "reconnect_attempts",
            "malformed_messages",
            "dropped_messages",
            "stale",
        }


def test_invalid_wallet_is_rejected_before_upstream_call() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/portfolio/not-a-wallet")
        assert response.status_code == 422
