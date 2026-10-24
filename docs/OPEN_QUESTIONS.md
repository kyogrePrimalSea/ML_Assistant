# Open questions for the user

Choices agents made where the spec was silent or ambiguous. Each is a working
default until you confirm or change it. Remove an entry once decided.
Numbers are kept stable, so gaps mark settled items (#9, #14, #15, #17, #18 were
settled on 2026-10-24 by design review round 1; see the changelog in `docs/spec.md`).

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

10. **Hyperparameter pages** (e.g. `max-depth`) are content-only records (not in the
    inventory) placed in stage `tune`, with `applies_to` listing model pages.
11. **`question_tags`** are free user-wording tags for search; questions link to
    pages through their own `answers` lists.
12. **Unsupervised track** marked as a later wave (spec §6), although spec §3.2 lists
    it without a "later wave" note.
13. **Small schema guesses** where spec §4 only implies the content: hero visual
    parameters, non-model quick facts, and the `data_size` format.

## App (E03–E04) — for your review of the live site

16. **Star field** dots are 12–30% opacity; spec says "~1–2% opacity", which would be
    nearly invisible. Was 1–2% meant literally, or as density?
19. **LightGBM early stopping** is a `fit` callback, not a constructor setting, so the
    schema can't list it as a key setting on the LightGBM page (it's covered on the
    `early-stopping` page instead).
20. **Data-size sweet spots** on model pages ("1k to 10M rows") are editorial, not from
    the docs.
21. **Demo journey order:** stops follow pipeline stage order, so the encoder (Transform)
    comes before the split and shows the leakage Warn with its "Wrap in a Pipeline" fix,
    as spec §8 describes.

## Design review round 1 (E11–E12)

Agents add any `pick_when` line or `we_need_but` answer that the docs contradict here,
with the source URL. Wording is not rewritten silently.
