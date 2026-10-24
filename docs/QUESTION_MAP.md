# Question map

The tree's structure, and the plain-language questions shown on it. Place this file at `docs/QUESTION_MAP.md`.

This file decides two things:

1. **Placement.** Every page sits in exactly one family. Every family sits in a stage, or in a group inside a stage. That is the radial tree.
2. **Wording.** Every node has two labels: a **Names** label (the usual technical name) and a **Questions** label (what you are trying to do, in your own words). The toggle swaps one for the other. **Nothing moves.**

The `pick_when` lines were written by the designer from experience, not from the docs. Before shipping, agents check each claim against the E01 extraction and the official docs. Disagreements go to `docs/OPEN_QUESTIONS.md`; agents don't silently rewrite them.

---

## 1. How Questions mode works

- **One tree, two label sets.** Same nodes, positions, icons, colours and branching. Only text changes.
- **Toggle**: `Names | Questions`, where `Tree | List` sits today. Remembered per viewer (localStorage, wrapped in try/catch). Default: **Questions**.
- **Centre of the tree**: in Names mode, the current node's name. In Questions mode, the current node's `question_prompt` (a real question, e.g. "How should we predict the number?").
- **Nodes**: in Questions mode, the `question_label` (a short answer, e.g. "Get the best accuracy we can").
- **Pages (leaves)**: always keep their real names ("XGBoost"), because that is what you type in code. In Questions mode, the `pick_when` line shows underneath.
- **Breadcrumb**: in Questions mode it reads as a sentence, built from `question_label`s: *Predict a number › Get strong accuracy on tables › Get the best accuracy we can › XGBoost*.
- **Screen readers** get the deepest node's full `question_sentence` ("We need the best accuracy, and we can spend time tuning.").
- **Search** matches Names labels, Questions labels, `question_sentence`, `pick_when`, aliases and code names.

---

## 2. Writing rules (for anyone adding nodes later)

| Field | Where it shows | Rule | Example |
| --- | --- | --- | --- |
| `question_prompt` | Centre, when the node is open | A real question ending in "?". ≤ 48 characters. | How should we predict the number? |
| `question_label` | On the node | An answer, verb first, no "We need to". ≤ 40 characters, wraps to 2 lines max. | Get the best accuracy we can |
| `question_sentence` | Screen readers, tooltips, search | Full sentence starting "We need…" or "We have…". Use "…, but …" when a constraint is the reason the node exists. ≤ 110 characters. | We need a line, but outliers we can't remove would pull it off course. |
| `pick_when` | Under a page name, Questions mode only | The situation that makes this the right pick. No "Pick when". ≤ 60 characters. | Top accuracy on tabular data |

Style:

- **Write what we're trying to do, not how the method works.** "Get rules a person can follow", not "Recursive binary partitioning". Never phrase options as yes/no questions.
- **Constraint nodes use "but".** When a family exists because of a complication, say so: *Fit a line, but we have outliers*. Under a group that already says "but", the family label carries only the complication: *We have outliers*.
- **Use our words, not textbook words.** "Features move together", not "multicollinearity". The textbook term belongs in the Names label.
- **No jargon on the canvas.** If a technical term is unavoidable, it goes in `pick_when`, not in the label.
- Sentence case. No ampersands. No exclamation marks.

---

## 3. Structure rules

1. **Hierarchy**: `Goal › Stage › Group › Family › Page`. The **Group** level exists only where a stage would otherwise have more than 7 families.
2. **At most 7 children per node**, in every goal view.
3. **No single-child levels.** If a node has only one child in the current goal view, skip it and show its children directly. (E.g. Clean has one family, so it opens straight to its pages.)
4. **Families group by what they do, never by library.** Library variants of the same thing are tabs on one page (spec §3.3).
5. **Every page sits in exactly one family.** That includes content-only pages (hyperparameters, `feature-importances`).
6. **The goal filters the tree** by task and track. Nodes outside the goal are hidden. Layout positions are precomputed **per goal view** and stored, so each view always looks the same.
7. Order of children: the order listed in this file (most common first).
8. **The nine stages never move.** They keep the same ring position in every goal view. A stage with no pages for the current goal (e.g. Interpret when forecasting) stays in place, dimmed, labelled "Not used for this goal". Below stage level, nodes outside the goal are hidden.
9. **Checked by the validator**: every inventory and content-only page appears exactly once; at most 7 children per node in each goal view; no single-child levels; label length limits from section 2.

`For` column: **R** regression, **C** classification, **R·C** both, **TS** time series (forecast goal), **All** every goal.

---

## 4. Level 0: the goal (top bar)

This replaces the track selector. It is the first question and filters the whole tree.

**Top bar prompt**: What are we trying to do?

| Goal id | Questions label | Names label | `question_sentence` | Track | Task |
| --- | --- | --- | --- | --- | --- |
| `predict-number` | Predict a number | Standard · Regression | We need to predict a number, like a price, a demand or a duration. | standard | regression |
| `predict-category` | Sort things into categories | Standard · Classification | We need to decide which category something belongs to, like churn or not. | standard | classification |
| `forecast` | Forecast what comes next | Time series | We need to forecast future values of a series over time. | time-series | regression |

Later waves (not built in v1; listed so the wording is ready):

| Goal id | Questions label | Names label |
| --- | --- | --- |
| `find-structure` | Find groups or odd ones out | Unsupervised |
| `measure-effect` | Measure what a change caused | Causal (DoubleML) |
| `learn-from-media` | Learn from images, text or sound | Deep learning |

The Passport's task type follows the goal, and changing either changes the other.

---

## 5. Level 1: stages

**Centre prompt at the root (Questions mode)**: Where are we in the work?

| Stage | Names | Questions label | `question_sentence` | Prompt when open |
| --- | --- | --- | --- | --- |
| explore | Explore | Understand the data | We need to understand the data before modelling. | R·C: What do we need to check? · TS: What do we need to know about the series? |
| clean | Clean | Fix missing values | We need to deal with missing values. | How should we fill the gaps? |
| transform | Transform | Get the columns ready | We need to turn raw columns into features a model can use. | What do the columns need first? |
| select | Select | Keep the useful features | We need fewer, better features. | How should we cut down the features? |
| split | Split | Hold data back to test | We need to keep some data aside so we can test honestly. | How should we hold data back? |
| model | Model | R: Predict the number · C: Predict the category · TS: Make the forecast | We need a model that makes the prediction. | R: How should we predict the number? · C: How should we predict the category? · TS: How should we forecast? |
| tune | Tune | Find better settings | We need settings that make the model better. | How should we find better settings? |
| evaluate | Evaluate | Check how good it is | We need to know how good the predictions are. | R: How should we judge the numbers? · C: How should we judge the categories? · TS: How should we judge the forecast? |
| interpret | Interpret | Explain the model | We need to explain what the model learned. | What do we need to explain? |

---

## 6. Stage by stage

Each family heading gives: id · Names label · Questions label · `For`. The `question_sentence` and the prompt shown when the family is open follow underneath.

### 6.1 Explore

No group level (at most 4 families in any view).

#### `explore.normality` · Normality tests · Check for a bell curve · All
*We need to check whether values follow a bell curve.* Prompt: Which check suits our sample?

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `shapiro-wilk` | Shapiro–Wilk | All | Samples up to a few thousand rows |
| `normality-tests` | D'Agostino–Pearson (normaltest) | All | Larger samples; checks skew and tails together |

#### `explore.compare-means` · t-tests · Check if groups really differ · All
*We need to know whether a difference in averages is real or just noise.* Prompt: How were the groups measured?

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `ttest-ind` | Independent t-test | All | Two separate groups, like control vs treatment |
| `ttest-rel` | Paired t-test | All | The same rows measured twice, like before vs after |
| `ttest-1samp` | One-sample t-test | All | One group against a target value |

#### `explore.decompose` · Decomposition · Split the series into parts · TS
*We need to see trend, seasonality and noise separately.* Prompt: How many seasons does the series have?

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `seasonal-decompose` | seasonal_decompose | TS | A quick first look with one fixed season |
| `stl` | STL | TS | One season that can drift; robust to outliers |
| `mstl` | MSTL | TS | Several seasons at once, like daily and weekly |

