# imbalanced-learn verification report

Pinned imbalanced-learn 0.14.2. 36 inventory items, 36 records.
Counts: first run 33 match / 3 mismatch (BalancedBaggingClassifier, EasyEnsembleClassifier: base_estimator_; BalancedRandomForestClassifier: estimators_samples_, all documented properties not found by the old extractor). After the T013 extractor update: 36 match / 0 mismatch. No overrides.

Spot-check by hand (params, defaults, attributes, methods vs page): SMOTE, RandomUnderSampler, BalancedRandomForestClassifier, Pipeline, geometric_mean_score. No gaps. (BalancedBaggingClassifier, EasyEnsembleClassifier, BalancedRandomForestClassifier were additionally read for the formerly mismatched attributes.)

Parser issues: none outstanding.


## T014 re-run

After the T014 verifier/extractor fixes and full regeneration: 36 match / 0 mismatch / 0 unparsed / 0 fetch_error / 0 no record (of 36 items).

No change from earlier runs.
