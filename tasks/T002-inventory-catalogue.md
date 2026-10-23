# T002 — Inventory: Wave 1 catalogue items

**Status:** Ready

**Epic:** E01

## Objective

Produce `content/inventory/catalogue.yaml`: one inventory entry for every item
named in spec §6 (all subsections from "scikit-learn: linear models" through
"SciPy"; NOT "Supporting cast" and NOT "Later waves").

## Context

Spec §13.1: list every item in the Wave 1 catalogue before anything else. The
entry contract (fields, enums, page-sharing rules) is in `docs/ARCHITECTURE.md`
§ "Inventory entry contract". Stages, tracks and archetypes: spec §3.1, §3.2, §4.

## Dependencies

- T001

## Relevant Files

- `docs/spec.md` §3, §4, §6
- `docs/ARCHITECTURE.md`

## Implementation Contract

### Outputs

- `content/inventory/catalogue.yaml` (`items:` list).
- `tests/test_inventory.py` — checks for BOTH inventory files (skip a file if absent):
  every `import_path` imports in `.venv`; `id` unique across both files; enum
  fields valid; required fields present; `doc_url` is https; no `id` appears in
  both files.
- `content/inventory/catalogue-checklist.md` — every line/name in spec §6
  (subsections above), each mapped to the id(s) that cover it. Nothing unmapped.

### Rules and Invariants

- Use the exact library import paths; confirm each by importing in `.venv`
  and confirm each `doc_url` by fetching it (HTTP 200, page is about that object).
  Use the official stable API reference URL for that exact object.
- Combined catalogue names expand to all concrete objects: "RandomForest" →
  `RandomForestRegressor` + `RandomForestClassifier` on one page; same for
  ExtraTrees, Bagging, GradientBoosting, HistGradientBoosting, AdaBoost, Voting,
  Stacking. "GLM (Gaussian, Poisson, …)" → `statsmodels.api.GLM` plus each family
  class in `statsmodels.genmod.families`. Diagnostics and tests → the concrete
  functions (e.g. `statsmodels.stats.diagnostic.het_breuschpagan`,
  `statsmodels.stats.outliers_influence.variance_inflation_factor`,
  `OLSInfluence`, `statsmodels.graphics.tsaplots.plot_acf`/`plot_pacf`,
  `statsmodels.tsa.stattools.adfuller`/`kpss`/`acorr_ljungbox` wherever they live
  in the pinned version, `scipy.stats.shapiro`, `normaltest`, `ttest_ind`,
  `ttest_rel`, `ttest_1samp`, etc.). Verify locations — do not trust these hints.
- Prefer public import paths (`statsmodels.api` / `statsmodels.tsa.api` objects
  may be recorded at their defining module path; record whichever path is
  documented in the official API reference).
- `stage`: models → `model`; time-series decomposition/stationarity/seasonality
  → `explore`; statistical diagnostics of fitted models → `evaluate`;
  assumption tests → `explore`. `tracks`: time-series items → `[time-series]`;
  general regressors/classifiers → `[standard]`; items valid for both get both.
- `family`: the catalogue's bullet label (e.g. "Regularised", "Robust to outliers",
  "Boosting (XGBoost)"). Use spec wording.
- `page`: same algorithm across Regressor/Classifier = one page only where the
  catalogue lists it as one name (see above). Cross-library same-model pages:
  LinearRegression + `statsmodels` OLS + `scipy.stats.linregress` share page
  `linear-regression` with `page_grouping: catalogue`. Other obvious cross-library
  equivalents (e.g. QuantileRegressor/QuantReg, LogisticRegression/Logit,
  TheilSenRegressor/`theilslopes`) share a page with `page_grouping: proposed`.
- Do not invent items not named in the catalogue.

## Scope

### Out of Scope

- Supporting cast (T003), parameter extraction (T004), later waves.

## Acceptance Criteria

- [ ] Every catalogue name maps to ≥1 entry in the checklist; no unmapped names.
- [ ] All entries import and all doc URLs return 200 (record the check in the checklist footer).
- [ ] `tests/test_inventory.py` passes.

## Verification

`.venv/bin/python -m pytest -q tests/test_inventory.py`