#### `explore.cycle` · Seasonality detection · Find how long a cycle lasts · TS
*We need to find the length of the repeating cycle.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `periodogram` | Periodogram | TS | Season length unknown; shows the strongest cycles |

#### `explore.stationarity` · Stationarity tests · Check if the series is stable · TS
*We need to know whether the series keeps a steady mean and spread over time.* Prompt: Which way round should the test be?

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `adf` | ADF test | TS | Testing for a wandering trend; small p means stable |
| `kpss` | KPSS test | TS | The opposite check to ADF; small p means not stable |

#### `explore.memory` · Autocorrelation · See how the past shapes today · TS
*We need to see how strongly each value depends on earlier ones.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `acf-pacf-plots` | ACF and PACF plots | TS | Choosing AR and MA orders for ARIMA |
| `ljung-box` | Ljung–Box test | TS | Checking that leftovers are just noise |

Views: R and C show 2 families; TS shows all 6.

### 6.2 Clean

One family in v1, so Clean opens straight to its pages (rule 3).

#### `clean.impute` · Imputation · Fill in missing values · All
*We need to fill gaps so the model can use every row.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `simpleimputer` | SimpleImputer | All | Fast default: mean, median, most frequent or a constant |
| `knnimputer` | KNNImputer | All | Borrow values from the most similar rows |
| `iterativeimputer` | IterativeImputer | All | Predict each gap from the other columns; slower |
| `missingindicator` | MissingIndicator | All | The fact that a value is missing is itself useful |

v2 adds pandas families here (fix wrong types, handle dates, remove duplicates, cap extreme values), following the same rules.

### 6.3 Transform

Groups needed (12 families otherwise).

| Group id | Names | Questions label | `question_sentence` | Prompt when open | For |
| --- | --- | --- | --- | --- | --- |
| `transform.scale` | Scaling and shaping | Put numbers on a fair scale | We need numeric columns on comparable scales or shapes. | What's wrong with the numbers? | All |
| `transform.encode` | Encoding | Turn categories into numbers | We need text categories turned into numbers a model can use. | Which columns hold categories? | All |
| `transform.create` | Feature creation | Create new features | We need features the raw columns don't give us. | What should the new features capture? | All |
| `transform.rebalance` | Resampling | Rebalance lopsided classes | We need to classify, but one class is much rarer than the others. | How should we rebalance? | C |
| `transform.chain` | Pipelines and composition | Chain steps without leaks | We need steps to run in order, fitted only on training data. | What do we need to chain? | All |

#### `transform.scale.rescale` · Scalers · Make columns comparable · All
*We need columns on the same scale so no column dominates.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `standardscaler` | StandardScaler | All | Default for linear models, SVMs, k-NN and neural nets |
| `minmaxscaler` | MinMaxScaler | All | Values must sit between 0 and 1 |
| `robustscaler` | RobustScaler | All | Outliers would distort the mean and spread |
| `maxabsscaler` | MaxAbsScaler | All | Sparse data where zeros must stay zero |
| `normalizer` | Normalizer | All | Each row should have length 1, like text vectors |
| `kernelcenterer` | KernelCenterer | All | Centring a precomputed kernel matrix |

#### `transform.scale.reshape` · Distribution shaping · Make skewed columns behave · All
*We need skewed columns to look closer to a bell curve.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `powertransformer` | PowerTransformer | All | Skewed columns; Yeo-Johnson handles zeros and negatives |
| `quantiletransformer` | QuantileTransformer | All | Heavy outliers; forces a uniform or normal shape |

#### `transform.scale.bin` · Discretisation · Turn numbers into bands or flags · All
*We need to turn a number into ranges or on/off flags.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `kbinsdiscretizer` | KBinsDiscretizer | All | Group a number into ranges, like age bands |
| `binarizer` | Binarizer | All | Turn a number into 0 or 1 at a cut-off |

#### `transform.encode.features` · Categorical encoders · Encode the input columns · All
*We need to encode the category columns in X.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `onehotencoder` | OneHotEncoder | All | Few categories; the safe default for linear models |
| `ordinalencoder` | OrdinalEncoder | All | Categories with a real order, or for tree models |
| `targetencoder` | TargetEncoder | All | Hundreds of categories, like postcodes |

#### `transform.encode.target` · Label encoders · Encode the target column · C
*We need to encode y, the thing we predict.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `labelencoder` | LabelEncoder | C | Turn class names in y into 0, 1, 2 (never for X) |
| `labelbinarizer` | LabelBinarizer | C | Turn y into one 0/1 column per class |
| `label-binarizer` | label_binarize | C | The same, as a one-off function |
| `multilabelbinarizer` | MultiLabelBinarizer | C | Each row can have several labels |

In the R and TS views, `transform.encode` has one family, so it opens straight to the encoders.

#### `transform.create.expand` · Feature expansion · Add curves and interactions · All
*We need a straight-line model to capture curves or interactions.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `polynomialfeatures` | PolynomialFeatures | All | Add squares and products; few columns only |
| `splinetransformer` | SplineTransformer | All | Smooth curves without the blow-up of high powers |
| `add-dummy-feature` | add_dummy_feature | All | Add a constant column of ones |

#### `transform.create.custom` · Custom transformation · Apply our own function · All
*We need to apply our own function inside a pipeline.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `functiontransformer` | FunctionTransformer | All | Wrap a function like np.log1p as a pipeline step |

#### `transform.rebalance.weight` · Class weighting · Weight rare rows more · C
*We need the model to care more about the rare class, without changing the data.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `compute-class-weight` | compute_class_weight | C | Try before resampling; feeds class_weight or sample_weight |

Moved here from Model (it is a rebalancing tool, not a model).

#### `transform.rebalance.over` · Over-sampling · Make more rare rows · C
*We need more rows of the rare class.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `randomoversampler` | RandomOverSampler | C | Simplest: copy rare rows |
| `smote` | SMOTE | C | Make new rare rows between neighbours; numeric data |
| `smotenc` | SMOTENC | C | Like SMOTE, for numeric and category columns mixed |
| `smoten` | SMOTEN | C | Like SMOTE, for category columns only |

#### `transform.rebalance.over-hard` · Boundary over-sampling · Make rare rows near the hard cases · C
*We need more rare rows, but mostly where the classes overlap.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `borderlinesmote` | BorderlineSMOTE | C | Focus on rare rows next to the other class |
| `svmsmote` | SVMSMOTE | C | Use an SVM to find the boundary first |
| `adasyn` | ADASYN | C | More new rows where rare rows are hardest to learn |
| `kmeanssmote` | KMeansSMOTE | C | Cluster first, then fill thin rare areas |

#### `transform.rebalance.under` · Under-sampling · Use fewer common rows · C
*We need fewer rows of the common class.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `randomundersampler` | RandomUnderSampler | C | Simplest: drop common rows at random |
| `nearmiss` | NearMiss | C | Keep the common rows closest to the rare ones |
| `clustercentroids` | ClusterCentroids | C | Replace common rows with cluster centres |
| `condensednearestneighbour` | CondensedNearestNeighbour | C | Keep only the common rows needed for the boundary |
| `instancehardnessthreshold` | InstanceHardnessThreshold | C | Drop common rows a model finds hard to classify |

#### `transform.rebalance.clean` · Cleaning under-samplers · Remove overlapping rows · C
*We need fewer common rows, but only the noisy ones near the boundary.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `tomeklinks` | TomekLinks | C | Remove pairs of opposite-class neighbours |
| `editednearestneighbours` | EditedNearestNeighbours | C | Remove rows that disagree with their neighbours |
| `repeatededitednearestneighbours` | RepeatedEditedNearestNeighbours | C | Repeat that cleaning until nothing changes |
| `allknn` | AllKNN | C | Clean with growing neighbourhood sizes |
| `neighbourhoodcleaningrule` | NeighbourhoodCleaningRule | C | Gentler cleaning that protects the rare class |
| `onesidedselection` | OneSidedSelection | C | Drop redundant and noisy common rows together |

#### `transform.rebalance.combine` · Combined sampling · Make rare rows, then clean up · C
*We need to over-sample, then remove the noise that creates.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `smoteenn` | SMOTEENN | C | SMOTE, then stronger cleaning |
| `smotetomek` | SMOTETomek | C | SMOTE, then light cleaning |

