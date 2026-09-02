# Security

## Security posture

HyperRisk is read-only. It never asks for, stores, transmits, or derives a private key, seed phrase, API wallet key, or signature. The codebase has no order-creation function and never calls Hyperliquid’s `/exchange` endpoint.

## Controls

- Public wallet addresses are validated as exactly 42-character hexadecimal strings.
- Pydantic rejects unexpected financial input fields and malformed decimal values.
- Upstream requests use bounded timeouts, response-size limits on WebSockets, and structured error handling.
- CORS origins are explicit; credentials are disabled.
- Responses include `nosniff`, frame-denial, and no-referrer headers.
- Secrets stay server-side; `.env*`, local databases, build outputs, and test reports are ignored.
- Docker images run as non-root users.
- Optional AI output cannot update calculations, must match a metric fingerprint, and is rejected for fabricated numbers or trade recommendations.
- Synthetic demo data uses a non-personal fixture address and is labelled throughout the UI.

## Threat considerations

- A public address is public-chain data but can still be sensitive when associated with a person. HyperRisk does not create identity profiles and stores only the queried address and risk snapshots.
- Upstream market data is untrusted. Every message is parsed, shape-checked, bounded, and never rendered as HTML.
- Denial-of-service risk is limited with input validation, upstream timeouts, a bounded queue, and Docker resource controls recommended in production.
- Cross-site scripting is mitigated through React escaping and the absence of user-supplied HTML.

## Production checklist

Use TLS everywhere, a least-privilege PostgreSQL role, managed secret storage, database backups, restrictive network rules, API-level rate limiting, dependency scanning, and an explicit retention policy for wallet snapshots. Set `CORS_ORIGINS` to the exact deployed frontend origin.

## Reporting

Do not open public issues for a suspected vulnerability. Contact the repository owner privately with affected versions, reproduction steps, impact, and suggested remediation. No bug bounty is promised.
