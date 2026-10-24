# Builder brief: design review round 1

**For:** the orchestrator session (coordinator workflow, see `CLAUDE.md`).
**From:** the product owner, after reviewing the E01–E04 live demo and a follow-up design session.
**Read first:** this brief, then `docs/QUESTION_MAP.md` (new, place it in `docs/`), then `docs/spec.md`.

These are product decisions, not proposals. They amend the spec. Do not re-debate them. Where this brief is silent or ambiguous on something that materially affects the build, stop and ask, as `CLAUDE.md` says.

---

## 0. What to do, in order

1. **Apply the spec amendments** in section 1 to `docs/spec.md`. Add a "Changelog" section at the end of the spec listing each amendment (A1–A10) with today's date. The spec stays the single source of truth.
2. **Update `docs/OPEN_QUESTIONS.md`**: remove the items this brief settles (section 7) and keep the rest.
3. **Update `state/backlog.json`**: add E11 and E12, rewrite E08, adjust E05, E06 and E09, and set the order (section 5).
4. **Run the architect skill** to write task packets for E12 first, then E11. Don't start E05 content fill until E11's taxonomy and validator are merged.
5. After each epic, deploy and tell me what to look at (section 6 lists the checks I will make).

---

## 1. Spec amendments

### A1 · The goal question replaces the track selector (§3.2, §7.4)

The top-bar track selector becomes the first question: **"What are we trying to do?"** Each goal sets a track **and** a task, and filters the whole app.

| Goal | Track | Task |
| --- | --- | --- |
| Predict a number | standard | regression |
| Sort things into categories | standard | classification |
| Forecast what comes next | time-series | regression |

Later-wave goals are listed in `docs/QUESTION_MAP.md` §4. Don't build them. The Passport's task type and the goal stay in sync: changing one changes the other. In Names mode the selector shows "Standard · Regression" and so on.

### A2 · Hierarchy and placement (§3.3)

- Hierarchy: `Goal › Stage › Group › Family › Page`. Groups exist only where a stage would otherwise have more than 7 families.
- **At most 7 children per node, in every goal view. No single-child levels** (skip the level and show its children).
- **Families group by job, never by library.** "Boosting (XGBoost)", "Boosting (LightGBM)" and "Boosting (scikit-learn)" become one family.
- Every page, including content-only pages, sits in **exactly one family**.
- **Placement and labels come from `docs/QUESTION_MAP.md`.** Convert it to a machine-readable `content/taxonomy.yaml` (goals, stages, groups, families, page placements, labels, `pick_when`, task/track tags). The taxonomy becomes the source of truth for placement. The inventory's `family` field stays as provenance only.
- The nine stages keep the same ring position in every goal view. A stage that is empty for a goal stays in place, dimmed, labelled "Not used for this goal".
- Positions are precomputed **per goal view** and stored (spec §7 rule still holds: nothing re-lays-out on load).

### A3 · Questions mode: same tree, second set of labels (§3.4)

The two-doors idea becomes a **label toggle on the same radial tree**: `Names | Questions`, where `Tree | List` sits now.

- Same nodes, positions, icons, colours and branching. **Only text changes.** Toggling never moves anything.
- Default: **Questions**. The choice is remembered per viewer (localStorage, wrapped in try/catch, the app must work without it).
- The centre shows the open node's `question_prompt` in Questions mode, and its name in Names mode.
- Nodes show `question_label`. Pages keep their real names, with `pick_when` underneath in Questions mode.
- In Questions mode the breadcrumb reads as a chain of `question_label`s.
- The accessible name for each node is its full `question_sentence`.
- Search matches Names labels, Questions labels, sentences, `pick_when`, aliases and code names.
- The symptom questions (stems `my_data_is`, `my_model_is`, `i_want_to_know`) stay. Add a fourth stem, **`we_need_but`** ("We need…, but…"). None of these are tree nodes; they show through search and as relationship lines to their answers. Seed data: `docs/QUESTION_MAP.md` §7. Rewrite existing question texts as full sentences in the same voice (e.g. `model-overfitting` → "Our model is great on training data, but poor on new data").
- Writing rules and length limits: `docs/QUESTION_MAP.md` §2. Enforce the limits in the validator.

### A4 · New slot: "What comes out" (§5.1)

The template goes from 11 to **12 slots**. Insert **What comes out** right after Code, before Catch-outs:

1. Header · 2. Solves · 3. Quick facts · 4. Use when / Avoid when · 5. Before you use it · 6. Code · **7. What comes out** · 8. Catch-outs · 9. Key settings · 10. Watch it work · 11. Intuition · 12. Next

The slot answers: *what do I get back, what shape is it, and what do I use next?* Contents by archetype:

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

