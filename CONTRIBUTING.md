# Contributing

## Development

Follow the local setup in `README.md`. Keep changes read-only: contributions that introduce private-key handling, signing, orders, or `/exchange` calls are out of scope.

Before opening a pull request, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
.venv/bin/ruff check backend
.venv/bin/pytest -q backend
```

## Standards

- Use `Decimal` for backend financial values and PostgreSQL `NUMERIC` for persistence.
- Add a provenance label for every new metric: exact protocol value, local estimate, or synthetic fixture.
- Treat unavailable data as unavailable; never invent it.
- Add tests for both long and short positions, malformed upstream data, boundary thresholds, and deterministic behavior.
- Keep timestamps UTC and error messages structured.
- Preserve keyboard use, visible focus, contrast, empty/error/stale states, and mobile behavior.
- Explain new alert formulas and explicitly state that alerts are not predictions.

## Pull requests

Describe the user-visible change, formula/provenance impact, security impact, and commands run. Include screenshots for UI changes and fixture updates for new data shapes. Do not commit `.env`, personal wallets, database dumps, Playwright traces, or generated build directories.
