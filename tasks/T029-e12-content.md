# T029 — E12 content: What comes out, hyperparameter prep and pairings, long lines

**Status:** Backlog

**Epic:** E12

## Objective

Fill **What comes out** for the four boosting pages and the four hyperparameter pages. Give
the hyperparameter records their prep steps and `pairs_with` (F10). Bring every snippet line
in the 20 records to 79 characters or fewer (F4).

## Context

- Spec §5.1 slot 7 and its by-archetype table (A4). Brief: `docs/BRIEF_DESIGN_REVIEW_1.md`
  A4, F4, F10.
- Schema: `docs/CONTENT_SCHEMA.md` (updated by T028). Records: `content/items/model/{xgboost,
  lightgbm,hist-gradient-boosting,gradient-boosting}.yaml`, `content/items/tune/{n-estimators,
  max-depth,learning-rate,early-stopping}.yaml`.
- **Facts only from the extraction** (`content/extraction/<library>/<id>.json`: `methods`,
  `attributes`, parameter docs) and the official docs (`source_urls`). Never write from
  memory. Every snippet runs in `.venv` before it goes in.

## Dependencies

- T028 (schema slot, validator, toy-output files).

## Implementation Contract

### Model pages (4)

- `items`: the prediction methods that exist on the targets. For each, give the shape and a
  ≤16-word note:
  - `predict` (regression: one value per row; classification: class labels, equal to a 0.5
    cut-off on `predict_proba[:, 1]` for two classes; verify this per library from the docs);
  - `predict_proba` (classifier: one column per class in `classes_` order; for two classes,
    keep `[:, 1]`);
  - `decision_function` only where the extraction lists it.
  - Then the fitted attributes people use most, as the extraction lists them: for example
    `feature_importances_`, `classes_`, `best_iteration` / `n_iter_` / `n_estimators_`.
- `next_step`: ROC AUC and PR curves need probabilities, not labels; for regression, undo a
  log target (`np.expm1` after `np.log1p`) before reporting errors.
- `snippet`: one short, runnable example on breast cancer (classification) that prints the
  `predict_proba` shape and `[:, 1]`, plus the regression undo-log line. Stamp it from
  `library_versions`. Keep lines ≤ 79 characters.
- `visual: both` (all four pages support both task types).

### Hyperparameter pages (4)

- `items`: the fitted attribute or method that reports the value actually used, per library,
  verified in the extraction. Examples to check: `n_estimators_` (GradientBoosting, LightGBM),
  `n_iter_` (HistGradientBoosting), `best_iteration` and `get_num_boosting_rounds()` (XGBoost),
  `best_iteration_` (LightGBM). Use `task: null`. For `max-depth`, if no fitted attribute
  reports depth for a library, leave that library out. Don't invent one; for sklearn trees
  inside ensembles, check `estimators_[i].get_depth()` or `tree_.max_depth` in the
  extraction/docs before using it.
- `visual: null`.
- **F10 prep and pairings:**
  - `early-stopping`: prep `{step: {page: train-test-split}, status: required, why: Early
    stopping needs a validation set to watch., condition: null, unless: null}`. Check the
    scikit-learn Hist case: it holds out `validation_fraction` itself, so phrase or condition
    the entry truthfully, for example with `unless`, or by noting that the scikit-learn tab
    handles it in a catch-out. Choose what the docs support and say which in the run log.
  - `pairs_with` for each of `n-estimators`, `learning-rate` and `early-stopping`: the other
    two. `max-depth` pairs with `n-estimators` and `learning-rate` only if the docs or
    extraction support the pairing. Otherwise leave it as it is and report.
  - Hyperparameter prep entries that use the old `{family, stage}` form keep the current family
    names, because E11 migrates them.

### Long lines (F4)

- After this task, every snippet line in the 20 records is ≤ 79 characters, so the T028
  warning list is empty. Re-run each changed snippet.

### Also

- Re-run `tools/derive_relationships.py`. Append the snippet run results to
  `content/items/EXAMPLES-RUN.md`.
- `reviewed: false` stays on every record. No schema or tool changes; report gaps in the run
  log instead.
- Any disagreement between the brief's A4 wording and the docs (e.g. `predict` vs threshold
  semantics for a library) goes to `docs/OPEN_QUESTIONS.md` under "Design review round 1",
  with the source URL.

## Acceptance Criteria

- [ ] The validator exits 0 with **no long-line warnings**; pytest passes.
- [ ] Every new snippet ran in `.venv`; the output is recorded in `EXAMPLES-RUN.md`.
- [ ] Every `items[].name` resolves in the extraction (the validator checks this).
- [ ] `content/derived/relationships.json` shows the new pairs_with and the early-stopping Needs.

## Verification

```
.venv/bin/python tools/derive_relationships.py
.venv/bin/python tools/validate_content.py
.venv/bin/python -m pytest -q
```
