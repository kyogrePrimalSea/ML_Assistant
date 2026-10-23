# T008 — Run extraction and docs cross-check: XGBoost, LightGBM, imbalanced-learn, Optuna, SHAP

**Status:** Backlog

**Epic:** E01

## Objective

Produce verified extraction records for every inventory item whose library is one of: `xgboost`, `lightgbm`, `imbalanced-learn`, `optuna`, `shap`.

## Dependencies

- T002, T003, T004, T005

## Relevant Files

- `docs/ARCHITECTURE.md`, `tools/extract.py`, `tools/verify_docs.py`, both inventory files.

## Implementation Contract

### Steps

1–2. For each library:
   - `.venv/bin/python tools/extract.py --library xgboost` then `.venv/bin/python tools/verify_docs.py --library xgboost`
   - `.venv/bin/python tools/extract.py --library lightgbm` then `.venv/bin/python tools/verify_docs.py --library lightgbm`
   - `.venv/bin/python tools/extract.py --library imbalanced-learn` then `.venv/bin/python tools/verify_docs.py --library imbalanced-learn`
   - `.venv/bin/python tools/extract.py --library optuna` then `.venv/bin/python tools/verify_docs.py --library optuna`
   - `.venv/bin/python tools/extract.py --library shap` then `.venv/bin/python tools/verify_docs.py --library shap`
3. For every item not `match`: open the official doc page and decide.
   - Extraction wrong or incomplete → write `content/extraction/overrides/<id>.yaml`
     (with `source_url` and `reason`) and re-run steps 1–2 for that id.
   - Docs page and installed version legitimately differ, or the parser is
     wrong → record in the report (do not change the tools; report parser bugs).
4. Spot-check by hand 10% of `match` items (at least 3 per library, all XGBoost/LightGBM classes included):
   compare every parameter, default, attribute and method name with the doc
   page. Record which ones.

### Outputs

- `content/extraction/<library>/*.json` for each library, any overrides, the verification JSON per library.
- `content/extraction/verification/<library>-report.md` per library: counts by status,
  every non-match with its resolution, spot-check list, parser issues.

### Rules

- Do not edit tools, inventory files, or other libraries' outputs. Inventory
  errors (wrong path/URL) go in the report for the coordinator.
- Never write an override from memory: each must cite the doc page it came from.

## Acceptance Criteria

- [ ] Every inventory item for these libraries has an extraction record.
- [ ] Every item is `match` or has a recorded resolution.
- [ ] Spot-check recorded.

## Verification

`.venv/bin/python tools/extract.py --library xgboost && .venv/bin/python tools/verify_docs.py --library xgboost` (repeat per library)
