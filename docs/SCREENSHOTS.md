# Screenshot workflow

Install the Playwright browser once, start the API and frontend, and capture at consistent viewports:

```bash
npx playwright install chromium
.venv/bin/uvicorn hyperrisk.main:app --app-dir backend --port 8000
npm run dev -- --host 127.0.0.1 --port 4173
```

Use Playwright’s screenshot API or the browser’s full-page capture at:

- Desktop: `1440 × 1000`, device scale factor `1`.
- Mobile: `390 × 844`, device scale factor `1`.

Recommended order for the README and LinkedIn carousel:

1. Overview with the seeded-demo label, equity chart, risk signal, positions, and alerts.
2. Stress test with “Crypto crash” active and the formula panel visible.
3. Markets with the BTC depth chart and ingestion-state strip.
4. Alert event timeline with observed values and thresholds.
5. Order-book replay at an event frame.
6. Mobile overview showing bottom navigation and responsive metric cards.

Before capturing, keep the synthetic fixture selected, reset stress controls, restart replay, and ensure no personal wallet or local URL containing credentials appears. Optimize PNG files losslessly and place them in `docs/screenshots/`. Screenshot files are documentation artifacts; never use fabricated data that is not visibly labelled.
