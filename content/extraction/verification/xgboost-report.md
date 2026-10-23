# xgboost verification report

Tool: tools/extract.py after T013 update; pinned xgboost 3.4.1 (docs site now shows 3.4.2, no relevant difference seen).

Counts (verify_docs): before overrides 0 match / 2 mismatch; after 2 match / 0 mismatch. 2 of 2 inventory items have a record.

Non-matches and resolution
- xgboost.XGBClassifier, xgboost.XGBRegressor: first run flagged malformed docstring entries (`booster: str | None`, etc.) and 7-8 properties missing as attributes. Both were fixed by the T013 extractor update (no override needed for them). Remaining step: sentinel defaults, below.

Overrides (xgboost.XGBClassifier.yaml, xgboost.XGBRegressor.yaml): `effective_default` for every parameter whose signature default is None and where the official booster page gives a concrete value. Source: https://xgboost.readthedocs.io/en/stable/parameter.html. Mapping sklearn name -> booster name: learning_rate -> eta (0.3), reg_alpha -> alpha (0), reg_lambda -> lambda (1, Tree Booster section), n_jobs -> nthread. Others use the same name: max_depth 6, max_leaves 0, max_bin 256, grow_policy depthwise, verbosity 1, booster gbtree, tree_method auto, gamma 0, min_child_weight 1, max_delta_step 0, subsample 1, sampling_method uniform, colsample_bytree/bylevel/bynode 1, scale_pos_weight 1, num_parallel_tree 1, multi_strategy one_output_per_tree, device cpu. validate_parameters = True (page: "default to false, except for Python, R and CLI interface"). n_estimators = 100: not on any docs page; from DEFAULT_N_ESTIMATORS in python-package/xgboost/sklearn.py at tag v3.4.1 (GitHub), also confirmed in installed copy.
No concrete default (left null; page gives none or a rule): base_score (estimated from objective), eval_metric (depends on objective), importance_type, random_state, monotone_constraints, interaction_constraints, max_cat_to_onehot, max_cat_threshold, feature_types, feature_weights, early_stopping_rounds, callbacks, kwargs. Note: the python_api page for XGBRegressor gives no defaults at all (signature is `objective=..., **kwargs`); the sklearn estimator's own defaults are all None.

Spot-check (by hand against official page, all params/defaults/attributes/methods): XGBRegressor, XGBClassifier (all classes). No gaps.

Parser issues: none for these items.


## T014 re-run

After the T014 verifier/extractor fixes and full regeneration: 2 match / 0 mismatch / 0 unparsed / 0 fetch_error / 0 no record (of 2 items).

No change from earlier runs.
