# T001 — Python environment and pinned library versions

**Status:** Done (environment setup performed by the coordinator, 2026-10-24)

**Epic:** E01

## Objective

Create the project `.venv`, install the Wave 1 libraries at the latest stable
versions, and pin them (spec §12).

## Outputs

- `requirements.txt` (direct pins), `requirements-lock.txt` (full freeze), `.gitignore`.
- Version table and environment check in `docs/ARCHITECTURE.md`.

## Acceptance Criteria

- [x] `.venv/bin/python -c "import sklearn, statsmodels, scipy, xgboost, lightgbm, imblearn, optuna, shap"` succeeds.
- [x] Pins recorded in `requirements.txt` and `docs/ARCHITECTURE.md`.
