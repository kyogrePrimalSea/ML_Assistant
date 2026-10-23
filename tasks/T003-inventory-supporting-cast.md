# T003 — Inventory: supporting cast

**Status:** Ready

**Epic:** E01

## Objective

Produce `content/inventory/supporting.yaml`: inventory entries for the supporting
cast every model page needs (spec §6 "Supporting cast"): scikit-learn
preprocessing (scalers, encoders, imputers), splitting, metrics, model
selection/search; imbalanced-learn; Optuna; SHAP.

## Context

Entry contract: `docs/ARCHITECTURE.md` § "Inventory entry contract". Stages and
archetypes: spec §3.1, §4. Validation rules (spec §8) and prep checklists
(spec §5.1 slot 5) will reference these items, so coverage must be thorough.

## Dependencies

- T001

## Relevant Files

- `docs/spec.md` §3.1, §4, §5.1, §6, §8
- `docs/ARCHITECTURE.md`

## Implementation Contract

### Outputs

- `content/inventory/supporting.yaml` (`items:` list, `source: supporting`).
- `content/inventory/supporting-scope.md` — for each module/area below: the
  official API reference index URL used, which objects were included, and which
  were excluded with a one-phrase reason.

### Coverage (enumerate from each library's official API reference index, not memory)

- scikit-learn: `preprocessing` (all public transformers), `impute`, `compose`
  (ColumnTransformer, TransformedTargetRegressor, make_column_selector/transformer),
  `pipeline` (Pipeline, make_pipeline, FeatureUnion), `feature_selection`,
  `decomposition.PCA` (and TruncatedSVD), `model_selection` (all splitters,
  train_test_split, cross_val_score/cross_validate/cross_val_predict,
  learning_curve, validation_curve, permutation_test_score, all *SearchCV incl.
  halving, plus their Display classes), `metrics` (regression, classification,
  probabilistic scoring, Display classes, make_scorer, get_scorer),
  `inspection` (permutation_importance, partial_dependence, PartialDependenceDisplay,
  DecisionBoundaryDisplay), `calibration` (CalibratedClassifierCV, calibration_curve,
  CalibrationDisplay), `utils.class_weight.compute_class_weight` / `compute_sample_weight`,
  `dummy` (DummyRegressor/Classifier as baselines).
- imbalanced-learn: all over-samplers, under-samplers, combined samplers,
  `imblearn.pipeline.Pipeline`, ensemble classifiers (BalancedRandomForestClassifier etc.).
- Optuna: `create_study`, `Study`, `Trial` suggest API (record `Trial`),
  samplers, pruners, `optuna.visualization` plot functions, `OptunaSearchCV` only
  if it ships in the pinned packages (otherwise exclude with reason).
- SHAP: Explainer, TreeExplainer, LinearExplainer, KernelExplainer,
  PermutationExplainer, and the `shap.plots` functions.

### Rules and Invariants

- Confirm every `import_path` imports in `.venv` and every `doc_url` returns 200.
- Exclude objects that belong to later-wave tracks (clustering metrics,
  unsupervised-only tools, multilabel/ranking-only metrics may be `extended`),
  deprecated objects, and private helpers. Record each exclusion in the scope file.
- `tier: core` for objects a typical regression/classification/time-series
  workflow uses; `tier: extended` for the rest that are still in scope.
- Archetypes: scalers/encoders/imputers → transformer; samplers → resampler;
  feature_selection/PCA → selector; splitters → splitter; metrics → metric;
  *SearchCV/Optuna → tuning; learning/validation curves, Displays, SHAP,
  permutation importance → diagnostic; Pipeline/ColumnTransformer → composer.
- Do NOT edit `content/inventory/catalogue.yaml` (another task owns it).
  If an object is already a catalogue item (e.g. none expected), skip it.

## Acceptance Criteria

- [ ] Scope file lists every area above with included/excluded objects.
- [ ] All entries import and all doc URLs return 200.
- [ ] `tests/test_inventory.py` passes once it exists (T002 writes it; if absent
  when you finish, run an equivalent inline import/uniqueness check and report it).

## Verification

`.venv/bin/python -m pytest -q tests/test_inventory.py`