#### `transform.rebalance.custom` · Custom sampling · Use our own sampler · C
*We need a resampling rule the library doesn't have.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `functionsampler` | FunctionSampler | C | Wrap our own function as a sampler step |

#### `transform.chain.pipeline` · Pipelines · Run steps in order · All
*We need steps that run in order and learn only from training data.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `pipeline` | Pipeline | All | Any multi-step model; stops leakage in cross-validation |
| `imblearn-pipeline` | Pipeline (imbalanced-learn) | C | The steps include a sampler like SMOTE |

#### `transform.chain.columns` · Column transformers · Treat columns differently · All
*We need different steps for different columns.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `columntransformer` | ColumnTransformer | All | Scale numbers and encode categories in one step |
| `column-transformer` | make_column_transformer | All | The same, with step names filled in |
| `make-column-selector` | make_column_selector | All | Pick columns by type or name pattern |

#### `transform.chain.target` · Target transformation · Transform the target, then undo it · R·TS
*We need to model a transformed target, but report in the original units.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `transformedtargetregressor` | TransformedTargetRegressor | R·TS | Train on a log target; predict in real units |

#### `transform.chain.union` · Feature unions · Run transforms side by side · All
*We need several transforms of the same columns, joined together.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `featureunion` | FeatureUnion | All | Join the outputs of several transformers |
| `feature-union` | make_union | All | The same, with step names filled in |

Views: R and TS show 4 groups; C shows 5.

### 6.4 Select

No group level (6 families).

#### `select.variance` · Variance filter · Drop columns that barely change · All
*We need to drop columns that are nearly constant.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `variancethreshold` | VarianceThreshold | All | A quick clean-up that needs no target |

#### `select.top-k` · Univariate selection · Keep the top-scoring features · R·C
*We need to keep the features that score best, one at a time.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `selectkbest` | SelectKBest | R·C | Keep a fixed number of features |
| `selectpercentile` | SelectPercentile | R·C | Keep a fixed share of features |
| `genericunivariateselect` | GenericUnivariateSelect | R·C | Switch the rule with one setting, for tuning |

#### `select.significance` · Statistical tests · Keep features that pass a test · R·C
*We need features that pass a significance test, with control over false picks.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `selectfdr` | SelectFdr | R·C | Many features; cap the share of false discoveries |
| `selectfpr` | SelectFpr | R·C | Cap false positives per feature |
| `selectfwe` | SelectFwe | R·C | Strictest: cap the chance of any false pick |

#### `select.scores` · Scoring functions · Score each feature against the target · R·C
*We need a score for how much each feature tells us about the target.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `f-regression` | f_regression | R | Straight-line link to a numeric target |
| `r-regression` | r_regression | R | Signed correlation with a numeric target |
| `mutual-info-regression` | mutual_info_regression | R | Any link, including curves; numeric target |
| `f-classif` | f_classif | C | Numeric features against a category target |
| `chi2` | chi2 | C | Counts or other non-negative features |
| `mutual-info-classif` | mutual_info_classif | C | Any link, including curves; category target |

#### `select.model-based` · Model-based selection · Let a model choose · R·C
*We need a model to decide which features earn their place.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `selectfrommodel` | SelectFromModel | R·C | Keep features above an importance or coefficient cut-off |
| `rfe` | RFE | R·C | Drop the weakest feature, refit, repeat |
| `rfecv` | RFECV | R·C | Like RFE, and picks how many to keep by cross-validation |
| `sequentialfeatureselector` | SequentialFeatureSelector | R·C | Add or remove one feature at a time; slow but thorough |

#### `select.compress` · Dimensionality reduction · Compress into fewer columns · All
*We need fewer columns, even if each one mixes the originals.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `pca` | PCA | All | Dense numeric data; scale first |
| `truncatedsvd` | TruncatedSVD | All | Sparse data, like text or one-hot columns |

### 6.5 Split

No group level (6 families). The prompt when Split is open (*How should we hold data back?*) is answered by what is special about the rows.

#### `split.holdout` · Hold-out splits · Keep one test set aside · All
*We need one test set we never train on.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `train-test-split` | train_test_split | All | The usual first split (shuffle=False for time order) |
| `shufflesplit` | ShuffleSplit | R·C | Several random hold-outs, as a cv splitter |
| `predefinedsplit` | PredefinedSplit | All | We already have a fixed validation set |

#### `split.rotate` · K-fold · Rotate the test set · R·C
*We need every row tested once, so the score is steadier.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `kfold` | KFold | R·C | Rows are independent; 5 folds is the default |
| `repeatedkfold` | RepeatedKFold | R·C | Small data; repeat with fresh shuffles |
| `leaveoneout` | LeaveOneOut | R·C | Very small data; test one row at a time |
| `leavepout` | LeavePOut | R·C | Tiny data; every set of p rows (slow) |

#### `split.stratified` · Stratified splits · Rotate, but keep class balance · C
*We need test sets, but one class is rare, so every fold must keep the same mix.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `stratifiedkfold` | StratifiedKFold | C | The default for classification |
| `repeatedstratifiedkfold` | RepeatedStratifiedKFold | C | Small, imbalanced data; repeat it |
| `stratifiedshufflesplit` | StratifiedShuffleSplit | C | Random hold-outs that keep the mix |
| `instancehardnesscv` | InstanceHardnessCV | C | Spread hard-to-classify rows evenly across folds |

#### `split.grouped` · Group splits · Rotate, but keep groups together · R·C
*We need test sets, but the same customer or patient appears many times.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `groupkfold` | GroupKFold | R·C | A group is never in both train and test |
| `stratifiedgroupkfold` | StratifiedGroupKFold | C | Groups and a rare class at once |
| `groupshufflesplit` | GroupShuffleSplit | R·C | Random hold-outs by group |
| `leaveonegroupout` | LeaveOneGroupOut | R·C | Test on one whole group at a time, like one store |
| `leavepgroupsout` | LeavePGroupsOut | R·C | Test on every set of p groups |

#### `split.time` · Time series split · Rotate, but respect time order · All
*We need test sets, but rows are in time order, so we must never train on the future.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `timeseriessplit` | TimeSeriesSplit | All | Train on the past, test on what comes next |

#### `split.run` · Cross-validation runners · Run the folds and get scores · All
*We need to run cross-validation and collect the results.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `cross-val-score` | cross_val_score | All | One metric, one number per fold |
| `cross-validate` | cross_validate | All | Several metrics, plus fit times and train scores |
| `cross-val-predict` | cross_val_predict | R·C | An out-of-fold prediction for every row; not for scoring |

Views: R shows 5 families; C shows 6; TS shows 3 (hold-out, time, run).

### 6.6 Model

Groups needed. Labels change with the goal where shown.

| Group id | Names | Questions label | `question_sentence` | Prompt when open | For |
| --- | --- | --- | --- | --- | --- |
| `model.linear` | Linear models | R: Fit a line we can explain · C: Get probabilities we can explain | R: We need a model whose effects we can read and explain. · C: We need class probabilities we can read and explain. | R: What do we need from the line? | R·C |
| `model.awkward` | Robust and generalised linear | R: Fit a line, but the data is awkward · C: Classify linearly on huge data | R: We need a line, but the target or the data breaks the usual rules. · C: We need a fast linear classifier for data too big for memory. | R: What makes it awkward? | R·C |
| `model.trees` | Trees and ensembles | Get strong accuracy on tables | We need strong accuracy on table-shaped data, and can live with less explanation. | How much power do we need? | R·C |
| `model.neighbours` | Neighbours and kernels | Learn from similar examples | We need predictions based on how close a row is to rows we've seen. | What matters most here? | R·C |
| `model.probabilistic` | Probabilistic classifiers | Weigh up evidence for each class | We need a fast classifier built on simple probability rules. | What kind of features do we have? | C |
| `model.neural` | Neural nets | Learn complex patterns | We need to learn complex patterns, and we have plenty of data. | | R·C |
| `model.baseline` | Baselines | Set a score to beat | We need a simple score that any real model must beat. | | R·C |
| `model.ts-past` | Autoregressive | Forecast from the series' own past | We need to forecast one series from its own past values. | What patterns does the series have? | TS |
| `model.ts-smooth` | Exponential smoothing | Forecast by smoothing recent values | We need a forecast that weights recent values more. | | TS |
| `model.ts-multi` | Multivariate | Forecast series that move together | We need to forecast several series that influence each other. | | TS |
| `model.ts-changing` | State space and regimes | Forecast, but the pattern shifts | We need to forecast, but the trend or behaviour changes over time. | | TS |

