# T021 — E03 acceptance and first deploy

**Status:** Backlog

**Epic:** E03

## Objective

Confirm E03 end to end and verify the live GitHub Pages deploy.

## Dependencies

- T020

## Implementation Contract

### Steps (coordinator-run: needs git push)

1. Clean install and full check: `cd app && rm -rf node_modules dist && npm ci && npm run lint && npm test && npm run build && npm run e2e`.
2. Review screenshots at 1440 and 1024, light and dark, against spec §7.4 and §10.
3. Push `main`; confirm the Actions workflow succeeds and
   `https://kyogreprimalsea.github.io/ML_Assistant/` loads, shows the catalogue, opens
   `#/page/xgboost`, and works offline after first load (service worker registered).
4. Record results in `state/runs.jsonl`.

## Acceptance Criteria

- [ ] All checks pass from a clean install.
- [ ] Live site loads and opens the XGBoost page.
