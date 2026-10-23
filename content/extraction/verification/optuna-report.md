# optuna verification report

Pinned optuna 5.0.0. 40 inventory items; 39 records (optuna.TrialPruned fails extraction, below).
Counts: first run 34 match / 4 mismatch / 1 unparsed; after T013 update 36 / 2 / 1; after overrides 38 match / 0 mismatch / 1 unparsed (+1 no record).

Non-matches and resolution
- optuna.trial.FrozenTrial: page documents 11 plain attributes (number, state, value, values, datetime_start, datetime_complete, params, distributions, user_attrs, system_attrs, intermediate_values) not found by extractor. Override adds them (names/text from page, types from the page's constructor parameter list). Existing 3 properties kept.
- optuna.study.MaxTrialsCallback: default repr `(<TrialState.COMPLETE: 1>,)` vs page `(TrialState.COMPLETE,)`. Override records the docs form (same value).
- optuna.pruners.NopPruner (unparsed): page header is `class optuna.pruners.NopPruner[source]` with no parentheses, so verify_docs does not recognise the layout. Extraction (no parameters) is correct. Parser limitation, not changed.
- optuna.TrialPruned: no record. Extraction fails with "no signature found for builtin type" (exception class with no __init__ signature; the T013 Cython fallback does not cover it). Tool bug, reported. Official page https://optuna.readthedocs.io/en/stable/reference/generated/optuna.TrialPruned.html exists (exception, no parameters, alias of optuna.exceptions.TrialPruned); inventory URL and path are fine.

Spot-check by hand: TPESampler, create_study, Study, MedianPruner, plot_optimization_history. No gaps.
Overrides: optuna.trial.FrozenTrial, optuna.study.MaxTrialsCallback.
