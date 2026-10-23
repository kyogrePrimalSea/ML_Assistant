# E01 acceptance audit (T009)

Audited 2026-10-24 by an independent agent. Read-only except `tools/coverage.py` and this file. Run: `.venv/bin/python tools/coverage.py` (exit 0), `.venv/bin/python -m pytest -q` (1608 passed; baseline 1592 plus tests added by other work).

## 1. Coverage table (from `tools/coverage.py`)

| Library | Inventory | Extraction | match | mismatch | Items with overrides | Items with warnings |
| --- | --- | --- | --- | --- | --- | --- |
| scikit-learn | 231 | 231 | 230 | 1 | 7 | 0 |
| statsmodels | 41 | 41 | 41 | 0 | 16 | 6 |
| optuna | 40 | 40 | 40 | 0 | 2 | 39 |
| imbalanced-learn | 36 | 36 | 36 | 0 | 0 | 0 |
| shap | 21 | 21 | 20 | 1 | 9 | 17 |
| scipy | 10 | 10 | 10 | 0 | 0 | 0 |
| xgboost | 2 | 2 | 2 | 0 | 2 | 0 |
| lightgbm | 2 | 2 | 2 | 0 | 2 | 2 |
| **Total** | **383** | **383** | **381** | **2** | **38** | **64** |

383 = 122 catalogue + 261 supporting. Ids unique; no orphan records or verification entries; 38 override files match the 38 items; every override has `source_url` and `reason`. Every record's `library_version` equals the `requirements.txt` pin and the installed version (`pip list`). I re-ran `verify_docs.run()` against the cache into a scratch directory: output is byte-identical to all 8 committed `verification/*.json`, so the statuses are reproducible.

## 2. Unresolved items

- 2 verification `mismatch`, both explained and genuine source quirks, neither an extraction error:
  - `sklearn.model_selection.learning_curve` `train_sizes`: page prints a numpy-rounded array, extraction has the exact signature repr.
  - `shap.PartitionExplainer` `partition_tree`: documented in the docstring and on the page but absent from the signature (kept as `documented_only`). Authoring should drop or flag it.
- Warnings: optuna 39 and shap 17 records carry "parameter X: not documented in docstring" (parameter has no description, so authoring from extraction alone leaves those parameters without prose; spec 13.1 forbids filling from memory). Also "no Returns section" (optuna 15, shap 5), `LightGBM` numpydoc "Unknown section Note" (2), statsmodels `missing`/`dates`/`freq` and one signature-from-docstring fallback.

## 3. Proposed page groupings needing user confirmation

273 of 383 items have `page_grouping: proposed`, spread over 246 pages.
- 26 multi-item proposed pages (listed here): theil-sen-regression, quantile-regression, poisson-regression, logistic-regression, xgboost (Regressor+Classifier), lightgbm (Regressor+Classifier), standardscaler, minmaxscaler, maxabsscaler, robustscaler, normalizer, powertransformer, quantiletransformer, binarizer, pipeline, learning-curve, validation-curve, confusion-matrix, roc-curve, precision-recall-curve, det-curve, partial-dependence, calibration-curve, compute-class-weight, imblearn-pipeline, optuna-study.
- 12 of these items come from the spec catalogue itself (TheilSen/theilslopes, Quantile/QuantReg, PoissonRegressor/Poisson, LogisticRegression/Logit, XGB pair, LGBM pair): the spec states cross-library same-model pages (3.3) only for LinearRegression + OLS + linregress, so these are extensions.
- 220 single-item pages are `proposed` only because they are supporting cast (page id choice).
- 12 multi-item pages are `catalogue`: linear-regression (3), random-forest, extra-trees, bagging, gradient-boosting, hist-gradient-boosting, ada-boost, voting, stacking, glm (7), residual-normality, acf-pacf-plots.
- Inventory judgement calls from the checklist footer: "residual normality" mapped to `jarque_bera` + `omni_normtest` (not named in spec).

## 4. Inventory issues raised by T006-T008 (status)

All raised parser/extractor problems were fixed in T013/T014 and the final reports list 0 remaining non-matches except the two above. The per-library reports keep their superseded first-run narrative above the "T014 re-run" section (see defect 4).

## 5. Catalogue checklist vs spec 6 (independent)