The slot always renders. An empty one shows "None", like every other slot. It gets a small visual in the same style as Watch it work:
- **Classification models:** the `predict_proba` table on toy rows, with the class-1 column highlighted as `y_score` and a threshold slider that flips the labels.
- **Regression models:** `y_pred` on toy rows, with an "undo log target" toggle.

Every code line here follows the existing snippet rules (imports, version stamp, runs when pasted). Verify each claim against the E01 extraction.

### A5 · Radial tree layout (§7.1)

- An opened stage's families **fan outward from that stage**, attached by visible links, around the stage's own angle. Never a detached column, and never a comb drawn off to one side of the canvas.
- Other stages **keep their labels**, dimmed (not hidden). Resolve collisions in the layout, not by hiding labels.
- Zoom to fit the opened path. The accordion rule stays: one path open at a time.
- This applies at every level (stage → group → family → pages).

### A6 · Route map replaces the globe journey (§7.3)

The globe is removed. Build mode becomes a **flat route map**. Full spec: section 3 of this brief. Remove `globe.gl` and `three` from the bundle once the route map passes review.

### A7 · Pipeline builder defaults (§8)

- The default state is an **empty route** with an editable Passport. A "Try a sample route" button loads the demo route.
- "Add to route" appears on every page panel and on every page node in Questions mode.
- Every validation message carries a one-tap fix where one exists, and links to the page that explains it (existing rule).
- "Get notebook" is never disabled. If there are blockers, pressing it lists them with their fixes.

### A8 · Typography: code font for code only (§10.1, §10.9)

JetBrains Mono is for code only: code blocks, inline code, and data-frame diff cell values. Tables, shapes, defaults and numbers in text use Atkinson Hyperlegible with `font-variant-numeric: tabular-nums`. (Today "100 to 1000" and "1,460 × 81" render in Mono, so zeros show slashed.)

### A9 · Badges (§5.1 Header)

Hide the stage badge when its label repeats the archetype badge (e.g. Model + Model). Keep the stage colour as a dot on the archetype badge in that case.

### A10 · Key settings wording (§5.1 slot 9)

- Tier labels: **Most used**, **Also useful**, **Rarely changed** (today: "Tier 1", "More settings", "Tier 3 settings").
- Defaults: show the **effective** value large ("100"). Show "set as None in the signature" in small text only when the signature default differs.

---

## 2. Review fixes (found on the live site)

Each fix needs a test and a before/after screenshot in the task's run log.

| # | Problem | Fix | Where |
| --- | --- | --- | --- |
| F1 | Opening Tune › Boosting rounds draws the branch far left, detached, with no link to Tune; other stages lose their labels | A5 | E11 |
| F2 | Model shows 29 families as a vertical comb | A2 + `docs/QUESTION_MAP.md` | E11 |
| F3 | Hyperparameter pages (`n-estimators`) show dashed placeholders for Solves and Watch it work; XGBoost's Watch it work is a placeholder too | Build the **hyperparameter archetype** hero (behaviour sweep plus under/overfit curve) and the slider-driven Watch it work, first for `n-estimators`, `max-depth`, `learning-rate`, `early-stopping`; then the boosting models' Watch it work. Pulled forward from E09. | E12 |
| F4 | Long code lines are clipped at the right edge | Soft-wrap by default with a hanging indent and a continuation marker; the copy button copies the original, unwrapped text. Validator warns on snippet lines over 79 characters. | E12 |
| F5 | Numbers in tables render in the code font | A8 | E12 |
| F6 | Two "Model" badges side by side | A9 | E12 |
| F7 | Defaults read "None → 100, effective default" | A10 | E12 |
| F8 | Inconsistent tier labels | A10 | E12 |
| F9 | The phone bottom sheet is titled "Page panel" | Use the page's plain name as the sheet title and accessible name | E12 |
| F10 | `n-estimators` shows "Before you use it: None" and no connections, although it clearly pairs with `learning-rate` and `early-stopping` | Fill `pairs_with` and prep on hyperparameter records (e.g. early stopping **requires** a validation set). Show "Used by" (from `applies_to`) in Show connections. | E12 |

---

## 3. Route map (replaces §7.3)

**Job:** show the pipeline I'm building, answer four questions at a glance, and let me edit it.

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
- "Try a sample route" (A7).
- **Get notebook (N cells)** at the bottom (A7). It opens the existing notebook view.

**Behaviour examples (the demo must reproduce these)**

- Sample route with XGBoost plus Standard scaling → Transform shows a Warning: "Scaling is not needed before trees", with a "Remove scaling" fix.
- Swap XGBoost for Ridge → that warning disappears. A Tip appears ("Ridge works best on scaled features"), plus Interpret flags `feature-importances` ("Ridge has coefficients, not importances").
- Remove the encoder while the Passport says "has categories" → Blocked, unless the model handles categories natively (then a Tip).
- Choose Early stopping with Random forest → Blocked: "Early stopping needs a boosting model", with a fix.

