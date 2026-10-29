# ML Field Guide — Design and Build Spec

Handoff context for Claude Code. This is the complete set of product, UX, content and visual decisions made so far. Treat it as the source of truth; where something is marked **Open** or **v2**, do not build it in v1.

---

## 1. Problem

I'm a data scientist. I know *what* each stage of a data science workflow needs, but I lose time recalling *which library, function and variant* fits my situation, and how to use it. I need comprehensive guidance (why, when, how, what comes out) **without word salad**, structured for a **dyslexic reader**.

Two jobs the app must do:

- **Lookup**: I'm mid-task and need one answer fast ("what regularisation options does Ridge have?", "what methods does XGBoost expose?"). Navigate there in a few clicks, inside one space, not page to page.
- **Build**: I pick steps stage by stage, the app validates that they work together, and it gives me a notebook scaffold.

Guiding principles:

- **Recall and decision support, not tutorials.**
- **Predictability over cleverness.** Layouts and slot positions never move.
- **Show, don't tell.** Visual diffs and short animations instead of paragraphs.
- **Progressive disclosure.** Depth exists, but only when asked for.

---

## 2. User and context

- **Single user** (me). No accounts.
- **Device**: desktop first; foldable phone (unfolded, near-square) second.
- **Dyslexia-first**: this is a core constraint, not a setting. If it works for my brain, it's faster for everyone.

---

## 3. Information architecture

### 3.1 Stages (pipeline order)

1. Explore (EDA)
2. Clean
3. Transform and engineer features
4. Select or reduce features
5. Split and validate
6. Model
7. Tune
8. Evaluate
9. Interpret

Shipping (save, load, serve) is **out of scope**.

### 3.2 Tracks

Tracks are not stages; they cut across stages and **filter** what each stage shows.

- Standard (supervised)
- Unsupervised
- Time series (including decomposition, seasonality, and Bayesian MMM such as Google Meridian)
- Causal (DoubleML) — **later wave**
- Deep learning — **later wave**

Example: choosing Time series means Split shows only time-aware splits, Explore gains seasonality and decomposition, Model shows ARIMA/SARIMAX/ETS etc.

**Goal question (A1).** The track is not picked directly. The top bar asks the first question, **"What are we trying to do?"**, and each goal sets a track **and** a task, filtering the whole app:

| Goal | Track | Task |
| --- | --- | --- |
| Predict a number | standard | regression |
| Sort things into categories | standard | classification |
| Forecast what comes next | time-series | regression |

Later-wave goals are listed in `docs/QUESTION_MAP.md` §4 and are not built in v1. The Passport's task type and the goal stay in sync: changing one changes the other. In Names mode the selector shows "Standard · Regression" and so on.

### 3.3 Hierarchy

`Goal › Stage › Group › Family › Page` (A2)

- **Group** exists only where a stage would otherwise have more than 7 families.
- **At most 7 children per node, in every goal view. No single-child levels** (skip the level and show its children).
- **Family** = siblings that do the same job (e.g. Boosting: GradientBoosting, HistGradientBoosting, XGBoost, LightGBM). **Families group by job, never by library.**
- Every page, including content-only pages, sits in **exactly one family**.
- **Placement and labels come from `docs/QUESTION_MAP.md`**, converted to the machine-readable `content/taxonomy.yaml` (goals, stages, groups, families, page placements, labels, `pick_when`, task/track tags). The taxonomy is the source of truth for placement; the inventory's `family` field stays as provenance only.
- The nine stages keep the same ring position in every goal view. A stage that is empty for a goal stays in place, dimmed, labelled "Not used for this goal".
- Positions are precomputed **per goal view** and stored (§7: nothing re-lays-out on load).
- **Same model, different library** (e.g. Linear regression in scikit-learn vs statsmodels `OLS` vs SciPy `linregress`) = **one page** with library tabs in the Code slot, each tab with a one-line "why this library" (statsmodels: p-values; scikit-learn: pipelines).

### 3.4 Questions mode: same tree, second set of labels (A3)

The two doors are one radial tree with a **label toggle**: `Names | Questions`, where `Tree | List` used to sit.

- Same nodes, positions, icons, colours and branching. **Only text changes.** Toggling never moves anything.
- Default: **Questions**. The choice is remembered per viewer (localStorage, wrapped in try/catch; the app must work without it).
- The centre shows the open node's `question_prompt` in Questions mode, and its name in Names mode.
- Nodes show `question_label`. Pages keep their real names, with `pick_when` underneath in Questions mode.
- In Questions mode the breadcrumb reads as a chain of `question_label`s.
- The accessible name for each node is its full `question_sentence`.
- Writing rules and length limits: `docs/QUESTION_MAP.md` §2, enforced by the validator.

