# Open questions for the user

Choices agents made where the spec was silent or ambiguous. Each is a working
default until you confirm or change it. Remove an entry once decided.

## Inventory (E01)

1. **Proposed page groupings.** 26 pages combine several objects (e.g. XGBRegressor +
   XGBClassifier on one `xgboost` page; LogisticRegression + statsmodels Logit on
   `logistic-regression`; QuantileRegressor + QuantReg; TheilSenRegressor +
   `theilslopes`; PoissonRegressor + discrete Poisson). Full list:
   `content/extraction/E01-REPORT.md` §3. Spec §5.4 treats XGBoost as one page, §6
   lists the two classes separately.
2. **"Residual normality"** has no single function. Mapped to statsmodels
   `jarque_bera` + `omni_normtest` on one page, `residual-normality`.
3. **Archetype for time-series explore tools** (decomposition, stationarity tests,
   ACF/PACF): `diagnostic`, as no archetype in spec §4 fits better.
4. **Assumption tests** (Shapiro-Wilk, t-tests): stage `explore`, track `standard`.
5. **Supporting-cast placements:** Pipeline/ColumnTransformer in stage `transform`;
   `cross_val_*` as archetype `splitter`; CalibratedClassifierCV in `evaluate` as a
   `composer`; `compute_class_weight` in `model` as a `resampler`; samplers
   (SMOTE etc.) in stage `transform`. Imputers are in stage `clean` (spec defers
   only the pandas recipes in Clean to v2).
6. **OptunaSearchCV** excluded: it ships in `optuna-integration`, not in Optuna.
7. **Explore stage for the standard track is thin.** Spec §6 lists no general EDA
   tools (only time-series checks and SciPy tests). Add any you want (e.g. pandas
   profiling-style recipes) in a later wave?
8. **Doc versions:** SciPy docs online show 1.18.0 (pinned 1.18.1), XGBoost docs
   3.4.2 (pinned 3.4.1), SHAP docs are `latest`. Pages carry the pinned version.

## Content schema (E02)

9. **Classification toy dataset:** spec says "Titanic or breast cancer". Both are in
   the vocab; pick one so the data stays familiar.
10. **Hyperparameter pages** (e.g. `max-depth`) are content-only records (not in the
    inventory) placed in stage `tune`, with `applies_to` listing model pages.
11. **`question_tags`** are free user-wording tags for search; questions link to
    pages through their own `answers` lists.
12. **Unsupervised track** marked as a later wave (spec §6), although spec §3.2 lists
    it without a "later wave" note.
13. **Small schema guesses** where spec §4 only implies the content: hero visual
    parameters, non-model quick facts, and the `data_size` format.