Rules come from schema data (spec §8). Add whatever schema fields these behaviours need, and record them in `docs/CONTENT_SCHEMA.md`.

**Done when:** the route map is the Journey view, the globe is gone from the UI and the bundle, keyboard navigation works across stages and chips, and the four behaviour examples pass as tests.

---

## 4. Taxonomy and Questions mode: implementation notes

- **`content/taxonomy.yaml`** is generated once from `docs/QUESTION_MAP.md`, then maintained directly. The markdown stays as the human-readable reference. Keep them in sync with a test that diffs the page placements.
- **Validator** (extend the existing Python schema validation): every inventory page and content-only page appears exactly once; at most 7 children per node in each goal view; no single-child levels; label length limits; `For` tags consistent with item records' `rules.task_types` and `tracks`; every `we_need_but` answer resolves to a page (and setting, if named).
- **Migration:** item records' `family` becomes a taxonomy family id. `prep` steps that reference `{family, stage}` migrate to family ids (e.g. `Scaling` → `transform.scale.rescale`, `Categorical encoding` → `transform.encode.features`). Regenerate `content/derived/relationships.json`. "Alternative to" now links all four boosting libraries, as intended.
- **Verification of wording:** the `pick_when` lines and §7 answers were written by the designer, not taken from the docs. Agents check each against the E01 extraction and the official docs. Disagreements go to `docs/OPEN_QUESTIONS.md` with the source. Don't rewrite them silently.
- **Layout script** (`app/scripts/layout-radial.mjs`): precompute per goal view, honour A5, store in `content/derived/`.

---

## 5. Backlog changes

| Epic | Change |
| --- | --- |
| **E12 (new): Review fixes and the "What comes out" slot** | F3–F10, A4 (schema, renderer, content for the 4 boosting pages and 4 hyperparameter pages), A8–A10. Small and visible; do it first. |
| **E11 (new): Taxonomy and Questions mode** | A1, A2, A3, A5, F1, F2: taxonomy file, validator, migration, per-goal layouts, the tree fan fix, the Names/Questions toggle, the goal selector, search on both label sets, the `we_need_but` stem. Blocks E05 and E06. |
| **E08 (rewritten): Pipeline builder and route map** | A6, A7 and section 3. Remove the globe journey. Depends on E11 (alternatives come from taxonomy families). |
| **E05: Content fill by stage** | Now depends on E11 and E12. Drafted pages use taxonomy placement, include the What comes out slot, and are batched by stage for my review. |
| **E06: Lookup** | The question-door work moves to E11. E06 keeps relationship lines on demand (now including `we_need_but` questions), semantic zoom and search polish. |
| **E09: Cutscenes and toy data** | The hyperparameter archetype moves to E12 (F3). The rest is unchanged. |
| E07, E10 | Unchanged. The constellation stays "Coming soon". |

**Order:** E12 → E11 → E08 → E05 (by stage, with my review between stages) → E06, E09, E07, E10.

---

## 6. How I will review the next demo

- Model, on every goal: no more than 7 options anywhere; opening a branch keeps it attached and fanned; the other stages keep their labels.
- Flip Names ↔ Questions on any node: nothing moves; the centre asks a question; breadcrumbs read as a chain.
- The goal selector: switching from "Predict a number" to "Sort things into categories" swaps in classification families (e.g. Resampling appears in Transform) and the stages stay put.
- `n-estimators`: a real hero animation and a working slider; connections to learning rate and early stopping.
- XGBoost: one Model badge; readable defaults; code wraps instead of being clipped; numbers not in Mono; the What comes out slot with a working threshold slider.
- Journey: the route map from an empty start, the four behaviour examples, and Get notebook.
- Phone (near-square, unfolded): sheet titled with the page name; route map runs vertically.

---

## 7. Open questions

**Settled by this brief (remove from `docs/OPEN_QUESTIONS.md`):**

- #14 Radial tree shape → a true fan, attached to its parent (A5).
- #15 Stage labels while another stage is open → kept, dimmed (A5).
- #17 Two Model badges → hide the repeat (A9).
- #18 Globe label collisions → the globe is removed (A6).

**Still open (ask me; don't decide):**

- #9 Classification toy dataset: Titanic or breast cancer. Needed before the classification What comes out visual and its cutscenes.
- #16 Star field opacity.
- Any `pick_when` line or `we_need_but` answer that the docs contradict.

---

## 8. Don'ts

- Don't build the constellation, later-wave goals, or v2 items.
- Don't move, rename or reword taxonomy nodes beyond `docs/QUESTION_MAP.md` without asking. Factual corrections go through `docs/OPEN_QUESTIONS.md`.
- Don't use yes/no phrasing for question labels (e.g. not "Ask yes/no questions" for trees).
- Agents never set `reviewed: true`.
- Don't delete the globe code until the route map passes my review. Then remove it fully, including the dependencies.