Views: R shows 6 groups; C shows 7; TS shows 4.

#### `model.linear.ols` · Ordinary least squares · Fit a plain straight line · R
*We need the simplest line, with readable coefficients and p-values.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `linear-regression` | Linear regression | R | Baseline; the statsmodels tab gives p-values |
| `wls` | WLS | R | Some rows are noisier than others |
| `gls` | GLS | R | Errors are correlated, for example over time |

#### `model.linear.shrink` · Shrinkage (ridge-type) · Fit a line, but features move together · R
*We need a line, but many features are correlated.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `ridge` | Ridge | R | Many correlated features; keeps them all, shrinks them |
| `ridge-cv` | RidgeCV | R | Ridge that picks its own strength |
| `pls-regression` | PLSRegression | R | More features than rows; builds a few combined ones |

#### `model.linear.sparse` · Sparse (feature-dropping) · Fit a line, and drop useless features · R
*We need a line that sets unhelpful features to zero.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `lasso` | Lasso | R | Only a few features are expected to matter |
| `lasso-cv` | LassoCV | R | Lasso that picks its own strength |
| `elastic-net` | ElasticNet | R | Drop features, but keep correlated ones together |
| `elastic-net-cv` | ElasticNetCV | R | ElasticNet that picks its own settings |
| `lars` | Lars | R | Far more features than rows; fast |
| `lasso-lars` | LassoLars | R | Lasso fitted the LARS way; very wide data |
| `orthogonal-matching-pursuit` | OrthogonalMatchingPursuit | R | Keep exactly k features |

#### `model.linear.bayes` · Bayesian linear · Fit a line, with uncertainty · R
*We need a line, plus how unsure we are about each effect.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `bayesian-ridge` | BayesianRidge | R | Ridge that tunes itself and gives a spread per prediction |
| `ard-regression` | ARDRegression | R | The same, and switches off unhelpful features |

#### `model.linear.mixed` · Mixed effects · Fit a line, but rows come in groups · R
*We need a line, but rows come in groups like stores or patients.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mixed-lm` | MixedLM | R | Each group gets its own baseline |

#### `model.linear.logit` · Logistic and probit · Get probabilities we can explain · C
*We need class probabilities with effects we can read.* (The only family in the C view, so it opens straight to these pages.)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `logistic-regression` | Logistic regression | C | The default classifier; the statsmodels tab gives p-values |
| `logistic-regression-cv` | LogisticRegressionCV | C | Picks its own strength by cross-validation |
| `probit` | Probit | C | Like logit, assuming a normal curve; common in economics |
| `mn-logit` | MNLogit | C | Three or more classes, with p-values |

#### `model.awkward.robust` · Robust regression · We have outliers · R
*We need a line, but outliers we can't remove would pull it off course.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `huber-regressor` | HuberRegressor | R | A few outliers in the target; down-weights them |
| `ransac-regressor` | RANSACRegressor | R | Many outliers; fits on the clean subset |
| `theil-sen-regression` | Theil–Sen | R | Small data with outliers; median of slopes |
| `rlm` | RLM | R | A robust fit with statsmodels output |

#### `model.awkward.quantile` · Quantile regression · We need a range, not an average · R
*We need a line for the median or a percentile, not the mean.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `quantile-regression` | Quantile regression | R | Prediction bands, or the median |

#### `model.awkward.glm` · Generalised linear (GLM) · The target is a count or amount · R
*We need a line, but the target is a count, a rate or a skewed positive amount.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `poisson-regression` | Poisson regression | R | Counts, like visits or claims |
| `negative-binomial-regression` | NegativeBinomial | R | Counts that vary more than Poisson allows |
| `gamma-regressor` | GammaRegressor | R | Positive, right-skewed amounts, like claim size |
| `tweedie-regressor` | TweedieRegressor | R | Amounts with many exact zeros, like total spend |
| `glm` | GLM (statsmodels) | R | Any of these families, with p-values |

#### `model.awkward.big` · Online / large data · The data is too big for memory · R·C
*We need a line, but the data is too big for memory or keeps arriving.* (The only family in the C view, so it opens straight to these pages.)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `sgd-regressor` | SGDRegressor | R | Millions of rows; learns in small batches |
| `passive-aggressive-regressor` | PassiveAggressiveRegressor | R | Streaming data; updates on each mistake |
| `linear-svr` | LinearSVR | R | Large data; a margin-based line |
| `sgd-classifier` | SGDClassifier | C | Millions of rows; logistic or SVM loss |
| `perceptron` | Perceptron | C | The simplest online classifier; a baseline |
| `ridge-classifier` | RidgeClassifier | C | A fast linear classifier for many classes |
| `linear-svc` | LinearSVC | C | Large or text data; margin-based |

#### `model.awkward.shape` · Curve fitting and shape · We know the curve's shape · R
*We need a curve, and we already know its formula or direction.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `curve-fit` | curve_fit | R | We know the formula, like exponential decay |
| `least-squares` | least_squares | R | The same, with bounds or a robust loss |
| `isotonic-regression` | IsotonicRegression | R | The curve can only go up (or only down) |

#### `model.trees.single` · Single tree · Get rules a person can follow · R·C
*We need simple if-then rules that a person can read.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `decision-tree-regressor` | DecisionTreeRegressor | R | Readable rules; limit the depth or it overfits |
| `decision-tree-classifier` | DecisionTreeClassifier | C | Readable rules; limit the depth or it overfits |
| `extra-tree-regressor` | ExtraTreeRegressor | R | One very random tree; mainly a building block |

#### `model.trees.bagging` · Bagging and forests · Get a strong, hard-to-break default · R·C
*We need a strong default that needs little tuning.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `random-forest` | Random forest | R·C | The first serious model to try |
| `extra-trees` | Extra trees | R·C | Faster than a forest, a bit more random |
| `bagging` | Bagging | R·C | Average many copies of any base model |

#### `model.trees.boosting` · Boosting · Get the best accuracy we can · R·C
*We need the best accuracy, and we can spend time tuning.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `xgboost` | XGBoost | R·C | Top accuracy on tabular data; mature and well documented |
| `lightgbm` | LightGBM | R·C | The same idea, usually faster on large data |
| `hist-gradient-boosting` | HistGradientBoosting | R·C | Fast boosting with no extra install; handles gaps |
| `gradient-boosting` | GradientBoosting | R·C | Small data only; slower but simple |
| `ada-boost` | AdaBoost | R·C | Classic boosting; mostly a teaching baseline today |

#### `model.trees.balanced` · Balanced ensembles · But one class is rare · C
*We need tree power, but one class is much rarer than the others.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `balancedrandomforestclassifier` | BalancedRandomForestClassifier | C | A random forest that balances each tree's sample |
| `balancedbaggingclassifier` | BalancedBaggingClassifier | C | Balanced bagging around any base model |
| `easyensembleclassifier` | EasyEnsembleClassifier | C | Many AdaBoost models on balanced samples |
| `rusboostclassifier` | RUSBoostClassifier | C | Boosting with under-sampling each round |

#### `model.trees.combine` · Model ensembles · Combine several good models · R·C
*We have several good models and want them to work together.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `voting` | Voting | R·C | Average or vote across models |
| `stacking` | Stacking | R·C | A final model learns how to weigh the others |

#### `model.neighbours.knn` · Nearest neighbours · Copy the nearest rows · R·C
*We need to predict from the most similar rows we've seen.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `k-neighbors-regressor` | KNeighborsRegressor | R | Small data, few features; scale first |
| `k-neighbors-classifier` | KNeighborsClassifier | C | Small data, few features; scale first |
| `radius-neighbors-regressor` | RadiusNeighborsRegressor | R | Uneven density; use every neighbour within a distance |

#### `model.neighbours.kernel` · Kernel methods · Fit flexible curves on small data · R·C
*We need a flexible curve, and the data is small to medium.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `svr` | SVR | R | Up to about 10,000 rows; scale first |
| `nu-svr` | NuSVR | R | SVR, controlling the share of support vectors |
| `kernel-ridge` | KernelRidge | R | Ridge with curves; fast on small data |
| `svc` | SVC | C | Up to about 10,000 rows; strong on clean, scaled data |

#### `model.neighbours.gp` · Gaussian processes · Get predictions with error bars · R·C
*We need predictions with honest error bars, and the data is small.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `gaussian-process-regressor` | GaussianProcessRegressor | R | Small data; returns a standard deviation |
| `gaussian-process-classifier` | GaussianProcessClassifier | C | Small data; probabilistic classes |

#### `model.probabilistic.nb` · Naive Bayes · Classify fast with simple rules · C
*We need a very fast classifier, even if it treats features as independent.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `gaussian-nb` | GaussianNB | C | Numeric features; a quick baseline |
| `multinomial-nb` | MultinomialNB | C | Word counts or other counts |
| `complement-nb` | ComplementNB | C | Text with lopsided classes |
| `bernoulli-nb` | BernoulliNB | C | Yes/no features, like word present or not |
| `categorical-nb` | CategoricalNB | C | Category features, encoded as integers |

#### `model.probabilistic.da` · Discriminant analysis · Model each class's spread · C
*We need to classify by modelling how each class is spread out.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `linear-discriminant-analysis` | LinearDiscriminantAnalysis | C | Classes share a similar spread; also reduces dimensions |
| `quadratic-discriminant-analysis` | QuadraticDiscriminantAnalysis | C | Each class has its own spread; needs more rows |

#### `model.neural` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mlp-regressor` | MLPRegressor | R | Plenty of data and scaled inputs |
| `mlp-classifier` | MLPClassifier | C | Plenty of data and scaled inputs |

