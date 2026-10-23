# T012 — Example content records (one per archetype)

**Status:** Backlog

**Epic:** E02

## Objective

Prove the schema end to end by writing real records: XGBoost (spec §5.4) plus one
record for each other archetype, a hyperparameter record for `max_depth`, and a
few questions.

## Dependencies

- T011

## Implementation Contract

### Outputs

- `content/items/<stage>/<page>.yaml` for: XGBoost (model; spec §5.4 exactly),
  and one each of transformer (StandardScaler), resampler (SMOTE), selector
  (SelectKBest), splitter (TimeSeriesSplit), hyperparameter (`max_depth`, applies to
  the tree/boosting pages in the inventory), tuning (RandomizedSearchCV), metric
  (precision), diagnostic (learning curve), output (`feature_importances_`),
  composer (Pipeline). Use the inventory page ids.
- `content/questions/model.yaml` with "My model is overfitting" (answers per spec
  §3.4) chaining to a "how good is it now?" question in evaluate
  (`content/questions/evaluate.yaml`).
- `.venv/bin/python tools/derive_relationships.py` output committed.

### Rules

- API facts (parameters, defaults, attributes, methods, versions) come only from
  the extraction records; cite `source_urls`. Explanatory text follows spec §1 and
  §11: tags over sentences, short chunks, plain English, no word salad.
- Every snippet runs: execute each one in `.venv` (with toy data from
  sklearn/statsmodels datasets where needed; network dataset downloads are not
  allowed in tests) and record results in `content/items/EXAMPLES-RUN.md`.
- `reviewed: false` everywhere.
- If the schema can't express something the spec requires, stop and report it — do
  not add fields.

## Acceptance Criteria

- [ ] `tools/validate_content.py` exits 0.
- [ ] All snippets execute.
- [ ] XGBoost record matches every bullet of spec §5.4.

## Verification

`.venv/bin/python tools/validate_content.py && .venv/bin/python -m pytest -q`