**Symptom questions** are not tree nodes; they show through search and as relationship lines to their answers. Fixed stems only:
  - "My data is…" (imbalanced, time-ordered, high-dimensional, messy, small…)
  - "My model is…" (overfitting, too slow, underperforming, not reproducible…)
  - "I want to know…" (which features matter, how confident it is, how good it is without a test set…)
  - "We need…, but…" (`we_need_but`; seed data in `docs/QUESTION_MAP.md` §7)
  - Cap at about 5–7 questions per stem per stage.
  - Questions use my wording ("overfitting"), not textbook terms ("high variance"), written as full sentences in the same voice (e.g. "Our model is great on training data, but poor on new data").
- **Chaining**: each answered question suggests the next one (e.g. "overfitting" → "how good is it now?").
- Questions can return settings, outputs and methods together (e.g. "My model is overfitting" → `max_depth`, `min_samples_leaf`, `ccp_alpha`, `max_features`).

### 3.5 Search

Global search above all views. Matches plain names, code names, aliases and questions, plus (A3) Questions labels, `question_sentence`s and `pick_when` lines. Results show stage and track; selecting one flies the current view to it. Client-side fuzzy search (e.g. Fuse.js or MiniSearch).

### 3.6 Semantic zoom

The map changes *what* it shows as you go deeper, not just its size. Level 1 shows stages only; opening a stage shows its families; opening a family shows its items. Never all items at once.

---

## 4. Page archetypes

Every item page uses the **same 12-slot template** (section 5). The archetype decides what the hero visual and toy example look like.

| Archetype | Examples | Hero visual | Icon (Tabler) |
| --- | --- | --- | --- |
| Transformer | Scaler, encoder, imputer | Before/after table, changed cells highlighted | `ti-transform` |
| Resampler | SMOTE, undersampling | Class bars rebalancing | `ti-scale` |
| Selector / reducer | SelectKBest, PCA, RFE | Columns fading out; points collapsing onto an axis | `ti-filter` |
| Splitter | Train/test, K-fold, time series split | Strip of rows colouring into folds | `ti-arrows-split-2` |
| Model | Random forest, XGBoost | Decision boundary or fit line forming | `ti-cube` |
| Hyperparameter | `max_depth`, `alpha` | Behaviour change plus underfit/overfit curve | `ti-adjustments-horizontal` |
| Tuning strategy | Grid, random, Optuna | Dots exploring a search space | `ti-target` |
| Metric | Precision, R², RMSE | What it measures lighting up (e.g. confusion matrix cells) | `ti-ruler-measure` |
| Diagnostic / explainer | Learning curve, residuals, SHAP | The chart itself, building in | `ti-stethoscope` |
| Output / attribute | `coef_`, `feature_importances_` | The value plotted | `ti-database-export` |
| Composer | Pipeline, ColumnTransformer | Boxes snapping together | `ti-stack-2` |

Note: **parameters** (learned, e.g. `coef_`) are Outputs; **hyperparameters** (set by you, e.g. `max_depth`) are their own archetype.

---

## 5. Content schema (the most important build artefact)

Every page is a **filled-in form**, not a designed page. The app draws pages from the forms. This makes 150+ pages maintainable, lets the design change in one place, and feeds validation and relationship lines.

### 5.1 The 12 slots (fixed order, on every page)

Slots never move. An empty slot shows "None" rather than disappearing.

1. **Header**: archetype icon, plain English name ("Tree depth limit"), code name underneath (`max_depth`), archetype badge. (A9) Hide the stage badge when its label repeats the archetype badge (e.g. Model + Model); keep the stage colour as a dot on the archetype badge in that case.
2. **Solves**: hero visual (cutscene) plus one line.
3. **Quick facts**: default value and typical range (models: task type, data-size sweet spot).
4. **Use when / Avoid when**: tags, not sentences.
5. **Before you use it**: prep checklist; every relevant step marked **Required**, **Recommended** or **Not needed**. "Not needed" matters as much as "Required" (e.g. no scaling before trees). Each item links to that step's page.
6. **Code**: tabbed by library. Every snippet includes its imports, a library version stamp comment, and must run when pasted into a real notebook.
7. **What comes out** (A4): what do I get back, what shape is it, and what do I use next? Contents by archetype in the table below. Always renders ("None" when empty) and has a small visual in the same style as Watch it work:
    - Classification models: the `predict_proba` table on toy rows, with the class-1 column highlighted as `y_score` and a threshold slider that flips the labels.
    - Regression models: `y_pred` on toy rows, with an "undo log target" toggle.