#### `model.baseline` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `dummyregressor` | DummyRegressor | R | Predict the mean or median every time |
| `dummyclassifier` | DummyClassifier | C | Predict the most common class every time |

#### `model.ts-past` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `auto-reg` | AutoReg | TS | Simple: today depends on recent values |
| `arima` | ARIMA | TS | A trend or drift, no strong season |
| `sarimax` | SARIMAX | TS | Seasons, plus outside drivers like price or holidays |

#### `model.ts-smooth` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `exponential-smoothing` | Holt-Winters (ExponentialSmoothing) | TS | Level, trend and season, weighted to recent values |
| `ets-model` | ETSModel | TS | The same idea, with prediction intervals |
| `theta-model` | ThetaModel | TS | A strong simple benchmark; hard to beat |

#### `model.ts-multi` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `var` | VAR | TS | Several stable series, each driving the others |
| `varmax` | VARMAX | TS | The same, plus moving-average terms and outside drivers |

#### `model.ts-changing` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `unobserved-components` | UnobservedComponents | TS | Trend and seasons that drift slowly |
| `markov-regression` | MarkovRegression | TS | Behaviour switches between states, like boom and bust |

### 6.7 Tune

Groups needed.

| Group id | Names | Questions label | `question_sentence` | Prompt when open | For |
| --- | --- | --- | --- | --- | --- |
| `tune.settings` | Hyperparameters | Know which settings matter | We need to know which settings to change, and why. | What should the settings control? | All |
| `tune.search` | Search (scikit-learn) | Search through settings | We need to try settings and keep the best by cross-validation. | How big is the search space? | All |
| `tune.optuna` | Optuna | Search smarter | We need a search that learns where good settings are. | What do we need from the search? | All |
| `tune.watch` | Optuna pruning and plots | Watch and steer the search | We need to stop wasting time, and see what the search found. | What do we need to see or stop? | All |
| `tune.threshold` | Decision threshold | Pick the cut-off for a yes/no call | We need to choose the probability cut-off that turns scores into decisions. | | C |

#### `tune.settings.complexity` · Complexity · Control how complex it gets · All
*We need to stop the model memorising the training data.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `max-depth` | Tree depth limit | All | Trees overfit or underfit |

#### `tune.settings.training` · Training length · Control how long it learns · All
*We need to balance learning enough against learning noise.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `n-estimators` | Number of trees | All | Boosting underfits, or we use early stopping |
| `learning-rate` | Learning rate | All | Trading speed against accuracy in boosting |
| `early-stopping` | Early stopping | All | A validation set should decide when to stop |

New hyperparameter pages go into these families, or into new families in `tune.settings` ("Regularisation strength", "Sampling and randomness"), while the 7-children rule holds.

#### `tune.search.grid` · Grid search · Try every combination · All
*We need to try every combination of a small set of options.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `gridsearchcv` | GridSearchCV | All | Few settings, few values each |
| `parametergrid` | ParameterGrid | All | List the grid ourselves for a custom loop |

#### `tune.search.random` · Random search · Try random combinations · All
*We need to sample combinations from a large space.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `randomizedsearchcv` | RandomizedSearchCV | All | Many settings, or continuous ranges |
| `parametersampler` | ParameterSampler | All | Draw samples ourselves for a custom loop |

#### `tune.search.halving` · Successive halving · Search, but each fit is slow · All
*We need to search, but fits are slow, so weak candidates must drop out early.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `halvinggridsearchcv` | HalvingGridSearchCV | All | Grid search that cuts weak options early |
| `halvingrandomsearchcv` | HalvingRandomSearchCV | All | Random search that cuts weak options early |

#### `tune.optuna.setup` · Studies and trials · Set up the search · All
*We need to define what to search and what to optimise.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `optuna-study` | Study (create_study) | All | Start, save or reload a search |
| `optuna-trial` | Trial | All | Suggest values inside the objective function |
| `frozentrial` | FrozenTrial | All | Read a finished trial's settings and score |
| `partialfixedsampler` | PartialFixedSampler | All | Keep some settings fixed while searching the rest |

#### `tune.optuna.sampler` · Samplers · Choose how it picks the next try · All
*We need to choose the strategy for the next settings to try.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `tpesampler` | TPESampler | All | The default; good for most searches |
| `gpsampler` | GPSampler | All | Few trials, because each fit is expensive |
| `cmaessampler` | CmaEsSampler | All | Mostly continuous settings, many trials |
| `randomsampler` | RandomSampler | All | A baseline, or a wide first look |
| `qmcsampler` | QMCSampler | All | Cover the space evenly; tidier than random |
| `gridsampler` | GridSampler | All | Every combination, inside Optuna |
| `bruteforcesampler` | BruteForceSampler | All | Small discrete spaces; tries everything once |

#### `tune.optuna.multi` · Multi-objective · Balance several goals at once · All
*We need to balance goals like accuracy and speed together.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `nsgaiisampler` | NSGAIISampler | All | Two or three goals |
| `nsgaiiisampler` | NSGAIIISampler | All | Many goals at once |
| `plot-pareto-front` | plot_pareto_front | All | See the best trade-offs |
| `plot-hypervolume-history` | plot_hypervolume_history | All | See whether the trade-offs are still improving |

#### `tune.watch.prune-relative` · Relative pruners · Stop trials that lag behind · All
*We need to stop trials doing worse than earlier ones.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `medianpruner` | MedianPruner | All | The default; stop if worse than the median so far |
| `percentilepruner` | PercentilePruner | All | The same idea, with our own cut-off |
| `successivehalvingpruner` | SuccessiveHalvingPruner | All | Keep only the top share at each checkpoint |
| `hyperbandpruner` | HyperbandPruner | All | Many cheap trials; balances budgets automatically |
| `wilcoxonpruner` | WilcoxonPruner | All | Each trial is scored on many folds or instances |

#### `tune.watch.prune-rule` · Rule-based pruning · Stop trials by a fixed rule · All
*We need to stop trials when they cross a line we set.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `thresholdpruner` | ThresholdPruner | All | Stop if a score crosses a fixed value |
| `patientpruner` | PatientPruner | All | Wait a few steps before another pruner acts |
| `noppruner` | NopPruner | All | Turn pruning off |
| `trialpruned` | TrialPruned | All | Raise this to stop a trial ourselves |

#### `tune.watch.stop` · Stopping the study · Know when to stop searching · All
*We need to know when more trials won't help.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `terminator` | Terminator | All | Estimate whether more trials can still improve |
| `terminatorcallback` | TerminatorCallback | All | Stop the study automatically |
| `maxtrialscallback` | MaxTrialsCallback | All | Stop after a total number of trials |
| `plot-terminator-improvement` | plot_terminator_improvement | All | See how much room is left to improve |

