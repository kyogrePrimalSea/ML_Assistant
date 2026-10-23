# Supporting cast: inventory scope

Companion to `supporting.yaml` (T003). Every list was enumerated from the official
API reference index pages below (fetched 2026-10-24), not from memory, then checked
against the pinned installs (scikit-learn 1.9.1, imbalanced-learn 0.14.2, Optuna 5.0.0,
SHAP 0.54.1). Totals: 261 entries (scikit-learn 164, imbalanced-learn 36, Optuna 40,
SHAP 21); 110 core, 151 extended.

Conventions: "Included" lists every object in the module's index that has an entry.
Tier is `core` unless marked (ext). Functional shortcuts (e.g. `scale`) and Display
classes are separate entries that share their parent's `page`. All groupings across
objects are `proposed`. Deprecated check: no included docstring carries a
`deprecated::` directive.

## scikit-learn

### preprocessing
Index: https://scikit-learn.org/stable/api/sklearn.preprocessing.html
- Included: StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer, PolynomialFeatures,
  FunctionTransformer, OneHotEncoder, OrdinalEncoder, TargetEncoder, LabelEncoder;
  (ext) MaxAbsScaler, Normalizer, KernelCenterer, QuantileTransformer, Binarizer,
  KBinsDiscretizer, SplineTransformer, LabelBinarizer, MultiLabelBinarizer, add_dummy_feature;
  (ext) shortcuts scale, minmax_scale, maxabs_scale, robust_scale, normalize, power_transform,
  quantile_transform, binarize, label_binarize.
- Excluded: none (all 29 indexed objects included).

### impute
Index: https://scikit-learn.org/stable/api/sklearn.impute.html
- Included: SimpleImputer, KNNImputer, IterativeImputer; (ext) MissingIndicator.
- Excluded: none. IterativeImputer is experimental: its import path fails until
  `from sklearn.experimental import enable_iterative_imputer` has run.

### compose
Index: https://scikit-learn.org/stable/api/sklearn.compose.html
- Included: ColumnTransformer, make_column_transformer, make_column_selector, TransformedTargetRegressor.
- Excluded: none.

### pipeline
Index: https://scikit-learn.org/stable/api/sklearn.pipeline.html
- Included: Pipeline, make_pipeline; (ext) FeatureUnion, make_union.
- Excluded: none. Stage `transform` is a judgement call (a pipeline spans transform to model).

### feature_selection
Index: https://scikit-learn.org/stable/api/sklearn.feature_selection.html
- Included: VarianceThreshold, SelectKBest, SelectFromModel, RFE, RFECV, f_classif, f_regression,
  mutual_info_classif, mutual_info_regression; (ext) SelectPercentile, GenericUnivariateSelect,
  SelectFpr, SelectFdr, SelectFwe, SequentialFeatureSelector, chi2, r_regression.
- Excluded: SelectorMixin (base class mixin).

### decomposition
Index: https://scikit-learn.org/stable/api/sklearn.decomposition.html
- Included: PCA; (ext) TruncatedSVD.
- Excluded: DictionaryLearning, MiniBatchDictionaryLearning, SparseCoder, SparsePCA, MiniBatchSparsePCA,
  dict_learning, dict_learning_online, sparse_encode (sparse coding, unsupervised-only); FactorAnalysis,
  FastICA, KernelPCA, IncrementalPCA, NMF, MiniBatchNMF, non_negative_factorization,
  LatentDirichletAllocation (unsupervised or topic-model tools, later wave; task scope is PCA and TruncatedSVD).

### model_selection
Index: https://scikit-learn.org/stable/api/sklearn.model_selection.html
- Included: train_test_split, KFold, StratifiedKFold, GroupKFold, ShuffleSplit, TimeSeriesSplit (track
  time-series), cross_val_score, cross_validate, learning_curve, validation_curve, LearningCurveDisplay,
  ValidationCurveDisplay, GridSearchCV, RandomizedSearchCV; (ext) StratifiedShuffleSplit,
  StratifiedGroupKFold, GroupShuffleSplit, RepeatedKFold, RepeatedStratifiedKFold, LeaveOneOut, LeavePOut,
  LeaveOneGroupOut, LeavePGroupsOut, PredefinedSplit, cross_val_predict, permutation_test_score,
  HalvingGridSearchCV, HalvingRandomSearchCV (experimental: need `enable_halving_search_cv` first),
  ParameterGrid, ParameterSampler, TunedThresholdClassifierCV, FixedThresholdClassifier.
- Excluded: check_cv (private-style helper that coerces a cv argument).
- Judgement calls: cross_val_* classed as stage `split` / archetype `splitter` (spec stage 5 is
  "Split and validate"); curve functions and Displays as `evaluate` / `diagnostic`.

