# lightgbm verification report

Pinned lightgbm 4.7.0. Counts: before 0 match / 2 mismatch; after 2 / 0. 2 of 2 records.

Non-matches and resolution
- LGBMClassifier, LGBMRegressor: 12-14 attributes documented as properties were missing; fixed by the T013 extractor update, no attribute override.

Overrides (lightgbm.LGBMClassifier.yaml, lightgbm.LGBMRegressor.yaml): `effective_default` for the two sentinel None defaults with a documented meaning, source the class page: objective (Regressor: regression; Classifier: 'binary' or 'multiclass', per "Default: 'regression' for LGBMRegressor, 'binary' or 'multiclass' for LGBMClassifier") and n_jobs ("None (the default) corresponds to using the number of physical cores"). random_state=None and class_weight=None are not value defaults and are left alone. Every other signature default is concrete and matches the page.

Spot-check: LGBMRegressor, LGBMClassifier (all classes), every parameter, default, attribute and method name. No gaps.

Parser issues: numpydoc warning "Unknown section Note" in __init__ docstring (harmless).


## T014 re-run

After the T014 verifier/extractor fixes and full regeneration: 2 match / 0 mismatch / 0 unparsed / 0 fetch_error / 0 no record (of 2 items).

No change from earlier runs.