#### `tune.watch.importance` · Settings plots · See which settings mattered · All
*We need to see which settings changed the score most.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `plot-param-importances` | plot_param_importances | All | Rank settings by impact |
| `get-param-importances` | get_param_importances | All | The same ranking, as numbers |
| `plot-slice` | plot_slice | All | Score against each setting |
| `plot-contour` | plot_contour | All | How two settings interact |
| `plot-parallel-coordinate` | plot_parallel_coordinate | All | Every setting of every trial at once |
| `plot-rank` | plot_rank | All | Where the best trials sit in the space |

#### `tune.watch.history` · Progress plots · See how the search went · All
*We need to see whether the search is still finding better settings.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `plot-optimization-history` | plot_optimization_history | All | The best score over trials |
| `plot-intermediate-values` | plot_intermediate_values | All | Each trial's learning curve, for pruning |
| `plot-timeline` | plot_timeline | All | When each trial ran and how long it took |
| `plot-edf` | plot_edf | All | Compare score spreads between studies |

#### `tune.threshold` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `tunedthresholdclassifiercv` | TunedThresholdClassifierCV | C | Find the cut-off that maximises a metric |
| `fixedthresholdclassifier` | FixedThresholdClassifier | C | Use a cut-off we already chose |

Views: R and TS show 4 groups; C shows 5.

### 6.8 Evaluate

Groups needed. Regression and classification see different groups.

| Group id | Names | Questions label | `question_sentence` | Prompt when open | For |
| --- | --- | --- | --- | --- | --- |
| `evaluate.error` | Error metrics | Measure how big the misses are | We need to know how far off the predictions are. | In what units should we measure the misses? | R·TS |
| `evaluate.explained` | Explained variation | Measure how much it explains | We need to know how much of the variation the model explains. | | R·TS |
| `evaluate.diagnostics` | Regression diagnostics | Check the errors look healthy | We need to check the model's assumptions before we trust it. | What might be wrong? | R |
| `evaluate.counts` | Classification metrics | Count right and wrong answers | We need to know how often the predicted labels are right. | What kind of mistake matters most? | C |
| `evaluate.prob` | Probability metrics | Judge the probabilities | We need to judge the probabilities, not just the labels. | What should the probabilities do well? | C |
| `evaluate.imbalanced` | Imbalanced-data metrics | Judge it, but one class is rare | We need a fair score, but one class is much rarer. | | C |
| `evaluate.multilabel` | Ranking and multilabel metrics | Judge several labels per row | We need to score rows with several labels, or ranked results. | | C |
| `evaluate.fit` | Validation curves | Check for over- or underfitting | We need to see whether more data or a different setting would help. | | R·C |
| `evaluate.scoring` | Scoring utilities | Use a metric in search or CV | We need a metric in a form that cross-validation and search can use. | | All |

Views: R shows 5 groups; C shows 6; TS shows 3 (error, explained, scoring).

#### `evaluate.error.units` · Absolute and squared error · In the target's own units · R·TS
*We need the error in the same units as the target, like dollars.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mean-absolute-error` | MAE | R·TS | The typical miss; easy to explain |
| `root-mean-squared-error` | RMSE | R·TS | Big misses should count more |
| `mean-squared-error` | MSE | R·TS | RMSE squared; common as a training loss |
| `median-absolute-error` | Median absolute error | R·TS | Ignore a few huge misses |
| `max-error` | Max error | R·TS | The single worst miss |

#### `evaluate.error.relative` · Percentage and log error · As a percentage or ratio · R·TS
*We need errors relative to size, so big and small targets compare fairly.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mean-absolute-percentage-error` | MAPE | R·TS | Misses as a percentage; avoid when targets are near zero |
| `mean-squared-log-error` | MSLE | R·TS | Targets span orders of magnitude |
| `root-mean-squared-log-error` | RMSLE | R·TS | The same, in log units |

