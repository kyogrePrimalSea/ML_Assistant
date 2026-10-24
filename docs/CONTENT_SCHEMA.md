# Content schema

Source: spec §3, §4, §5, §7.3, §8, §9. Files: `content/schema/vocab.yaml` (shared lists),
`content/schema/item.schema.json` (one page, `content/items/<stage>/<page>.yaml`),
`content/schema/question.schema.json` (`content/questions/<stage>.yaml`). Enums in the
schemas equal the vocab lists (`tests/test_schema.py` checks this). JSON Schema cannot
enforce key order or cross-file references; those checks belong to the content validator (T012).

## Record shape

```
id, plain_name, code_name, aliases, stage, family, tracks, archetype, question_tags,
targets, [applies_to], pairs_with, clashes, source_urls, library_versions, reviewed,
rules: {task_types, blocked_when, fits_on_data, shape_effect}
slots: header, solves, quick_facts, use_avoid, prep, code, what_comes_out, catch_outs,
       key_settings, watch_it_work, intuition, next          # fixed order, all required (12)
```

Every key is required (except `applies_to`); nothing is omitted, only empty.

## Metadata

| Field | Meaning |
| --- | --- |
| `id` | Kebab-case page id; equals the inventory `page`. |
| `plain_name`, `code_name`, `aliases` | Display name, code name, search aliases. |
| `stage`, `family`, `tracks`, `archetype` | Placement. Must match the inventory entries of `targets`. Stage, track, archetype ids come from `vocab.yaml`. |
| `question_tags` | Short user-wording tags (for example "overfitting") used by search (spec §3.5). Questions link to pages through their own `answers`, not through this field. |
| `targets` | Inventory ids (`sklearn.linear_model.Ridge`) documented on this page. Empty only for `hyperparameter` and `output`. |
| `applies_to` | Page ids the hyperparameter or output belongs to. Required for those two archetypes, forbidden for the rest. |
| `pairs_with`, `clashes` | Explicit page ids (see relationships). |
| `source_urls`, `library_versions` | Official docs URLs; library slug to pinned version. |
| `reviewed` | The user sets `true`. Agents always write `false`. |

## Empty slots

Object slots (`solves`, `quick_facts`, `what_comes_out`, `watch_it_work`, `intuition`) are `{none: true}` when empty.
List slots (`prep`, `code`, `catch_outs`, `next`) are `[]`. `use_avoid` and `key_settings` always
carry their keys with empty lists. `header` is always `{}`: icon, names and badge are all derived
from metadata, so it holds no data.

## Slots

1. **header**: `{}`. Rendered from `archetype` (icon, badge), `plain_name`, `code_name`.
2. **solves**: `{hero, line}`. `hero.kind` must equal the page archetype. Hero fields by archetype
   (spec §4): transformer `dataset, columns, changed`; resampler `dataset, classes, before, after`
   (counts); selector `dataset, columns, kept`; splitter `rows, folds, ordered`; model
   `dataset, shape (boundary|fit_line)`; hyperparameter `dataset, sweep` (3+ values);
   tuning `dims, trials`; metric `dataset, highlight`; diagnostic `dataset, chart`;
   output `dataset, plot (bar|line|matrix)`; composer `boxes`. `dataset` is a vocab toy dataset.
3. **quick_facts**: model `{data_size}` (task types come from `rules.task_types`, not repeated);
   hyperparameter `{values: [{page, default, typical_range}]}`, one entry per `applies_to` page since
   defaults differ; all other archetypes `{facts: [{label, value}]}` (at most 4) or none.
4. **use_avoid**: `{use_when, avoid_when}`, lists of tags (at most 5 words each).
5. **prep**: entries `{step, status, why, condition, unless}`. `step` is `{page}` or
   `{family, stage}`. `status` is `required|recommended|not_needed`. `why` is at most 12 words
   (pattern-checked). `condition` is a data-profile condition or `null`. `unless` is
   `{setting, value}` or `null`.
6. **code**: tabs `{library, target, why_this_library, snippet}`. The first snippet line must be
   `# <library> <version>` with the version from `library_versions[library]` (validator
   checks the exact value; the schema checks the form). `target` is an inventory id.
