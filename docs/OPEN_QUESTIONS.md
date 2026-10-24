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

- **`pick_when` for `chi2` (T037).** Current wording: "Counts or other non-negative
  features". The docs say X "must contain only **non-negative integer feature values**
  such as booleans or frequencies (e.g., term counts in document classification)" and that
  continuous features need binning first (for example with `KBinsDiscretizer`). "Other
  non-negative features" suggests any non-negative number works. Source:
  https://scikit-learn.org/stable/modules/generated/sklearn.feature_selection.chi2.html
  Suggested wording: "Counts, frequencies or yes/no flags (whole numbers, not negative)".
  Accept or reject? Full table: `content/verification/pick-when.md`.

### From T029 (What comes out, hyperparameter pages)

- **XGBoost `get_num_boosting_rounds()` after early stopping.** Run in `.venv`
  (xgboost 3.4.1): with `n_estimators=500, early_stopping_rounds=10` it returned 500, while
  `best_iteration` was 57 and the booster had run 68 rounds. The method docs ("Gets the number
  of xgboost boosting rounds") do not say it echoes `n_estimators`. The `n-estimators` page says
  so in one line. Source: https://xgboost.readthedocs.io/en/stable/python/python_api.html
- **No fitted value for `learning_rate`, and none for `max_depth` outside scikit-learn
  GradientBoosting.** `get_params()` only echoes the setting (XGBoost returns `None` when you
  did not set it, so the default 0.3 is not visible). `learning-rate` has `what_comes_out:
  {none: true}`. `max-depth` lists only `estimators_[0, 0].get_depth()` for GradientBoosting.
  XGBoost, LightGBM and HistGradientBoosting have no depth attribute in the extraction.
  Fine as is, or should the page show `get_params()` with a "you set this" note?
- **`max-depth` `pairs_with` left empty.** The docs support the `learning_rate` and
  `n_estimators` trade-off (GradientBoosting `learning_rate`), but say nothing that ties
  `max_depth` to either. Source:
  https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.GradientBoostingRegressor.html
- **`early-stopping` prep is `required` for all four libraries.** scikit-learn
  GradientBoosting and HistGradientBoosting hold out `validation_fraction` (default 0.1) of
  the training rows themselves, so a separate validation split is optional there (Hist also
  accepts `X_val, y_val` in `fit`, and `validation_fraction=None` watches the training
  data). The existing catch-out states the scikit-learn behaviour. `unless` cannot name the
  setting without wrongly applying to XGBoost and LightGBM. Source:
  https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html
- **Brief A4 wording holds for all four libraries.** `predict` equalled a 0.5 cut-off on
  `predict_proba[:, 1]` for XGBClassifier, LGBMClassifier, HistGradientBoostingClassifier and
  GradientBoostingClassifier (breast cancer, run in `.venv`). `decision_function` is the raw
  log-odds there (sigmoid of it equals `predict_proba[:, 1]`). XGBoost has none.

- **Four evaluate pages mix a metric and a diagnostic archetype (E05).** The inventory gives
  `confusion-matrix`, `roc-curve`, `precision-recall-curve` and `det-curve` a function target
  (metric: `confusion_matrix`, `roc_curve`, `precision_recall_curve`, `det_curve`) and a Display
  class target (diagnostic: `ConfusionMatrixDisplay`, `RocCurveDisplay`, `PrecisionRecallDisplay`,
  `DetCurveDisplay`). The validator requires the record's archetype to match every inventory entry
  of the page, so one error per page stays until the map changes (split the page, or re-label one
  entry). The records are written as `metric` and cover both targets; nothing in the map was
  altered. Also: the taxonomy `shown_as` for `auc` is "auc"; the record uses "AUC".
- **`optuna.visualization` plot pages and two Optuna samplers cannot run in `.venv` (E05).**
  `plotly` is not pinned or installed, so every `plot-*` snippet fails with ImportError after
  its study-level lines (those lines were run). `plot-terminator-improvement` also needs
  `torch`. `CmaEsSampler` needs `cmaes` and `GPSampler` needs `torch`; those two pages have
  `code: []`. Decide whether to pin and install the packages, then re-run the snippets.

- **`we_need_but` cap for time-series questions (T036).** The map allows at most 7 per
  stage, but Model holds 7 standard-track `we_need_but` questions plus 4 forecast questions
  (they file under the stage of their first answer, which the taxonomy puts in Model), so
  11 in one stage. The validator now counts the cap per track (7 standard, 4 time-series),
  which keeps all 11. Keep per-track counting, or move or drop a question?
- **`but-normality-big-sample` answer `shapiro-wilk` (T036, kept, not blocking).** The
  question is about "tens of thousands of rows". The SciPy docs say "For N > 5000 the W
  test statistic is accurate, but the p-value may not be." The answer and its catch-out
  note are kept as written (the docs do not contradict the note), but the docs caveat is
  stronger than the note. Source:
  https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.shapiro.html
  Suggested note: "catch-out: p-value unreliable above 5,000 rows; with big samples every
  test says 'not normal'; plot it too" (too long, 19 words; needs trimming). Keep as is or change?

### From T039 (goal selector, Questions mode, fanned tree)

Working defaults; each stands until you confirm or change it.

- **"Show as list" link.** `Tree | List` left the top bar. The tree canvas has a "Show as list"
  button in its top-left corner (and "Show as tree" in the list), as the keyboard and
  screen-reader fallback. It swaps the view; it does not remember the choice.
- **Centre fallback "Which one fits?"** When an open node has no `question_prompt` (every
  family and several groups have none), the centre shows "Which one fits?". At the root it
  shows `root.question_prompt` ("Where are we in the work?").
- **Pan and edge indicators.** Text never scales below 0.85 (about 13px), so a fan wider than the
  canvas is reached by panning: drag, wheel or trackpad. A node that gets keyboard focus or is
  selected is panned fully into view. Opening a branch frames the open node and as many
  children as fit, centred on the children's arc. A pill with an arrow and "N more" appears on
  any canvas side where children of the open node are cut off; clicking it pans there. No wheel
  zoom, no zoom buttons.
- **Connection lines keep an overview camera.** With "Show connections" on, the whole ring has
  to stay in view for the lines to make sense, so the camera may scale down to 0.25 there (text
  below 13px). The page panel lists the same connections as text. Keep this, or pan instead?
- **Breadcrumb has no goal prefix.** It lists the opened nodes only ("Predict the number › Get
  strong accuracy on tables › Get the best accuracy we can › XGBoost"); the goal is in the top
  bar. The brief's example began with the goal's label, which repeats the Model stage's label.
- **Accessible names start with the visible label.** "Get the best accuracy we can. We need the
  best accuracy, and we can spend time tuning." (label, then the full `question_sentence`),
  because WCAG label-in-name (axe `label-content-name-mismatch`) needs the visible text inside
  the name. Pages read "XGBoost, model. Top accuracy on tabular data".
- **The Names | Questions toggle sits in the top bar** next to the goal selector (spec 7.4),
  not in the canvas. The goal selector's visible prompt shows from 1200px wide; below that it is
  the accessible name only.