#### `evaluate.error.deviance` · Deviance metrics · For counts and skewed amounts · R
*We need to score a Poisson, Gamma or Tweedie model on its own terms.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mean-poisson-deviance` | Mean Poisson deviance | R | Count targets |
| `mean-gamma-deviance` | Mean Gamma deviance | R | Positive, skewed amounts |
| `mean-tweedie-deviance` | Mean Tweedie deviance | R | Amounts with many zeros |
| `d2-tweedie-score` | D² Tweedie score | R | Share of deviance explained, like R² |

#### `evaluate.error.quantile` · Quantile loss · For a predicted range · R
*We need to score a quantile prediction, not a mean.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `mean-pinball-loss` | Pinball loss | R | Scoring a quantile model |
| `d2-pinball-score` | D² pinball score | R | Share explained, for a quantile model |

#### `evaluate.explained` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `r2-score` | R² | R·TS | Share explained; 1 is perfect, 0 matches the mean |
| `explained-variance-score` | Explained variance | R·TS | Like R², but ignores a constant offset |
| `d2-absolute-error-score` | D² absolute error | R·TS | An R²-style score built on absolute error |

#### `evaluate.diagnostics` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `predictionerrordisplay` | PredictionErrorDisplay | R | Plot predicted against actual, or the residuals |
| `residual-normality` | Residual normality tests | R | We need p-values or intervals from OLS |
| `breusch-pagan` | Breusch–Pagan test | R | Errors grow with the prediction (a fan shape) |
| `vif` | VIF | R | Features overlap so much that coefficients wobble |
| `influence` | Influence measures | R | A few rows pull the line too hard |

#### `evaluate.counts.overall` · Overall scores · One overall score · C
*We need one number for how often it's right.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `accuracy-score` | Accuracy | C | Classes are balanced |
| `balanced-accuracy-score` | Balanced accuracy | C | Classes are lopsided |
| `matthews-corrcoef` | Matthews correlation | C | One fair number, even when imbalanced |
| `cohen-kappa-score` | Cohen's kappa | C | Agreement beyond chance, like between raters |
| `top-k-accuracy-score` | Top-k accuracy | C | Counts as right if the true class is in the top k |
| `zero-one-loss` | Zero-one loss | C | The share wrong (1 minus accuracy) |
| `hinge-loss` | Hinge loss | C | Margin-based loss for SVM-style scores |

#### `evaluate.counts.pr` · Precision and recall · Weigh false alarms against misses · C
*We need to balance false alarms against missed cases.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `precision-score` | Precision | C | False alarms are costly |
| `recall-score` | Recall | C | Missing a real case is costly |
| `f1-score` | F1 | C | Both matter equally |
| `fbeta-score` | F-beta | C | Lean towards precision or recall |
| `precision-recall-fscore-support` | precision_recall_fscore_support | C | All of them per class, in one call |
| `jaccard-score` | Jaccard | C | Overlap between predicted and true labels |

#### `evaluate.counts.breakdown` · Breakdowns · See every kind of mistake · C
*We need to see exactly which classes get confused.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `confusion-matrix` | Confusion matrix | C | See right and wrong for each class |
| `classification-report` | Classification report | C | Precision, recall and F1 per class, as a table |
| `multilabel-confusion-matrix` | Multilabel confusion matrix | C | One matrix per label |
| `class-likelihood-ratios` | Likelihood ratios | C | How much a positive shifts the odds, like a test |

#### `evaluate.prob.ranking` · Ranking curves · Rank yes above no · C
*We need positives scored higher than negatives, whatever the cut-off.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `roc-auc-score` | ROC AUC | C | Classes not too lopsided; ignores the cut-off |
| `average-precision-score` | Average precision | C | Rare positives (PR-AUC) |
| `roc-curve` | ROC curve | C | See the trade-off at every cut-off |
| `precision-recall-curve` | Precision-recall curve | C | The same, for rare positives |
| `det-curve` | DET curve | C | Compare error rates on a stretched scale |
| `auc` | auc | C | Area under a curve we already computed |

#### `evaluate.prob.calibration` · Calibration and probabilistic loss · Check the probabilities are honest · C
*We need a 70% prediction to come true about 70% of the time.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `log-loss` | Log loss | C | Punish confident wrong answers |
| `brier-score-loss` | Brier score | C | The squared error of the probabilities |
| `calibration-curve` | Calibration curve | C | See whether probabilities match reality |
| `calibratedclassifiercv` | CalibratedClassifierCV | C | Fix over- or under-confident probabilities |
| `d2-log-loss-score` | D² log loss | C | Log loss as a share explained |
| `d2-brier-score` | D² Brier score | C | Brier score as a share explained |

#### `evaluate.prob.thresholds` · Threshold analysis · See scores at every cut-off · C
*We need to see how the metrics change as the cut-off moves.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `confusion-matrix-at-thresholds` | confusion_matrix_at_thresholds | C | Right and wrong counts at each cut-off |
| `metric-at-thresholds` | metric_at_thresholds | C | Any metric across cut-offs |

#### `evaluate.imbalanced` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `classification-report-imbalanced` | Imbalanced classification report | C | Per-class report with sensitivity, specificity and G-mean |
| `geometric-mean-score` | G-mean | C | Balance how well each class is found |
| `sensitivity-score` | Sensitivity | C | How many real positives we catch |
| `specificity-score` | Specificity | C | How many real negatives we keep |
| `sensitivity-specificity-support` | sensitivity_specificity_support | C | Both per class, in one call |
| `make-index-balanced-accuracy` | Index balanced accuracy | C | Adjust another metric for imbalance |
| `macro-averaged-mean-absolute-error` | Macro-averaged MAE | C | Ordered classes, like star ratings, with imbalance |

#### `evaluate.multilabel` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `hamming-loss` | Hamming loss | C | The share of labels wrong |
| `coverage-error` | Coverage error | C | How far down the list until every true label appears |
| `label-ranking-average-precision-score` | Label ranking average precision | C | Are true labels ranked near the top? |
| `label-ranking-loss` | Ranking loss | C | How often a wrong label outranks a true one |
| `dcg-score` | DCG | C | Quality of a ranked list, top-weighted |
| `ndcg-score` | NDCG | C | DCG scaled to 0–1, to compare lists |

#### `evaluate.fit` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `learning-curve` | Learning curve | R·C | Would more data help? |
| `validation-curve` | Validation curve | R·C | Where a setting starts to overfit |
| `permutation-test-score` | Permutation test score | R·C | Is the score better than chance? |

#### `evaluate.scoring` (group with pages directly)

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `make-scorer` | make_scorer | All | Turn any metric into a scorer |
| `get-scorer` | get_scorer | All | Get a built-in scorer by name |
| `get-scorer-names` | get_scorer_names | All | List the names that scoring= accepts |
| `check-scoring` | check_scoring | All | See which scorer an estimator will use |

### 6.9 Interpret

No group level (7 families).

#### `interpret.global` · Global importance · See which features matter most · R·C
*We need to know which features the model relies on overall.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `permutation-importance` | permutation_importance | R·C | Any model; score drop when a feature is shuffled |
| `feature-importances` | feature_importances_ | R·C | A quick look from a tree model; can mislead |
| `shap-bar` | SHAP bar plot | R·C | Average impact per feature |
| `shap-beeswarm` | SHAP beeswarm | R·C | Impact and direction for every row |
| `shap-violin` | SHAP violin | R·C | The beeswarm as density shapes |
| `shap-heatmap` | SHAP heatmap | R·C | Patterns of impact across rows |

#### `interpret.effect` · Feature effects · See how one feature moves it · R·C
*We need to see how the prediction changes as one feature changes.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `partial-dependence` | Partial dependence | R·C | The average effect of one or two features |
| `shap-scatter` | SHAP scatter | R·C | One feature's effect, coloured by another |
| `shap-partial-dependence` | SHAP partial dependence plot | R·C | Partial dependence with SHAP values overlaid |

#### `interpret.local` · Single predictions · Explain one prediction · R·C
*We need to explain why one particular row got its prediction.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `shap-waterfall` | SHAP waterfall | R·C | One row, feature by feature |
| `shap-force` | SHAP force plot | R·C | One row (or many) as pushes and pulls |
| `shap-decision` | SHAP decision plot | R·C | Many rows' paths from base value to prediction |

#### `interpret.explainer-fast` · Model-specific explainers · Get SHAP values for our model type · R·C
*We need SHAP values, quickly, for the kind of model we have.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `explainer` | Explainer | R·C | Start here; picks the right method for us |
| `treeexplainer` | TreeExplainer | R·C | Tree models; fast and exact |
| `linearexplainer` | LinearExplainer | R·C | Linear models |
| `additiveexplainer` | AdditiveExplainer | R·C | Additive models without interactions |
| `explanation` | Explanation | R·C | The object we get back: values, base values, data |

#### `interpret.explainer-any` · Model-agnostic explainers · Get SHAP values for any model · R·C
*We need SHAP values, but our model is a black box.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `permutationexplainer` | PermutationExplainer | R·C | Any model; faster than Kernel |
| `kernelexplainer` | KernelExplainer | R·C | Any model; slow, so use a small background set |
| `exactexplainer` | ExactExplainer | R·C | Few features; exact but slow |
| `partitionexplainer` | PartitionExplainer | R·C | Correlated features, text or images; groups features |
| `samplingexplainer` | SamplingExplainer | R·C | Any model; a sampling-based estimate |

#### `interpret.boundary` · Decision boundaries · See the decision regions · C
*We need to see where the model switches class across two features.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `decisionboundarydisplay` | DecisionBoundaryDisplay | C | Two features; a picture of each class's region |

#### `interpret.monitor` · Group comparison and monitoring · Compare groups or track drift · R·C
*We need to compare explanations between groups, or over time.*

| Page | Shown as | For | Pick it when |
| --- | --- | --- | --- |
| `shap-group-difference` | SHAP group difference | R·C | Do explanations differ between two groups? |
| `shap-monitoring` | SHAP monitoring | R·C | Does a feature's impact drift over time? |

Views: R shows 6 families; C shows 7; TS shows none (stage dimmed, rule 8).

---

## 7. "We need X, but Y" questions (cross-cutting)

These are not tree nodes. They cut across branches, so they live in **search** and in **relationship lines**: selecting one draws lines from the question to its answers, wherever those sit in the tree. They also feed **Next** (chaining) on pages.

They extend `content/questions/<stage>.yaml` with a new stem:

- `we_need_but`: display "We need…, but…". Max 7 per stage, like the other stems.

The existing stems stay, but their texts become full sentences in the same voice (e.g. `model-overfitting`: "Our model is great on training data, but poor on new data").

`answers` use page ids; `page:setting` means a setting named in that page's key settings. Agents verify each setting name against the extraction before adding it.

### Explore

| id | Text | Answers |
| --- | --- | --- |
| `but-normality-big-sample` | We need to check normality, but we have tens of thousands of rows | `normality-tests`, `shapiro-wilk` (catch-out: with big samples every test says "not normal"; plot it too) |
| `but-paired-groups` | We need to compare two groups, but the same people were measured twice | `ttest-rel` |
| `but-unknown-season` | We need to model seasonality, but we don't know the cycle length | `periodogram`, `acf-pacf-plots` |
| `but-several-seasons` | We need to decompose the series, but it has several seasons | `mstl` |
| `but-arima-orders` | We need ARIMA, but we don't know which orders to use | `acf-pacf-plots`, `adf`, `kpss` |

### Clean

| id | Text | Answers |
| --- | --- | --- |
| `but-missing-is-signal` | We need to fill gaps, but the gaps themselves tell us something | `missingindicator`, `simpleimputer:add_indicator` |
| `but-no-impute-boosting` | We need to model, but we'd rather not fill the gaps at all | `hist-gradient-boosting`, `xgboost`, `lightgbm` |
| `but-impute-no-leak` | We need to impute, but without learning from the test set | `pipeline`, `columntransformer` |

### Transform

| id | Text | Answers |
| --- | --- | --- |
| `but-scales-differ` | We need a linear model, but columns are on very different scales | `standardscaler`, `pipeline` |
| `but-scale-outliers` | We need to scale, but outliers distort the mean | `robustscaler`, `quantiletransformer` |
| `but-many-categories` | We need to encode categories, but there are hundreds of them | `targetencoder`, `hist-gradient-boosting`, `lightgbm` |
| `but-xgb-text` | We need XGBoost, but we have text columns | `xgboost:enable_categorical`, `onehotencoder`, `targetencoder` |
| `but-resample-in-cv` | We need to resample, but inside cross-validation | `imblearn-pipeline`, `stratifiedkfold` |
| `but-mixed-smote` | We need SMOTE, but some columns are categories | `smotenc`, `smoten` |
| `but-skewed-target` | We need to predict a number, but the target is very skewed | `transformedtargetregressor`, `functiontransformer`, `gamma-regressor` |

### Select

| id | Text | Answers |
| --- | --- | --- |
| `but-select-no-peek` | We need to select features, but without peeking at the test set | `pipeline`, `rfecv`, `selectkbest` |
| `but-pca-sparse` | We need to compress features, but the data is sparse | `truncatedsvd` |
| `but-nonlinear-link` | We need to score features, but the link may be curved | `mutual-info-regression`, `mutual-info-classif` |
| `but-how-many-features` | We need to drop features, but we don't know how many to keep | `rfecv`, `lasso-cv` |

### Split

| id | Text | Answers |
| --- | --- | --- |
| `but-same-customer` | We need to split, but the same customer appears many times | `groupkfold`, `stratifiedgroupkfold` |
| `but-time-order` | We need to split, but the rows are in time order | `timeseriessplit:gap`, `train-test-split:shuffle` |
| `but-tiny-data` | We need a reliable score, but we have very few rows | `repeatedkfold`, `repeatedstratifiedkfold`, `leaveoneout` |
| `but-rare-class-split` | We need to split, but one class is rare | `stratifiedkfold`, `train-test-split:stratify` |
| `but-oof-predictions` | We need a prediction for every row, but without leaking | `cross-val-predict` |

### Model

| id | Text | Answers |
| --- | --- | --- |
| `but-pvalues` | We need p-values, but scikit-learn doesn't give them | `linear-regression`, `logistic-regression`, `glm` |
| `but-small-data` | We need a good model, but we have under 1,000 rows | `ridge-cv`, `gaussian-process-regressor`, `random-forest`, `repeatedkfold` |
| `but-wide-data` | We need a model, but we have more features than rows | `lasso-cv`, `elastic-net-cv`, `pls-regression` |
| `but-count-zeros` | We need to predict counts, but many of them are zero | `tweedie-regressor`, `poisson-regression`, `negative-binomial-regression` |
| `but-too-big` | We need a model, but the data doesn't fit in memory | `sgd-regressor`, `sgd-classifier` |
| `but-svm-big` | We need an SVM, but we have 100,000 rows | `linear-svc`, `linear-svr`, `sgd-classifier` |
| `but-rare-class-model` | We need to classify, but the rare class is under 5% | `compute-class-weight`, `balancedrandomforestclassifier`, `average-precision-score`, `tunedthresholdclassifiercv` |

### Tune

| id | Text | Answers |
| --- | --- | --- |
| `but-slow-fits` | We need to tune, but each fit takes minutes | `halvingrandomsearchcv`, `medianpruner`, `gpsampler`, `early-stopping` |
| `but-several-goals` | We need to tune, but we care about speed as well as accuracy | `nsgaiisampler`, `plot-pareto-front` |
| `but-boosting-start` | We need to tune boosting, but we don't know where to start | `learning-rate`, `n-estimators`, `early-stopping`, `max-depth` |
| `but-wrong-cutoff` | We need yes/no decisions, but 0.5 is the wrong cut-off | `tunedthresholdclassifiercv`, `precision-recall-curve`, `fixedthresholdclassifier` |
| `but-when-stop-search` | We need better settings, but we don't know when to stop searching | `terminator`, `plot-optimization-history` |

### Evaluate

| id | Text | Answers |
| --- | --- | --- |
| `but-log-target-metrics` | We need to report errors, but we trained on a log target | `transformedtargetregressor`, `mean-absolute-error` |
| `but-imbalanced-score` | We need one score, but the classes are lopsided | `balanced-accuracy-score`, `matthews-corrcoef`, `average-precision-score` |
| `but-overconfident` | We need probabilities, but they look overconfident | `calibration-curve`, `calibratedclassifiercv`, `brier-score-loss` |
| `but-fan-errors` | We need to trust the line, but errors fan out as predictions grow | `breusch-pagan`, `wls`, `gamma-regressor` |
| `but-wobbly-coefs` | We need stable coefficients, but features overlap | `vif`, `ridge` |
| `but-zero-targets-mape` | We need a percentage error, but some targets are near zero | `mean-absolute-error`, `root-mean-squared-log-error` |
| `but-beat-chance` | We need to know the score is real, not luck | `permutation-test-score`, `dummyclassifier`, `dummyregressor` |

### Interpret

| id | Text | Answers |
| --- | --- | --- |
| `but-black-box` | We need to explain the model, but it's a black box | `permutation-importance`, `permutationexplainer`, `partial-dependence` |
| `but-correlated-importance` | We need importances, but our features are correlated | `permutation-importance` (catch-out: correlated features share credit), `partitionexplainer`, `shap-beeswarm` |
| `but-one-row-stakeholder` | We need to explain one decision to a stakeholder | `shap-waterfall`, `shap-force` |
| `but-explain-fast` | We need SHAP values, but KernelExplainer is too slow | `treeexplainer`, `permutationexplainer`, `explainer` |
| `but-drift` | We need to know whether the model's reasoning drifts over time | `shap-monitoring` |

### Forecast (time-series stage answers, filed under the stage of the first answer)

| id | Text | Answers |
| --- | --- | --- |
| `but-outside-drivers` | We need to forecast, but outside drivers like price matter | `sarimax`, `varmax` |
| `but-beat-simple` | We need a forecast, but we don't know if it beats a simple one | `theta-model`, `exponential-smoothing` |
| `but-intervals` | We need a forecast, but with a range, not one number | `ets-model`, `sarimax` |
| `but-regime-change` | We need to forecast, but behaviour switches between states | `markov-regression`, `unobserved-components` |

---

## 8. Migration notes

Old family names (inventory `family` field) map to the ids above. The page tables are the source of truth: every page id appears exactly once. Notable merges and moves:

| Old family (inventory) | New family |
| --- | --- |
| Boosting (scikit-learn), Boosting (XGBoost), Boosting (LightGBM) | `model.trees.boosting` |
| Ordinary, Linear, Quick fits (linregress) | `model.linear.ols` (`linear-regression`) |
| Robust to outliers, Robust / quantile, Quick fits (theilslopes) | `model.awkward.robust` and `model.awkward.quantile` |
| Generalised (GLM), Generalised, Discrete outcomes (Poisson, NegativeBinomial) | `model.awkward.glm` |
| Classification, Discrete outcomes (Logit, Probit, MNLogit) | `model.linear.logit` and `model.awkward.big` |
| Kernel | `model.neighbours.kernel` (LinearSVR, LinearSVC move to `model.awkward.big`) |
| Latent / shape-constrained | PLSRegression → `model.linear.shrink`; IsotonicRegression → `model.awkward.shape` |
| Class weighting (model) | `transform.rebalance.weight` |
| Assumption tests | `explore.normality` and `explore.compare-means` |
| Feature selection, Univariate scoring functions | split across the six `select.*` families |
| Splitters | split across the six `split.*` families |
| Classification metrics, Classification curves, Probabilistic scoring, Calibration | split across `evaluate.counts.*` and `evaluate.prob.*` |
| Search, Decision threshold, Study, Trial, Samplers, Pruners, Study plots, Early stopping (Optuna) | `tune.search.*`, `tune.threshold`, `tune.optuna.*`, `tune.watch.*` |
| Explainers, SHAP plots, Feature importance, Partial dependence, Decision boundary | the seven `interpret.*` families, by job |
| Content-only: Tree shape, Boosting rounds, Boosting step size, Boosting stopping rule, Model attributes | `tune.settings.complexity`, `tune.settings.training`, `interpret.global` |

`prep` steps in item records reference `{family, stage}` (docs/CONTENT_SCHEMA.md). They must migrate to the new family ids (e.g. `Scaling` → `transform.scale.rescale`, `Categorical encoding` → `transform.encode.features`). "Alternative to" relationships regenerate from the new families: all four boosting libraries become each other's siblings, as intended.
