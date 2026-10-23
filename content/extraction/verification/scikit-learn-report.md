# scikit-learn 1.9.1 extraction and docs cross-check (T006)

Inventory items: 231. Extraction records: 231 (0 failures).

| Status | Before (first run) | After overrides |
| --- | --- | --- |
| match | 178 | 184 |
| mismatch | 49 | 43 |
| unparsed | 4 | 4 |
| fetch_error / no record | 0 | 0 |

(The very first run had 230 records and 48 mismatches: `make_scorer` failed with the `**kwargs`/`__mro__` extractor bug. The tool was fixed in the working tree meanwhile, and that fix also adds property attributes such as `named_estimators`; the "before" column is the run after that fix. The 4 `unparsed` are listed below.)

Final re-run made after the T013 tool update (base-class kwargs merge, property attributes, Cython fallback): all 231 records and the counts above come from that version. The 6 overrides only patch `score_func` defaults, so none duplicates an attribute the extractor now finds.

Overrides: 6 (`sklearn.feature_selection.{GenericUnivariateSelect,SelectFdr,SelectFpr,SelectFwe,SelectKBest,SelectPercentile}`), each patching `parameters[name=score_func].default` to `<function f_classif>` (introspected repr embedded a memory address; docs page shows `<function f_classif>`).

## Non-matches and resolutions

Every remaining non-match was checked against the cached official page HTML. None is an extraction error.

1. **Parser bug, attributes (42 items, 59 attribute names).** The extraction lists attributes the docs page does list; `verify_docs.py` misses them. numpydoc renders property-backed attributes as `<dt><code class="xref ..."><span class="pre">name</span></code>` instead of `<dt><strong>name</strong>`, and the parser reads only the `<strong>` form. A script confirmed each of the 59 `missing_in_docs` names occurs as a `<dt>` entry in the page's Attributes list. Names: feature_importances_ (11 items), n_features_in_ (12), classes_ (9), estimators_samples_ (6), infrequent_categories_ (OneHotEncoder, OrdinalEncoder), coef_/n_support_ (SVC, SVR, NuSVR), probA_/probB_ (SVC), n_iter_ (HistGB x2), sparse_coef_ (Lasso, ElasticNet), feature_names_in_ (Pipeline, FeatureUnion), named_transformers_, threshold_, kernel_, powers_. Resolution: legitimate agreement, parser bug, no override.
2. **TargetEncoder `infrequent_categories_`.** The one genuine difference: the installed class inherits a documented property from the private `_BaseEncoder`, so the extractor lists it, but the TargetEncoder page does not document it. Overrides cannot delete list entries, so it stays in the record. The coordinator should drop it or ignore it when authoring.
3. **learning_curve `train_sizes`.** Docs render `array([0.1, 0.33, 0.55, 0.78, 1.])` (rounded by numpy print options); extraction has the exact `array([0.1  , 0.325, 0.55 , 0.775, 1.   ])` (np.linspace(0.1, 1.0, 5)). Extraction is the more accurate; no override.
4. **Unparsed (4): LeaveOneOut, LeaveOneGroupOut, KernelCenterer, LabelEncoder.** Classes with a no-argument constructor, so the page has no class Parameters section and the parser reports "layout not recognised". Checked by hand: signature `()` is correct; KernelCenterer attributes (K_fit_rows_, K_fit_all_, n_features_in_, feature_names_in_) and LabelEncoder `classes_` match the page; the method names on each page match the record. Resolution: parser limitation.

## Spot check (40 of 184 matches, 22%)

Method: for two items per module family (first and middle), the record's every parameter `name=default`, attribute name and method name was compared against the page text by an independent script (not the verifier's parser), with hand review of the output. The only flag was `make_union` `transformers=`, which is the `*transformers` var-positional (not an error).

CalibratedClassifierCV, CalibrationDisplay, make_column_selector, make_column_transformer, PLSRegression, PCA, TruncatedSVD, LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis, DummyClassifier, DummyRegressor, VarianceThreshold, GaussianProcessRegressor, IterativeImputer, MissingIndicator, DecisionBoundaryDisplay, partial_dependence, IsotonicRegression, KernelRidge, ARDRegression, PassiveAggressiveRegressor, ConfusionMatrixDisplay, hinge_loss, GroupKFold, ShuffleSplit, BernoulliNB, ComplementNB, KNeighborsClassifier, KNeighborsRegressor, MLPClassifier, MLPRegressor, make_pipeline, make_union, Binarizer, SplineTransformer, LinearSVC, LinearSVR, compute_class_weight, compute_sample_weight, plus GenericUnivariateSelect (matched after override).

## Parser and tool issues (not fixed, per rules)

- `verify_docs.py`: misses xref-form attribute entries (item 1); fails on classes with no constructor parameters (item 4).
- `extract.py`: crashed on functions with `**kwargs` (make_scorer; seen elsewhere with curve_fit, plot_acf); fixed in the working tree during this task. Overrides cannot remove list entries (item 2). Warning "default repr contains a memory address" is still emitted for the 6 overridden items (extractor warns before applying overrides).
- Inventory errors: none found.
