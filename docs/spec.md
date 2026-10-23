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

### 3.3 Hierarchy

`Track › Stage › Family › Item`

- **Family** = siblings that do the same job (e.g. Boosting: GradientBoosting, HistGradientBoosting, XGBoost, LightGBM).
- **Same model, different library** (e.g. Linear regression in scikit-learn vs statsmodels `OLS` vs SciPy `linregress`) = **one page** with library tabs in the Code slot, each tab with a one-line "why this library" (statsmodels: p-values; scikit-learn: pipelines).

### 3.4 Two doors into the same content

- **By category** (default): stage › family › item, families collapsed by default.
- **By question** (toggle): fixed stems only:
  - "My data is…" (imbalanced, time-ordered, high-dimensional, messy, small…)
  - "My model is…" (overfitting, too slow, underperforming, not reproducible…)
  - "I want to know…" (which features matter, how confident it is, how good it is without a test set…)
  - Cap at about 5–7 questions per stem per stage.
  - Questions use my wording ("overfitting"), not textbook terms ("high variance").
- **Chaining**: each answered question suggests the next one (e.g. "overfitting" → "how good is it now?").
- Questions can return settings, outputs and methods together (e.g. "My model is overfitting" → `max_depth`, `min_samples_leaf`, `ccp_alpha`, `max_features`).

### 3.5 Search

Global search above all views. Matches plain names, code names, aliases and questions. Results show stage and track; selecting one flies the current view to it. Client-side fuzzy search (e.g. Fuse.js or MiniSearch).

### 3.6 Semantic zoom

The map changes *what* it shows as you go deeper, not just its size. Level 1 shows stages only; opening a stage shows its families; opening a family shows its items. Never all items at once.

---

## 4. Page archetypes

Every item page uses the **same 11-slot template** (section 5). The archetype decides what the hero visual and toy example look like.

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

### 5.1 The 11 slots (fixed order, on every page)

Slots never move. An empty slot shows "None" rather than disappearing.