### metrics
Index: https://scikit-learn.org/stable/api/sklearn.metrics.html
- Included, classification: accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
  average_precision_score, balanced_accuracy_score, matthews_corrcoef, confusion_matrix, classification_report,
  roc_curve, precision_recall_curve, ConfusionMatrixDisplay, RocCurveDisplay, PrecisionRecallDisplay;
  (ext) fbeta_score, precision_recall_fscore_support, cohen_kappa_score, jaccard_score, hamming_loss,
  zero_one_loss, hinge_loss, top_k_accuracy_score, class_likelihood_ratios, auc, multilabel_confusion_matrix,
  det_curve, DetCurveDisplay, confusion_matrix_at_thresholds, metric_at_thresholds (both new in 1.9).
- Included, probabilistic: log_loss, brier_score_loss; (ext) d2_log_loss_score, d2_brier_score.
- Included, regression: mean_absolute_error, mean_squared_error, root_mean_squared_error, r2_score,
  mean_absolute_percentage_error, median_absolute_error, PredictionErrorDisplay; (ext) explained_variance_score,
  max_error, mean_squared_log_error, root_mean_squared_log_error, mean_pinball_loss, mean_poisson_deviance,
  mean_gamma_deviance, mean_tweedie_deviance, d2_absolute_error_score, d2_pinball_score, d2_tweedie_score.
- Included, ranking / multilabel ranking (ext): dcg_score, ndcg_score, coverage_error,
  label_ranking_average_precision_score, label_ranking_loss.
- Included, scoring utilities: make_scorer; (ext) get_scorer, get_scorer_names, check_scoring.
- Excluded: adjusted_mutual_info_score, adjusted_rand_score, calinski_harabasz_score, cluster.contingency_matrix,
  cluster.pair_confusion_matrix, completeness_score, davies_bouldin_score, fowlkes_mallows_score,
  homogeneity_completeness_v_measure, homogeneity_score, mutual_info_score, normalized_mutual_info_score,
  rand_score, silhouette_samples, silhouette_score, v_measure_score (clustering metrics, later wave);
  consensus_score (biclustering, later wave); DistanceMetric and all `pairwise.*` kernels/distances plus
  pairwise_distances, pairwise_distances_argmin, pairwise_distances_argmin_min, pairwise_distances_chunked
  (distance utilities, not model evaluation).

### inspection
Index: https://scikit-learn.org/stable/api/sklearn.inspection.html
- Included: permutation_importance, partial_dependence, PartialDependenceDisplay; (ext) DecisionBoundaryDisplay.
- Excluded: none.

### calibration
Index: https://scikit-learn.org/stable/api/sklearn.calibration.html
- Included (all ext): CalibratedClassifierCV, calibration_curve, CalibrationDisplay.
- Excluded: none. CalibratedClassifierCV stage/archetype (`evaluate` / `composer`) is a judgement call.

### utils.class_weight
Index: https://scikit-learn.org/stable/api/sklearn.utils.html
- Included: class_weight.compute_class_weight, class_weight.compute_sample_weight (stage `model`,
  archetype `resampler`: judgement call, they rebalance without resampling).
- Excluded: every other `sklearn.utils` object (Bunch, resample, shuffle, check_* validators, tags, extmath,
  sparsefuncs, metadata_routing, discovery, estimator_checks, parallel and similar): developer or
  array-validation helpers, not workflow steps.

### dummy
Index: https://scikit-learn.org/stable/api/sklearn.dummy.html
- Included: DummyClassifier, DummyRegressor (baselines).
- Excluded: none.

## imbalanced-learn
Index: https://imbalanced-learn.org/stable/references/index.html (plus sub-pages over_sampling, under_sampling,
combine, ensemble, pipeline, metrics, model_selection).
- Included, over-samplers: RandomOverSampler, SMOTE, SMOTENC; (ext) ADASYN, BorderlineSMOTE, KMeansSMOTE,
  SVMSMOTE, SMOTEN.
- Included, under-samplers: RandomUnderSampler, TomekLinks; (ext) NearMiss, EditedNearestNeighbours,
  RepeatedEditedNearestNeighbours, AllKNN, CondensedNearestNeighbour, OneSidedSelection,
  NeighbourhoodCleaningRule, InstanceHardnessThreshold, ClusterCentroids.