Parsed spec 6 bullets: 104 names (the spec's comma lists, split). Checklist has 104 names, all `[x]`; set difference both ways is empty. All 122 referenced ids exist in `catalogue.yaml`; all 122 catalogue entries are referenced; no id appears twice; no overlap with `supporting.yaml`. Checklist PASS.

Supporting-scope: every module states an Excluded line, most with a reason. Independent check of `__all__` of 22 modules against inventory plus scope text found names neither included nor mentioned: `sklearn.feature_selection.f_oneway`; `sklearn.model_selection.BaseCrossValidator`, `BaseShuffleSplit`; `sklearn.metrics` pairwise functions (`euclidean_distances`, `nan_euclidean_distances`, `pairwise_kernels`); `optuna.samplers.BaseGASampler`, `nsgaii`; `optuna.visualization.is_available`. Optuna terminator evaluators are covered by the scope's group wording (`*Evaluator` names differ slightly). Only `f_oneway` is plausibly in scope (an ANOVA F-test sibling of `f_classif`), and its omission is silent.

## 6. Independent spot-check

Method: `random.seed(20261024)`; `random.sample(sorted(all 383 ids), 15)`. For each item a script (BeautifulSoup over the cached page, independent of `verify_docs.py`) compared every signature parameter name and default, `effective_default` where present, attribute names (Attributes list plus property entries) and method names (autosummary and `dt.sig`), followed by hand reading where the script could not parse (shap.Explainer annotated signature).

Sample: Binarizer, shap.Explainer, MarkovRegression, optuna.TrialPruned, GaussianProcessRegressor, NuSVR, imblearn macro_averaged_mean_absolute_error, shap.plots.bar, PredefinedSplit, NeighbourhoodCleaningRule, VAR, DecisionTreeClassifier, validation_curve, optuna NopPruner, HuberRegressor.

Result: 14 of 15 exactly agree on parameters, defaults, attributes and methods. The one discrepancy is optuna.TrialPruned (defect 1). None of the 15 has an `effective_default`, so I separately checked the XGBoost overrides (25 values) against the official `parameter.html`: max_depth 6, max_leaves 0, max_bin 256, eta 0.3, gamma 0, min_child_weight 1, max_delta_step 0, subsample 1, colsample_* 1, alpha 0, lambda 1, scale_pos_weight 1, num_parallel_tree 1, grow_policy depthwise, sampling_method uniform, tree_method auto, device cpu, multi_strategy one_output_per_tree all agree. `validate_parameters` is recorded True while the page says "default to false, except for Python, R and CLI interface" (consistent only by that exception; fine). Sources of docs version: see defect 3.

## 7. Defects and observations

1. **optuna.TrialPruned methods.** The record lists `add_note` and `with_traceback` (inherited from `BaseException`); the official page documents no methods. `verify_docs.py` does not compare methods, so this is invisible to it. Authoring should ignore them (record also has `kind: class`, an exception).
2. **Verifier scope gaps.** `verify_docs.py` checks parameter names/defaults and attributes only: it does not compare method names or `effective_default` values. Those are covered only by the hand spot-checks in the reports and by mine.
3. **Docs pages are not exactly the pinned version.** SciPy cached pages are "SciPy v1.18.0 Manual" (pin 1.18.1); XGBoost pages show 3.4.2 (pin 3.4.1, already noted in its report); SHAP docs are `latest`, not 0.54.1 (noted in supporting-scope). Extraction itself is from the installed pinned packages, so records are correct; only the cross-check page may differ by patch version.
4. **Stale report text.** Per-library `*-report.md` files keep first-run counts, e.g. scikit-learn "6 overrides" and "43 mismatch / 4 unparsed" before the T014 section; statsmodels says "4 overrides", final state is 16 files. The T014 re-run section is correct; readers of the top section get old numbers.
5. **Silent supporting-scope omission:** `sklearn.feature_selection.f_oneway` (section 5).
6. **Undocumented parameters:** Most of the 56 optuna and shap records with warnings (39 + 17) contain parameters with no docstring description (section 2); authoring needs a rule for these.
7. **learning_curve** default text differs from the page only by numpy print rounding (no action).

No missing record, no missing verification entry, no version mismatch.

## 8. Acceptance criteria

- [x] `tools/coverage.py` exits 0.
- [x] Every catalogue checklist name is covered (104/104, 122/122); supporting-scope exclusions are reasoned (one silent omission, `f_oneway`, listed as defect 5).
- [x] Spot-check found no unrecorded discrepancy: the single difference (TrialPruned inherited methods) is listed as defect 1.