7. **what_comes_out** (spec §5.1 slot 7, A4): `{none: true}` or
   `{items, next_step, [snippet, snippet_library], visual}`.
   `items` (1 to 8, reading order): `{name, kind: method|attribute|return, task: classification|regression|null,
   shape (at most 40 characters), note (at most 16 words)}`. `next_step` is at most 16 words, or `null`.
   `snippet` follows the Code snippet rules (stamp line from `library_versions[snippet_library]`, runs when
   pasted); `snippet_library` is required with it. `visual` is `proba_table | regression_preds | both | null`
   and must fit `rules.task_types` (`proba_table` needs classification, `regression_preds` regression,
   `both` both). The validator checks that every `method` or `attribute` name exists in the extraction
   record of a target (for hyperparameter pages, of an `applies_to` page's targets); `return` entries are
   free text. The visual reads `content/cutscenes/outputs/<page>.json` (see `docs/ARCHITECTURE.md`).
8. **catch_outs**: list of one-line warnings.
9. **key_settings**: `tier1|tier2|tier3`, each a list of `{name, page|null}`.
10. **watch_it_work**: `{dataset, control: {name, min, max, step, default}}`.
11. **intuition**: model `{idea, analogy, animation, good_at, bad_at, vs_siblings: [{page, note}], read_more}`;
    other archetypes `{text}`; or none.
12. **next**: question ids.

## Data-profile condition

One object type used by `prep.condition` and `rules.blocked_when[].when`. Keys are the passport
fields (`task_type`, `track`: lists matching any member; `has_categoricals`, `has_missing`,
`time_ordered`, `imbalanced`: booleans). All keys must match (AND). For OR, add another entry.

## Rules block (spec §8 inputs)

- `task_types`: supported task types; `[]` means task-agnostic.
- `blocked_when`: `[{when: condition, reason (<= 12 words)}]`.
- `fits_on_data`: true when the step learns from data (scalers, encoders, selectors, models).
- `shape_effect`: `{rows, columns}`, each `same|grows|shrinks|expands`, for journey tickets.

## Questions

`{id, stem, text, stage, tracks, answers, next}`. `text` is a full sentence in the stem's voice
(max 80 characters), for example "Our model is great on training data, but poor on new data".

`stem` is one of `my_data_is`, `my_model_is`, `i_want_to_know`, `we_need_but` ("We need…, but…",
seeded from `docs/QUESTION_MAP.md` §7). A `we_need_but` text starts "We need".

`answers` entries are `{page}`, `{page, setting}` or either with an optional `note`. `page` is an
inventory page id or a content record id. `setting` names a parameter with no page of its own: it
must be in that page's `key_settings` **or** be a parameter in the extraction of the page's
targets (`content/extraction/<library>/<id>.json`). `note` is a short catch-out (16 words or
fewer) copied verbatim from the map, for example "catch-out: correlated features share credit".
`next` holds question ids.

Validator rules: the file's `stage` equals each question's `stage`; at most 7 questions per stem
per stage, **counted per track** (a question with several tracks counts once in each), so a
stage's 7 standard-track `we_need_but` questions and its time-series forecast questions do not
share one cap; `we_need_but` texts start "We need"; notes are 16 words or fewer.

## Taxonomy

Page placement (`stage`, `family`) and the Names/Questions wording live in
`content/taxonomy.yaml`, not in item records. See "Taxonomy" in `docs/ARCHITECTURE.md`.

## Relationships (spec §5.3), all derived

| Type | Derived from |
| --- | --- |
| Needs | `prep` entries with `status: required` (family step: every page in that stage and family). |
| Recommended | `prep` entries with `status: recommended`. |
| Clashes | `prep` entries with `status: not_needed`, plus `clashes` page ids. |
| Alternative to | Pages with the same `stage` and `family`. No stored field. |
| Pairs with | `pairs_with`. |

## Validation rules (spec §8), all derived

| Rule | Severity | Derived from |
| --- | --- | --- |
| Missing requirement | Block | Pipeline contains page P; P's `prep` has a `required` entry whose `condition` matches the passport (or is null), whose `unless` setting is not set in the pick, and whose step (or any page in that family) is absent. |
| Wrong for the track | Block | A pick's `tracks` excludes the passport track, or any `rules.blocked_when[].when` matches the passport (random K-fold with `time_ordered`). The reason is the message. |
| Task mismatch | Block | A pick's non-empty `rules.task_types` does not include the passport `task_type` (R² for a classifier). |
| Leakage risk | Warn | A pick with `rules.fits_on_data: true` sits in a stage before `split` (stage order from `vocab.yaml`). Auto-fix: wrap in a Pipeline. |
| Redundant step | Warn | The model's `prep` has a `not_needed` entry for the step (or its family) that is also in the pipeline. |
| Missing recommendation | Tip | `prep` entry with `recommended` whose `condition` matches the passport and whose step is absent. |

Each message links to the page whose record produced it. Journey tickets read `shape_effect`.

## Worked example 1: XGBoost (spec §5.4)

Fixture: `tests/fixtures/schema/xgboost.yaml`. Highlights:

```yaml
id: xgboost
stage: model
family: Boosting (XGBoost)
archetype: model
targets: [xgboost.XGBRegressor, xgboost.XGBClassifier]
pairs_with: [treeexplainer]
rules: {task_types: [regression, classification], blocked_when: [], fits_on_data: true,
        shape_effect: {rows: same, columns: same}}
slots:
  prep:
    - {step: {family: Scaling, stage: transform}, status: not_needed, why: Trees split on order, not size., condition: null, unless: null}
    - {step: {family: Categorical encoding, stage: transform}, status: required, why: Text categories must become numbers.,
       condition: {has_categoricals: true}, unless: {setting: enable_categorical, value: true}}
  what_comes_out:        # shape example; the fixture itself holds {none: true} until T029
    items:
      - {name: predict_proba, kind: method, task: classification, shape: (n_samples, n_classes),
         note: One column per class, in classes_ order.}
      - {name: predict, kind: method, task: regression, shape: (n_samples,), note: One value per row.}
    next_step: Keep [:, 1] as y_score for ROC AUC.
    visual: both
  key_settings:
    tier1: [{name: n_estimators, page: null}, {name: learning_rate, page: null},
            {name: max_depth, page: max-depth}, {name: early_stopping_rounds, page: null}]
    tier2: [subsample, colsample_bytree, min_child_weight]   # each as {name, page}
    tier3: [reg_lambda, reg_alpha, gamma]
  intuition: {idea: Build small trees one after another, each fixing the mistakes of the last.,
              analogy: A team correcting an essay, ... }
```

All spec §5.4 content fits without extra fields.

## Worked example 2: `max_depth` (hyperparameter across models)

Fixture: `tests/fixtures/schema/max-depth.yaml`. `applies_to` lists five tree-model pages and
`quick_facts.values` gives each its own default (`None (unlimited)`, `3`, `6`, `-1 (unlimited)`).
Code tabs use one library each, each stamped from `library_versions`.

```yaml
archetype: hyperparameter
targets: []
applies_to: [decision-tree-regressor, random-forest, gradient-boosting, xgboost, lightgbm]
slots:
  quick_facts:
    values:
      - {page: gradient-boosting, default: "3", typical_range: 2 to 8}
      - {page: xgboost, default: "6", typical_range: 3 to 10}
```

Validator rule (T012): the `quick_facts.values[].page` set equals `applies_to`.

## One short example per archetype variant

Only the archetype-specific part:

```yaml
# transformer
solves: {hero: {kind: transformer, dataset: ames, columns: [LotArea, Street], changed: [LotArea]}, line: Puts numbers on one scale.}
# resampler
solves: {hero: {kind: resampler, dataset: breast-cancer, classes: [malignant, benign], before: [212, 357], after: [357, 357]}, line: Balances the classes.}
# selector
solves: {hero: {kind: selector, dataset: ames, columns: [A, B, C], kept: [A, C]}, line: Keeps the strongest columns.}
# splitter
solves: {hero: {kind: splitter, rows: 20, folds: 5, ordered: false}, line: Holds rows out for testing.}
# model
solves: {hero: {kind: model, dataset: ames, shape: fit_line}, line: ...}
quick_facts: {data_size: 1k to 10M rows}
# hyperparameter
solves: {hero: {kind: hyperparameter, dataset: ames, sweep: [2, 4, 8]}, line: ...}
quick_facts: {values: [{page: xgboost, default: "6", typical_range: 3 to 10}]}
# tuning
solves: {hero: {kind: tuning, dims: 2, trials: 30}, line: Tries settings and learns.}
# metric
solves: {hero: {kind: metric, dataset: breast-cancer, highlight: [TP, FP]}, line: Share of predicted positives that are right.}
# diagnostic
solves: {hero: {kind: diagnostic, dataset: ames, chart: residuals vs fitted}, line: ...}
# output
applies_to: [ridge]
solves: {hero: {kind: output, dataset: ames, plot: bar}, line: One weight per column.}
# composer
solves: {hero: {kind: composer, boxes: [Imputer, Encoder, Model]}, line: Chains steps into one object.}
```

Non-model, non-hyperparameter archetypes use `quick_facts: {facts: [{label: Needs scaling, value: no}]}`
or none, and `intuition: {text: ...}`.

## Spec ambiguities and choices (flagged)

1. Spec §9 says "Titanic or breast cancer": the user chose breast cancer on 2026-10-24; `titanic` is removed from `toy_datasets`.
2. The inventory has no `hyperparameter` pages. `max-depth` uses stage `tune`; the stage for
   hyperparameter pages is a choice for the user.
3. `question_tags` (§5.2) is stored as user-wording tags, distinct from question `answers`.
4. Unsupervised is wave `later` (spec §6 "Later waves"), though §3.2 does not label it.
5. Hero visual parameters, `quick_facts` for non-model archetypes and `data_size` format are
   small guesses at what §4 implies; widen only when a page needs it.