8. **Catch-outs**: warning callout, placed right after the code (that's where mistakes happen).
9. **Key settings**: hyperparameters worth tuning, in tiers labelled (A10) **Most used** (visible), **Also useful** (one tap) and **Rarely changed** (collapsed), each linking to its own page. Defaults show the **effective** value large ("100"), with "set as None in the signature" in small text only when the signature default differs.
10. **Watch it work**: toy example with a slider, driven by the shared toy datasets.
11. **Intuition / How it works**: collapsed. On Model pages this expands into:
    - The one idea (one sentence)
    - Everyday analogy
    - Animation
    - Good at / Bad at (tags)
    - Vs. siblings (short; compare view is v2)
    - *Read more*: step-by-step walkthrough of the algorithm
12. **Next**: chained follow-up questions.

**What comes out, by archetype (A4).** Every code line follows the snippet rules (imports, version stamp, runs when pasted) and every claim is verified against the E01 extraction.

| Archetype | What comes out |
| --- | --- |
| Model | The prediction methods (`predict`, `predict_proba`, `decision_function` where they exist), the shape of each, and the next step. **Classification:** `predict_proba` gives one column per class in `classes_` order; for two classes keep `[:, 1]`; `predict` equals a 0.5 cut-off; ROC AUC and PR curves need the probabilities, not labels; for 3+ classes, one column per class. **Regression:** `predict` gives one value per row; undo any target transform (e.g. `np.expm1` after `np.log1p`) before reporting errors. Plus the fitted attributes people use most (e.g. `feature_importances_`, `coef_`, `best_iteration`). |
| Transformer | What `transform` returns (NumPy array, sparse matrix, or DataFrame with `set_output(transform="pandas")`), how column names change (`get_feature_names_out()`), shape change, whether `inverse_transform` exists. |
| Resampler | `fit_resample` returns `X_res, y_res`; training data only; how the shape changes. |
| Selector / reducer | `get_support()`, `get_feature_names_out()`, shape after `transform`. |
| Splitter | The return order (e.g. `X_train, X_test, y_train, y_test`), or that `split()` yields index arrays; how to pass it as `cv=`. |
| Hyperparameter | The fitted attribute that reports the value actually used (e.g. `n_estimators_`, `n_iter_`, `best_iteration`). |
| Tuning strategy | `best_params_`, `best_score_`, `best_estimator_`, `cv_results_` (as a DataFrame); for Optuna, `study.best_params`, `study.best_value`, `trials_dataframe()`. |
| Metric | A float, or an array per class with `average=None`; whether higher or lower is better; the range. |
| Diagnostic / explainer | The object returned (Display with `.plot()`, SHAP `Explanation` with `.values`, `.base_values`, `.data`) and their shapes. |
| Output / attribute | Its shape, and how to line it up with feature names. |
| Composer | How predictions pass through, how to reach inner steps (`named_steps`), feature names from a ColumnTransformer. |

### 5.2 Schema requirements

- One record per item; archetype-specific variants of the same 12 fields.
- Fields for: plain name, code name, aliases, stage, family (a taxonomy family id, A2), track(s), archetype, question tags, relationships (5.3), source URL(s), library version, `reviewed` flag.
- Relationship lines and validation rules are **derived from schema fields**, never hand-written separately.

### 5.3 Relationship types

| Type | Meaning | Source field |
| --- | --- | --- |
| Needs | Required prep | Prep checklist: Required |
| Recommended | Works better with | Prep checklist: Recommended |
| Clashes | Not needed or harmful together | Prep checklist: Not needed, plus explicit clashes |
| Alternative to | Siblings that do the same job | Family membership (taxonomy family, A2) |
| Pairs with | Natural partners (e.g. XGBoost → SHAP) | Explicit field |

### 5.4 Example: XGBoost

- Before you use it: Scaling — Not needed (trees split on order, not size); Imputing — Not needed (handled natively); Encoding categories — Required (unless `enable_categorical`); Imbalance — Recommended (`scale_pos_weight`); Validation set — Recommended (for early stopping).
- Key settings: Tier 1 `n_estimators`, `learning_rate`, `max_depth`, `early_stopping_rounds`; Tier 2 `subsample`, `colsample_bytree`, `min_child_weight`; Tier 3 `reg_lambda`, `reg_alpha`, `gamma`.
- Intuition: build small trees one after another, each fixing the mistakes of the last. Analogy: a team correcting an essay, each person only fixing what's still wrong.

---

## 6. Wave 1 catalogue

The design is comprehensive from day one; content is filled in waves. Wave 1: regression, classification, trees, MLP, time series. Libraries: scikit-learn, statsmodels, SciPy, XGBoost, LightGBM, plus the supporting cast.

### scikit-learn: linear models
- Ordinary: LinearRegression
- Regularised: Ridge, RidgeCV, Lasso, LassoCV, ElasticNet, ElasticNetCV, Lars, LassoLars, OrthogonalMatchingPursuit
- Bayesian: BayesianRidge, ARDRegression
- Robust to outliers: HuberRegressor, RANSACRegressor, TheilSenRegressor
- Quantile: QuantileRegressor
- Generalised (GLM): PoissonRegressor, GammaRegressor, TweedieRegressor
- Online / large data: SGDRegressor, PassiveAggressiveRegressor
- Classification: LogisticRegression, LogisticRegressionCV, RidgeClassifier, SGDClassifier, Perceptron

### scikit-learn: other regressors and classifiers
- Kernel: KernelRidge, SVR, LinearSVR, NuSVR, SVC, LinearSVC
- Neighbours: KNeighborsRegressor, KNeighborsClassifier, RadiusNeighborsRegressor
- Gaussian process: GaussianProcessRegressor, GaussianProcessClassifier
- Latent / shape-constrained: PLSRegression, IsotonicRegression
- Probabilistic classifiers: GaussianNB, MultinomialNB, BernoulliNB, ComplementNB, CategoricalNB, LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis

### Trees and ensembles
- Single tree: DecisionTreeRegressor, DecisionTreeClassifier, ExtraTreeRegressor
- Bagging: RandomForest, ExtraTrees, BaggingRegressor/Classifier
- Boosting (scikit-learn): GradientBoosting, HistGradientBoosting, AdaBoost
- Boosting (XGBoost): XGBRegressor, XGBClassifier
- Boosting (LightGBM): LGBMRegressor, LGBMClassifier
- Combining models: VotingRegressor/Classifier, StackingRegressor/Classifier

### scikit-learn: neural nets
- MLPRegressor, MLPClassifier

### statsmodels: regression (inference-first)
- Linear: OLS, WLS, GLS
- Generalised: GLM (Gaussian, Poisson, Binomial, Gamma, Tweedie, NegativeBinomial families)
- Discrete outcomes: Logit, Probit, MNLogit, Poisson, NegativeBinomial
- Robust / quantile: RLM, QuantReg
- Grouped data: MixedLM
- Diagnostics: residual normality, heteroscedasticity (Breusch-Pagan), multicollinearity (VIF), influence

### statsmodels: time series
- Decomposition and seasonality: seasonal_decompose, STL, MSTL
- Stationarity checks: ADF, KPSS, ACF/PACF plots, Ljung-Box
- Autoregressive: AutoReg, ARIMA, SARIMAX
- Smoothing: ExponentialSmoothing (Holt-Winters), ETSModel, ThetaModel
- Multivariate: VAR, VARMAX
- State space / regime: UnobservedComponents, MarkovRegression

### SciPy
- Quick fits: stats.linregress, stats.theilslopes
- Custom curves: optimize.curve_fit, optimize.least_squares
- Seasonality detection: signal.periodogram
- Assumption tests: Shapiro-Wilk, normality tests, t-tests

### Supporting cast (required for any model page to work)
- scikit-learn preprocessing (scalers, encoders, imputers), splitting, metrics, model selection/search; imbalanced-learn; Optuna; SHAP.

### Later waves
- Unsupervised (k-means, DBSCAN, hierarchical, Gaussian mixture, isolation forest, PCA as a model)
- Time series extras: Prophet, Meridian (Bayesian MMM; requires Python 3.11–3.13 — a ready-made catch-out)
- Causal: DoubleML (PLR, PLIV, IRM, IIVM; nuisance models are scikit-learn learners, so it cross-links to model pages)
- Deep learning track (framework TBD)
- v2 Clean stage: pandas recipes, especially datetime handling (I will supply code examples)

---

## 7. Views

One content tree, three views (radial tree, constellation, route map), each for one job. All read the same data. **Positions are computed once and stored with the content**, never re-simulated on load, so nothing rearranges between sessions (spatial memory).

### 7.1 Radial tree — Lookup ("what exists and where it lives")

- Centre = current goal; stages around it; groups, families and items bloom outward.
- (A5) An opened node's children **fan outward from that node**, attached by visible links, around the node's own angle. Never a detached column, and never a comb drawn off to one side of the canvas. This applies at every level (stage → group → family → pages).
- (A5) Other stages **keep their labels**, dimmed (not hidden). Collisions are resolved in the layout, not by hiding labels.
- **Labels always horizontal** (never rotated with the branch).
- **Accordion**: opening a branch closes its siblings, so only one path is ever expanded.
- **Zoom to fit** the opened path so nothing runs off-screen.
- **Relationship lines on demand**: e.g. "What does XGBoost need?" draws curved lines through the centre to the related items, styled by relationship type (Needs, Recommended, Pairs with…), with a legend.
- Selecting an item opens the panel (desktop: side by side; phone: bottom sheet).
- Library: D3 (custom), not a charting library, to control labels.

### 7.2 Constellation — Relationships ("how items connect")

- Every item is a star with a fixed position; clusters per stage; dotted path through clusters in pipeline order.
- Semantic zoom: stage names at first; family names, then item names appear as you zoom in.
- **Filters**:
  - Relationship type (multi-select): Needs, Recommended, Clashes, Alternative to, Pairs with
  - Focus: select a star to keep only its neighbourhood lit (1-step / 2-step toggle)
  - Scope: limit to a stage or a track
- **Filtering dims, never moves.**
- Library: force-graph (2D canvas), with positions precomputed and fixed.

### 7.3 Route map — Build ("the pipeline I'm assembling") (A6, reversed by A11)

**A11 (2026-10-29): the globe returns as the Build view and replaces the flat route map described below. Keep `globe.gl` and `three`. §8.1 is the current design. The route-map text in this section stays as the record of what the globe must still answer: the four questions, the stage statuses and the shape-after-stage numbers.**

Build was a **flat route map**. Its job: show the pipeline I'm building, answer four questions at a glance, and let me edit it.

1. What's left to pick?
2. Does it all fit together?
3. How does my data change shape?
4. What else could I have picked here?

**Layout**

- Stages run left to right on desktop and top to bottom below 900px. Every stage always appears, in pipeline order.
- A continuous **band** runs through the stages. **Band width encodes the column count** (square-root scale, minimum 4px), so one-hot visibly widens it and selection narrows it. After Model the band collapses to one column (the predictions); after Evaluate it becomes a single point (one number). Width changes animate over 450ms with the spec easing; with reduced motion they apply instantly.
- Band colour follows the stage's worst status: Valid (accent tint), Warn (amber tint), Block (red tint). An unpicked stage shows a dashed outline. A skipped stage shows a dashed outline labelled "Skipped", so "skipped" never looks like "forgotten".

**Each stage shows**

- The stage name, icon and a status chip (Valid, Warning, Blocked, Tip, Skipped, Not picked; always icon plus label).
- **The chosen stop(s)** as solid chips with a remove control. Transform can hold several stops (e.g. encode, then scale).
- **Alternatives** as faint chips beside the choice: siblings from the same family first, then the family's group. At most 4. Tapping one swaps it in and re-validates immediately.
- When nothing is picked: the most common options as faint chips, plus "Skip".
- **Data shape after the stage** (e.g. `1,460 × 262`, `+181 columns`), in Atkinson with tabular figures. Shapes are computed at build time on the goal's toy dataset and labelled "on the sample data". Don't extrapolate to the user's real data.
- Validation messages for that stage as callouts, each with its fix button and a "Why?" link.

**Top and bottom**

- The **Passport** (goal, starting shape, has categories, has missing values, time-ordered, imbalanced) as editable chips at the top. Editing it re-validates.
- "Try a sample route" (§8).
- **Get notebook (N cells)** at the bottom. It opens the notebook view.

**Behaviour examples (the demo must reproduce these)**

- Sample route with XGBoost plus Standard scaling → Transform shows a Warning: "Scaling is not needed before trees", with a "Remove scaling" fix.
- Swap XGBoost for Ridge → that warning disappears. A Tip appears ("Ridge works best on scaled features"), plus Interpret flags `feature-importances` ("Ridge has coefficients, not importances").
- Remove the encoder while the Passport says "has categories" → Blocked, unless the model handles categories natively (then a Tip).
- Choose Early stopping with Random forest → Blocked: "Early stopping needs a boosting model", with a fix.

Rules come from schema data (§8); the schema fields these behaviours need are recorded in `docs/CONTENT_SCHEMA.md`. Keyboard navigation works across stages and chips. (A11: `globe.gl` and `three` now stay in the bundle.)

### 7.4 Desktop layout

- Top bar: search (Ctrl/Cmd+K), goal selector ("What are we trying to do?", A1), `Names | Questions` label toggle (A3), view switcher (Tree / Constellation / Journey), mode toggle (light/dark/system), accessibility settings.
- Main: canvas left (~60%), panel right (~40%, min 420px, max 560px), independent scrolling.
- Below 900px width: canvas full screen, panel as a bottom sheet.
- Max reading width in panels: 68 characters.

---

## 8. Pipeline builder

- **Scope v1**: one model per pipeline.
- **Flow**:
  1. Data profile (3–4 taps) → becomes the Passport.
  2. Pick per stage, from the radial tree or "Add to route" on any page.
  3. Live validation as you pick, not at the end.
  4. Generate → notebook view.
- **Defaults (A7)**:
  - The default state is an **empty route** with an editable Passport. A "Try a sample route" button loads the demo route.
  - "Add to route" appears on every page panel and on every page node in Questions mode.
  - Every validation message carries a one-tap fix where one exists, and links to the page that explains it.
  - "Get notebook" is never disabled. If there are blockers, pressing it lists them with their fixes.
- **Optional stages** (e.g. Select) can be skipped; shown as fly-overs, never as missing.
- **Override**: Warn and Tip can be dismissed; Block can be overridden with a one-line acknowledgement.
- **Why did this fire**: every validation message links to the page that explains it.

### 8.1 Globe build journey (A11)

**Two entry flows**

1. **I know my model.** Pick the model first. Then either:
   - answer a short set of questions that narrows the pre- and post-processing steps, or
   - click any steps directly from the full list.
2. **I don't know my model.** Answer questions about the prediction wanted and about the data (more columns than rows, missing values, categories, time order, imbalance, size). The Passport fills as you answer, and the globe populates.

**Narrowing, not deciding**

- Questions narrow the choices; they never pick for the user.
- Each stage then shows a short list of **proposals**. Every proposal carries pros and cons as a tooltip, and a click adds it to the journey.
- A **"Choose from the full list"** button opens every item for that stage. Compatibility marks return in the full list.

**Three-level compatibility**

| Colour | Mark | Meaning | Rule severities |
| --- | --- | --- | --- |
| Green | tick | Compatible | none fired |
| Yellow | ? | Works, but not recommended | Warn and Tip (the tooltip says which) |
| Red | cross | Incompatible | Block |

- Marks use icon plus label, never colour alone (§11).
- Block can still be overridden with a one-line acknowledgement (§8).
- Compatibility is checked against the model and against every other pick. It updates as you pick.

**Journey side panel**

- One **capsule** per branch of the journey (one per stage that holds a pick).
- Expanding a capsule shows a short write-up of what the chosen steps do, with links to their pages.
- A page link opens that page in a **second side panel**, next to the journey panel. Closing it returns to the journey.

**Notebook (.ipynb)**

- The steps run in stage order, and each step's output is the next step's input.
- This holds because every cell uses one **shared variable vocabulary** (the table below). Templates read and write only these names, so cells chain without glue code.
- The user brings their own data. The first cell holds the only user edits: the file path, the target column name and the column lists, each marked with a TODO comment that says what to call it.
- Fixed templates stay deterministic (§8 Output).
- Testing: the chaining is verified later by running notebooks on the toy datasets. This is not part of v1 delivery; the names alone are the v1 guarantee.

| Name | Holds |
| --- | --- |
| `df` | the raw table as loaded |
| `target` | name of the target column (string) |
| `X`, `y` | features and target, after the cleaning stage |
| `X_train`, `X_test`, `y_train`, `y_test` | the split |
| `numeric_cols`, `categorical_cols` | column lists the user sets |
| `preprocess` | the ColumnTransformer or Pipeline of transform steps |
| `model` | the fitted or unfitted estimator |
| `y_pred`, `y_proba` | predictions, class probabilities |
| `cv` | the cross-validation splitter |
| `scores` | cross-validation scores |

The vocabulary grows in `docs/CONTENT_SCHEMA.md` terms: a name is added once and reused everywhere, never renamed per page.

### Validation rules (derived from schema data)

| Rule | Example | Severity |
| --- | --- | --- |
| Missing requirement | XGBoost picked, categoricals present, no encoder | Block |
| Wrong for the track | Random K-fold on time-ordered data | Block |
| Task mismatch | R² picked for a classifier | Block |
| Leakage risk | Scaler fitted before the split | Warn (auto-fixed by wrapping in a Pipeline) |
| Redundant step | Scaling before a tree model | Warn |
| Missing recommendation | Imbalanced data, no class weighting | Tip |

### Output

- Opens a **notebook-style page**: one cell per stop, each with its own copy button.
- **Download as .ipynb.**
- Code from **fixed templates** (deterministic: the same picks always produce the same notebook), using scikit-learn `Pipeline` / `ColumnTransformer` in fixed stage order, a comment per section, and TODO placeholders for column names and paths.

---

## 9. Cutscenes and toy data

- **Code-driven animation**, authored by Claude Code with a motion skill (e.g. Remotion's official Claude Code plugin, or HTML + GSAP), **played live in the page** (no video files needed), driven by data so they're small and updatable.
- **Pre-rendered "cutscene" philosophy**: numbers are approximate and illustrative; the point is to show shape changes (rows, columns, distributions, boundaries).
- **Shared toy datasets everywhere** so the data itself becomes familiar:
  - Regression: house prices (Ames)
  - Classification: breast cancer (`sklearn.datasets.load_breast_cancer`; decided 2026-10-24)
  - Time series: airline passengers
- **Motion rules**: plays once on open (≤ ~1.2s), no loops, replay button, respects `prefers-reduced-motion` (replace with a static end frame or a ≤120ms fade).

---

## 10. Visual design system: Observatory

**Vibe**: a quiet observatory at night. The canvases are the night sky: deep, still, with coloured stars and glowing paths. The panels are the observer's notebook: calm, readable, precise. Drama lives in the canvases and cutscenes; the panels stay quiet. Theme follows the system setting; both light and dark are first-class.

### 10.1 Typography

| Role | Font | Notes |
| --- | --- | --- |
| Headings (18px+ only) | Space Grotesk 500 | Distinctive, geometric; never below 18px |
| Body and UI | Atkinson Hyperlegible 400 / 700 | Designed for legibility; distinct letterforms. Tables, shapes, defaults and numbers in text use it with `font-variant-numeric: tabular-nums` (A8) |
| Code | JetBrains Mono 400 | Ligatures **off**; clear 0/O and 1/l/I. **Code only** (A8): code blocks, inline code, and data-frame diff cell values |
| Canvas labels | Atkinson Hyperlegible 400 / 700 | Always horizontal, with a background halo |
| Dyslexia option | Lexend or OpenDyslexic | User toggle, applies to body and UI |

- Type scale: 12 caption · 14 UI small · 16 body · 18 h3 · 22 h2 · 28 h1 · 36 display.
- Body line-height 1.6; letter-spacing +0.01em.
- Left-aligned only; never justified. No italics for emphasis (use weight). Sentence case everywhere.

### 10.2 Colour tokens

| Token | Dark | Light |
| --- | --- | --- |
| `--bg` | `#0B1020` | `#F7F5EF` (warm off-white) |
| `--canvas` | `#070B18` | `#ECEEF6` |
| `--surface-1` | `#131B36` | `#FFFFFF` |
| `--surface-2` | `#1A2347` | `#F0EEE6` |
| `--border` | `#28325A` | `#DAD8CF` |
| `--border-strong` | `#3A4677` | `#C2BFB3` |
| `--text` | `#E6E9F5` (not pure white) | `#151A33` |
| `--text-muted` | `#9AA3C7` | `#565E80` |
| `--text-subtle` | `#6E7699` | `#7D8299` |
| `--accent` | `#8B9CFF` (starlight periwinkle) | `#4E5BD6` |
| `--accent-strong` | `#A9B6FF` | `#3C48B8` |
| `--on-accent` | `#0B1020` | `#FFFFFF` |
| `--code-bg` | `#0E1530` | `#EFEDE5` |

### 10.3 Severity and status (reserved; never used as stage colours)

Severity always appears as a **filled callout or chip with icon and label**. Stage colours only ever appear as dots, outlines and badges, never as filled callouts.

| Status | Icon | Dark text / bg | Light text / bg |
| --- | --- | --- | --- |
| Block | `ti-circle-x` | `#F09595` / `#3A1414` | `#A32D2D` / `#FCEBEB` |
| Warn | `ti-alert-triangle` | `#FAC775` / `#3A2A0A` | `#854F0B` / `#FAEEDA` |
| Tip | `ti-bulb` | `#85B7EB` / `#0C2340` | `#185FA5` / `#E6F1FB` |
| Valid | `ti-circle-check` | `#97C459` / `#17300A` | `#3B6D11` / `#EAF3DE` |

### 10.4 Stage colours and icons

Every stage has a colour **and** an icon (never colour alone).

| Stage | Dark | Light | Icon |
| --- | --- | --- | --- |
| Explore | `#A99CFF` | `#5B4FC4` | `ti-telescope` |
| Clean | `#5DCAA5` | `#0F6E56` | `ti-eraser` |
| Transform | `#F29BD0` | `#A3367A` | `ti-transform` |
| Select | `#B5D96B` | `#4E7A16` | `ti-filter` |
| Split | `#6CCFE6` | `#0E6E80` | `ti-arrows-split-2` |
| Model | `#F2B880` | `#9A5A1E` | `ti-cube` |
| Tune | `#C9A0F2` | `#7A4FB0` | `ti-adjustments` |
| Evaluate | `#F2E27A` | `#7A6A0E` | `ti-ruler-measure` |
| Interpret | `#9FB2C9` | `#4A5A70` | `ti-eye` |

Claude Code: verify all text/background pairs meet WCAG AA (4.5:1 for text) and adjust within the hue if needed.

### 10.5 Relationship line styles

Each type gets a distinct dash pattern (primary cue) and colour (secondary cue), plus a legend with icons.

| Type | Line | Colour |
| --- | --- | --- |
| Needs | Solid 2px | `--accent` |
| Recommended | Dashed (6 4) | Clean teal |
| Clashes | Dotted (2 4) with a small ban marker | `--text-muted` |
| Alternative to | Long dash (10 4) | Interpret slate |
| Pairs with | Solid 1px double | Tune lavender |

### 10.6 Shape, spacing, elevation

- Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48.
- Radius: 6px controls, 12px cards, full pill for chips.
- Borders 1px. No drop shadows in panels.
- Observatory flourish, canvases only: focused node gets a soft glow (`0 0 12px` accent at 40%); static sparse star field on `--canvas` (deterministic, ~1–2% opacity dots, never twinkling).

### 10.7 Motion

| Use | Duration | Notes |
| --- | --- | --- |
| Hover / press | 120ms | |
| Panel open, accordion | 240ms | |
| Camera flights, zoom-to-fit | 600–900ms | |
| Cutscenes | ≤ 1.2s | Play once, replay button |

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- No looping animation anywhere except loading indicators.
- `prefers-reduced-motion`: jumps instead of flights; static end frames instead of cutscenes.

### 10.8 Data-frame diff style

- Monospaced cell values (JetBrains Mono).
- Changed cells: accent-tinted background plus a 2px accent left bar.
- Added columns: Valid-tinted header with a `+` icon.
- Removed columns: muted, struck through, with a `−` icon.
- Shape shown above the table: `1,460 × 81 → 1,460 × 262`, in Atkinson with tabular figures (A8).

### 10.9 Code blocks

- JetBrains Mono 13px, line-height 1.6, ligatures off.
- Long lines soft-wrap by default, with a hanging indent and a continuation marker; the copy button copies the original, unwrapped text. The validator warns on snippet lines over 79 characters.
- First line: version stamp comment (e.g. `# xgboost 3.x`).
- Copy button top right.
- Syntax colours from tokens: keywords `--accent`, strings Clean teal, numbers Transform pink, comments `--text-muted`.

### 10.10 Components

shadcn/ui on Radix, restyled with these tokens (keyboard navigation and screen-reader semantics come built in). Icons: Tabler, outline only.

### 10.11 Future modes (not v1)

- **Editorial**: Fraunces headings, Atkinson body, single burnt-orange accent (`#C2410C` light / `#F0997B` dark), warm white; near-monochrome stage colours.
- **Field notebook**: Lexend throughout, paper tones (`#F4EEDF` light / `#1E1B16` dark), ink-green accent, dashed rules.
- **Gallery with a planetarium**: Editorial panels with always-dark Observatory canvases.
- **Terminal**: ruled out (monospace headings and neon on black are poor for dyslexic reading).

Build tokens so a mode is a token set swap, not a redesign.

---

## 11. Accessibility

- Icons alongside colour, never colour alone.
- Plain English titles, code names underneath.
- Tags over sentences; short chunks; generous spacing; left-aligned.
- Visual diffs instead of describing changes in words.
- Settings: font choice (incl. dyslexia-friendly), text size (90–130%), line spacing (1.5–2.0).
- Full keyboard navigation of all views; screen-reader labels on canvas nodes.
- Reduced motion respected everywhere.

---

## 12. Tech stack and hosting

- **App**: static React web app, installable as a PWA (works offline after first load).
- **Backend**: none in v1. All content ships as data files inside the app; opening a page reads a local file, not an API. A backend is only needed later for cross-device sync, accounts, or live AI calls.
- **Hosting**: free static host auto-deploying from GitHub (Cloudflare Pages, Netlify or GitHub Pages).
- **Libraries**: D3 (radial tree and route map), force-graph (constellation), shadcn/ui + Radix (components), Remotion or GSAP (cutscenes), Fuse.js or MiniSearch (search), a notebook renderer for the output page, `.ipynb` generation from templates.
- **Library versions**: pin one version per library for v1 (latest stable at build step 1) and stamp it on every snippet.

---

## 13. Build order

1. **Inventory and source extraction (first, before any UI).** List every item in the Wave 1 catalogue. For each, open its official documentation page and extract: signature, every parameter with default and allowed values, attributes, methods, and the documented library version. Record the source URL per item. Never write pages from memory.
2. **Content schema.** Define the form per archetype from the 12 slots and relationship fields.
3. **First shippable slice: Model › Boosting end to end** (GradientBoosting, HistGradientBoosting, XGBoost, LightGBM): schema filled, radial tree, one cutscene, relationship lines, a short journey, notebook output. This tests every system early.
4. **Fill content by stage** using an orchestrator session that dispatches parallel agents to draft pages from step 1's extraction. Pages carry a `reviewed` flag; I review in batches, one stage at a time.
5. Remaining views (constellation filters, full journey), search, validation rules, accessibility settings.

---

## 14. Deferred and open

- **v2**: compare view for sibling models; return-use features (onboarding, personal notes, saved pipelines); Clean-stage pandas/datetime recipes; alternative visual modes.
- **Later waves**: unsupervised, causal (DoubleML), deep learning, Prophet, Meridian.
- **Open**: app name; deep learning framework (PyTorch or Keras) when that wave starts.

---

## Changelog

Amendments from design review round 1 (`docs/BRIEF_DESIGN_REVIEW_1.md`), applied 2026-10-24.

| Id | Date | Amendment | Sections |
| --- | --- | --- | --- |
| A1 | 2026-10-24 | The goal question "What are we trying to do?" replaces the track selector; each goal sets track and task. | §3.2, §7.4 |
| A2 | 2026-10-24 | Hierarchy `Goal › Stage › Group › Family › Page`; at most 7 children, no single-child levels; families by job; placement from `content/taxonomy.yaml` (from `docs/QUESTION_MAP.md`); fixed stage positions; per-goal stored layouts. | §3.3, §5.2, §5.3 |
| A3 | 2026-10-24 | Questions mode is a `Names | Questions` label toggle on the same tree; symptom questions gain the `we_need_but` stem and become full sentences. | §3.4, §3.5, §7.4 |
| A4 | 2026-10-24 | New slot 7 "What comes out"; the template goes from 11 to 12 slots. | §4, §5.1, §5.2, §13 |
| A5 | 2026-10-24 | Radial tree children fan out from their parent, attached; other stages keep dimmed labels; zoom to fit the opened path. | §7.1 |
| A6 | 2026-10-24 | A flat route map replaces the globe journey. | §7.3, §12 |
| A7 | 2026-10-24 | Builder starts empty with "Try a sample route"; "Add to route" everywhere; one-tap fixes; "Get notebook" never disabled. | §8 |
| A8 | 2026-10-24 | JetBrains Mono for code only; numbers in text use Atkinson with tabular figures. Code soft-wraps. | §10.1, §10.8, §10.9 |
| A9 | 2026-10-24 | Hide a stage badge that repeats the archetype badge; keep a stage-colour dot. | §5.1 |
| A10 | 2026-10-24 | Key settings tiers "Most used / Also useful / Rarely changed"; effective defaults shown large. | §5.1 |
| A11 | 2026-10-29 | The globe journey returns as the Build view and replaces the flat route map (reverses A6). Two entry flows, three-colour compatibility, proposals with pros and cons, a journey side panel, and a notebook built on one shared variable vocabulary. | §7.3, §8, §12 |

Also decided 2026-10-24: the classification toy dataset is breast cancer (§9).