1. **Header**: archetype icon, plain English name ("Tree depth limit"), code name underneath (`max_depth`), archetype badge.
2. **Solves**: hero visual (cutscene) plus one line.
3. **Quick facts**: default value and typical range (models: task type, data-size sweet spot).
4. **Use when / Avoid when**: tags, not sentences.
5. **Before you use it**: prep checklist; every relevant step marked **Required**, **Recommended** or **Not needed**. "Not needed" matters as much as "Required" (e.g. no scaling before trees). Each item links to that step's page.
6. **Code**: tabbed by library. Every snippet includes its imports, a library version stamp comment, and must run when pasted into a real notebook.
7. **Catch-outs**: warning callout, placed right after the code (that's where mistakes happen).
8. **Key settings**: hyperparameters worth tuning, in tiers (Tier 1 visible, Tier 2 one tap, Tier 3 collapsed), each linking to its own page.
9. **Watch it work**: toy example with a slider, driven by the shared toy datasets.
10. **Intuition / How it works**: collapsed. On Model pages this expands into:
    - The one idea (one sentence)
    - Everyday analogy
    - Animation
    - Good at / Bad at (tags)
    - Vs. siblings (short; compare view is v2)
    - *Read more*: step-by-step walkthrough of the algorithm
11. **Next**: chained follow-up questions.

### 5.2 Schema requirements

- One record per item; archetype-specific variants of the same 11 fields.
- Fields for: plain name, code name, aliases, stage, family, track(s), archetype, question tags, relationships (5.3), source URL(s), library version, `reviewed` flag.
- Relationship lines and validation rules are **derived from schema fields**, never hand-written separately.

### 5.3 Relationship types

| Type | Meaning | Source field |
| --- | --- | --- |
| Needs | Required prep | Prep checklist: Required |
| Recommended | Works better with | Prep checklist: Recommended |
| Clashes | Not needed or harmful together | Prep checklist: Not needed, plus explicit clashes |
| Alternative to | Siblings that do the same job | Family membership |
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

One content tree, three views, each for one job. All read the same data. **Positions are computed once and stored with the content**, never re-simulated on load, so nothing rearranges between sessions (spatial memory).

### 7.1 Radial tree — Lookup ("what exists and where it lives")

- Centre = current track; stages around it; families and items bloom outward.
- **Labels always horizontal** (never rotated with the branch).
- **Accordion**: opening a branch closes its siblings, so only one path is ever expanded.
- **Zoom to fit** the opened branch so nothing runs off-screen.
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

### 7.3 Globe journey — Build ("the pipeline I'm assembling")

- **Passport**: the data profile, shown at the start of the route (task type, track, has categoricals, has missing values, time-ordered, imbalanced, starting shape).
- **Regions and stops**: stages are regions; picked steps are stops within them. Stop labels appear only when a region is zoomed into.
- **Legs**: short low hops within a stage, long arcs between stages. Valid legs green; legs touching a warning amber; blocked legs red.
- **Fly-overs**: skipped stages stay visible and labelled "(skipped)".
- **Ticket per stop**: stage and stop number, status, why, what it uses (code), **data shape after the step** (e.g. 1,460 × 81 → 1,460 × 262 after one-hot), and a one-tap fix for warnings.
- **Itinerary**: the same route as a grouped, collapsible list by stage with a status per stage. This is where steps are edited, reordered and removed (editing on the sphere itself is clumsy).
- **Play journey**: plays once, no loop, respects reduced motion.
- **Arrival**: the notebook view.
- Library: globe.gl (Three.js).

### 7.4 Desktop layout

- Top bar: search (Ctrl/Cmd+K), track selector, view switcher (Tree / Constellation / Journey), mode toggle (light/dark/system), accessibility settings.
- Main: canvas left (~60%), panel right (~40%, min 420px, max 560px), independent scrolling.
- Below 900px width: canvas full screen, panel as a bottom sheet.
- Max reading width in panels: 68 characters.

---

## 8. Pipeline builder

- **Scope v1**: one model per pipeline.
- **Flow**:
  1. Data profile (3–4 taps) → becomes the Passport.
  2. Pick per stage, from the radial tree or "Add to pipeline" on any page.
  3. Live validation as you pick, not at the end.
  4. Generate → notebook view.
- **Optional stages** (e.g. Select) can be skipped; shown as fly-overs, never as missing.
- **Override**: Warn and Tip can be dismissed; Block can be overridden with a one-line acknowledgement.
- **Why did this fire**: every validation message links to the page that explains it.

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
  - Classification: Titanic or breast cancer
  - Time series: airline passengers
- **Motion rules**: plays once on open (≤ ~1.2s), no loops, replay button, respects `prefers-reduced-motion` (replace with a static end frame or a ≤120ms fade).

---

## 10. Visual design system: Observatory

**Vibe**: a quiet observatory at night. The canvases are the night sky: deep, still, with coloured stars and glowing paths. The panels are the observer's notebook: calm, readable, precise. Drama lives in the canvases and cutscenes; the panels stay quiet. Theme follows the system setting; both light and dark are first-class.

### 10.1 Typography

| Role | Font | Notes |
| --- | --- | --- |
| Headings (18px+ only) | Space Grotesk 500 | Distinctive, geometric; never below 18px |
| Body and UI | Atkinson Hyperlegible 400 / 700 | Designed for legibility; distinct letterforms |
| Code | JetBrains Mono 400 | Ligatures **off**; clear 0/O and 1/l/I |
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

- Monospaced values (JetBrains Mono).
- Changed cells: accent-tinted background plus a 2px accent left bar.
- Added columns: Valid-tinted header with a `+` icon.
- Removed columns: muted, struck through, with a `−` icon.
- Shape shown above the table: `1,460 × 81 → 1,460 × 262`.

### 10.9 Code blocks

- JetBrains Mono 13px, line-height 1.6, ligatures off.
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
- **Libraries**: D3 (radial tree), force-graph (constellation), globe.gl (journey), shadcn/ui + Radix (components), Remotion or GSAP (cutscenes), Fuse.js or MiniSearch (search), a notebook renderer for the output page, `.ipynb` generation from templates.
- **Library versions**: pin one version per library for v1 (latest stable at build step 1) and stamp it on every snippet.

---

## 13. Build order

1. **Inventory and source extraction (first, before any UI).** List every item in the Wave 1 catalogue. For each, open its official documentation page and extract: signature, every parameter with default and allowed values, attributes, methods, and the documented library version. Record the source URL per item. Never write pages from memory.
2. **Content schema.** Define the form per archetype from the 11 slots and relationship fields.
3. **First shippable slice: Model › Boosting end to end** (GradientBoosting, HistGradientBoosting, XGBoost, LightGBM): schema filled, radial tree, one cutscene, relationship lines, a short journey, notebook output. This tests every system early.
4. **Fill content by stage** using an orchestrator session that dispatches parallel agents to draft pages from step 1's extraction. Pages carry a `reviewed` flag; I review in batches, one stage at a time.
5. Remaining views (constellation filters, full journey), search, validation rules, accessibility settings.

---

## 14. Deferred and open

- **v2**: compare view for sibling models; return-use features (onboarding, personal notes, saved pipelines); Clean-stage pandas/datetime recipes; alternative visual modes.
- **Later waves**: unsupervised, causal (DoubleML), deep learning, Prophet, Meridian.
- **Open**: app name; deep learning framework (PyTorch or Keras) when that wave starts.