- Included, combined: SMOTEENN, SMOTETomek.
- Included, other: Pipeline and make_pipeline (share page `imblearn-pipeline`); BalancedRandomForestClassifier;
  (ext) FunctionSampler, BalancedBaggingClassifier, EasyEnsembleClassifier, RUSBoostClassifier,
  InstanceHardnessCV; metrics classification_report_imbalanced, geometric_mean_score; (ext)
  sensitivity_score, specificity_score, sensitivity_specificity_support, macro_averaged_mean_absolute_error,
  make_index_balanced_accuracy.
- Excluded: keras.BalancedBatchGenerator, keras.balanced_batch_generator, tensorflow.balanced_batch_generator
  (deep learning, later wave); metrics.pairwise.ValueDifferenceMetric (internal distance for SMOTEN);
  datasets.make_imbalance, datasets.fetch_datasets (toy-data helpers); utils.* (check_neighbors_object,
  check_sampling_strategy, check_target_type, estimator_checks.parametrize_with_checks: developer helpers).

## Optuna
Index: https://optuna.readthedocs.io/en/stable/reference/index.html (study, trial, samplers, pruners,
visualization, importance, terminator, integration, plus remaining sub-pages).
- Included: create_study and Study (shared page `optuna-study`), Trial (page `optuna-trial`; its `suggest_*`
  methods are recorded under Trial); (ext) load_study, MaxTrialsCallback, FrozenTrial, TrialPruned.
- Included, samplers: TPESampler, RandomSampler, GridSampler; (ext) CmaEsSampler, GPSampler, NSGAIISampler,
  NSGAIIISampler, QMCSampler, BruteForceSampler, PartialFixedSampler.
- Included, pruners: MedianPruner, HyperbandPruner; (ext) SuccessiveHalvingPruner, PercentilePruner,
  ThresholdPruner, PatientPruner, WilcoxonPruner, NopPruner.
- Included, visualization (all plot functions in the index): plot_optimization_history, plot_param_importances,
  plot_parallel_coordinate, plot_slice, plot_contour; (ext) plot_intermediate_values, plot_edf, plot_rank,
  plot_pareto_front, plot_hypervolume_history, plot_timeline, plot_terminator_improvement.
- Included, other (ext): importance.get_param_importances, terminator.Terminator, terminator.TerminatorCallback.
- Excluded: OptunaSearchCV (ships in the separate `optuna-integration` package, not in the pinned packages;
  `optuna.integration` is empty here); study.delete_study, copy_study, get_all_study_names,
  get_all_study_summaries, StudyDirection, StudySummary, study.create_study / study.load_study (duplicate
  alias paths of the top-level functions) and their top-level delete/copy/list twins (study housekeeping);
  trial.FixedTrial, TrialState, create_trial (testing or enum helpers); samplers.BaseSampler, pruners.BasePruner,
  terminator.Base* classes (abstract bases); importance evaluator classes (Fanova, PedAnova, MeanDecreaseImpurity)
  and terminator evaluators (RegretBound, BestValueStagnation, EMMR, CrossValidationError, StaticError,
  MedianError) and terminator.report_cross_validation_scores (plug-ins for pages already included);
  storages, artifacts, distributions, search_space, logging, exceptions, cli (infrastructure);
  optuna.visualization.matplotlib (duplicate backend of the plotly functions).

## SHAP
Index: https://shap.readthedocs.io/en/latest/api.html
- Included: Explainer, TreeExplainer, LinearExplainer, KernelExplainer, PermutationExplainer;
  (ext) ExactExplainer, PartitionExplainer, SamplingExplainer, AdditiveExplainer, Explanation.
- Included, `shap.plots`: beeswarm, bar, waterfall, scatter, force; (ext) heatmap, decision, violin,
  partial_dependence, group_difference, monitoring. Pages are named `shap-<function>`.
- Excluded: DeepExplainer, GradientExplainer (deep learning, later wave); shap.plots.text, image,
  image_to_text (NLP and vision inputs); plots.embedding (niche, superseded by scatter); plots.initjs
  (notebook setup helper); Cohorts (helper container); explainers.other.* (Coefficient, Random, LimeTabular,
  Maple, TreeMaple, TreeGain: benchmark baselines); maskers.*, models.*, utils.*, datasets.* (internals and
  toy datasets).
- Docs link to `latest`, not 0.54.1; extraction should cross-check against the installed version.

## Environment notes for the coordinator
- `shap.plots.*` cannot be imported in the current `.venv` because matplotlib is not installed (it is not in
  `requirements.txt`). Matplotlib is also needed at runtime by every sklearn `*Display` and Optuna/SHAP plot
  snippet. Add a pinned `matplotlib` to `requirements.txt` (not done here; out of this task's file scope).
- IterativeImputer, HalvingGridSearchCV and HalvingRandomSearchCV import only after the
  `sklearn.experimental` enable modules have run; any import test must import those first.
