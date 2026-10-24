# T028 — "What comes out" slot: schema, validator, toy outputs

**Status:** Ready

**Epic:** E12

## Objective

Add the 12th slot, **What comes out** (spec §5.1 slot 7, amendment A4), to the content
schema and validator. Generate the real toy outputs that the slot's visual displays.
Switch the classification toy dataset to breast cancer (the user decided this on 2026-10-24).

## Context

- Spec §5.1 (12 slots and the "What comes out, by archetype" table) and §9. The full
  brief is `docs/BRIEF_DESIGN_REVIEW_1.md` A4 and F4.
- Schema doc: `docs/CONTENT_SCHEMA.md`. Schema: `content/schema/item.schema.json`,
  `content/schema/vocab.yaml`. Validator: `tools/validate_content.py`. Tests: `tests/`.
- The pattern for generated, seeded, illustrative data is `tools/gen_boosting_cutscene.py`
  → `content/cutscenes/boosting-fit.json`. `app/scripts/build-content.mjs` copies cutscene
  data into `app/public/data/`. Check how it does that and follow the same path.

## Dependencies

- None. T029 (content) and T030 (renderer) consume this task's outputs.

## Implementation Contract

### Outputs

1. **Schema:** a new required slot key `what_comes_out`, placed between `code` and
   `catch_outs` in key order. The validator's slot-order check includes it.
   Shape, as `{none: true}` or:
   ```yaml
   what_comes_out:
     items:                       # 1-8 entries, in reading order
       - name: predict_proba      # method or attribute name, as in code
         kind: method             # method | attribute | return
         task: classification     # classification | regression | null (both/any)
         shape: (n_samples, n_classes)   # short plain text, <= 40 chars
         note: One column per class, in classes_ order.   # <= 16 words
     next_step: Keep [:, 1] as y_score for ROC AUC.        # <= 16 words, or null
     snippet: |                   # optional; same rules as Code snippets (stamp line,
       # xgboost 3.4.1            # runs when pasted, version from library_versions)
       ...
     snippet_library: xgboost     # required when snippet is set
     visual: proba_table          # proba_table | regression_preds | null
   ```
   For `visual`, `proba_table` requires `rules.task_types` to contain classification and
   `regression_preds` requires regression. A page whose task types include both may set
   `visual: both`, so the vocab enum is `proba_table | regression_preds | both | null`.
2. **Validator:**
   - Every `items[].name` of kind `method` or `attribute` exists in the extraction record of
     at least one of the page's `targets` (`methods[].name` / `attributes[].name`), or, for
     hyperparameter pages, of at least one `applies_to` page's targets. Report unknown names
     as errors.
   - `snippet` follows the existing Code snippet checks (stamp line, version).
   - **F4:** a *warning*, not an error, for any snippet line (Code or What comes out) longer
     than 79 characters, naming page, tab and line number. Warnings must not change the
     exit code.
3. **Existing records:** all 20 records in `content/items/` get `what_comes_out: {none: true}`
   in the right position, so the validator passes. T029 fills the real ones.
4. **Toy outputs:** `tools/gen_what_comes_out.py` (seeded, reproducible, runs from the project
   root with `.venv/bin/python`) writes `content/cutscenes/outputs/<page>.json` for the four
   boosting pages (`xgboost`, `lightgbm`, `hist-gradient-boosting`, `gradient-boosting`),
   using each page's own library classes with default settings except a fixed
   `random_state` / `n_estimators` small enough to be quick:
   ```json
   {
     "page": "xgboost", "library": "xgboost", "library_version": "3.4.1",
     "classification": {
       "dataset": "breast-cancer", "estimator": "XGBClassifier",
       "classes": [0, 1], "class_names": ["malignant", "benign"],
       "rows": [{"row": 0, "y_true": 1, "proba": [0.03, 0.97]}]
     },
     "regression": {
       "dataset": "ames", "estimator": "XGBRegressor", "target_transform": "log1p",
       "rows": [{"row": 0, "y_true": 208500, "y_pred_log": 12.2, "y_pred": 199000}]
     }
   }
   ```
   - Classification: `sklearn.datasets.load_breast_cancer`, a train/test split, eight test
     rows chosen deterministically to include some with probabilities between 0.2 and 0.8
     (so a threshold slider visibly flips labels). `classes`/`class_names` come from the
     dataset and `classes_`; the order must equal `predict_proba` column order. Round
     probabilities to 3 decimals.
   - Regression: the same synthetic Ames-like sample as `tools/gen_boosting_cutscene.py`
     (reuse the generation code, adding a second feature only if needed). The model is
     trained on `np.log1p(price)`; `y_pred_log` is the raw prediction and `y_pred` is
     `np.expm1(y_pred_log)`, rounded to whole dollars. Use eight rows.
   - `build-content.mjs` copies these files into `app/public/data/` the same way as
     existing cutscene data, and the path is recorded in `docs/ARCHITECTURE.md`.
5. **Toy datasets:** remove `titanic` from `vocab.yaml` `toy_datasets` and from the schema
   enums and `app/src/content/types.ts`. The records `content/items/transform/smote.yaml` and
   `content/items/evaluate/precision-score.yaml` move to `breast-cancer`. Their hero numbers
   must then be breast-cancer numbers: 212 malignant and 357 benign in the full dataset. Check
   this with `load_breast_cancer` and don't trust these figures blindly. Update the vocab
   comment and `docs/CONTENT_SCHEMA.md` (the flagged-ambiguity list, the slot list, the record
   shape and an example).
6. `app/src/content/types.ts`: add the `WhatComesOut` type. Render nothing new here, because
   T030 builds the renderer.
7. Tests in `tests/`: schema accepts and rejects (bad visual for the task type, unknown
   method name, missing slot, wrong order); the long-line warning; the generator output
   shape for one page (proba rows sum to 1 within 0.002; class order matches).

### Rules and invariants

- Never `reviewed: true`. No content wording beyond the `{none: true}` placeholders and the
  toy-dataset switch.
- The generated JSON is committed. Reruns are byte-identical.

## Scope

**In:** the schema, vocab, validator, `types.ts` type, generator and placeholders listed above,
plus the doc updates.
**Out:** the renderer (T030), real slot content (T029), and UI.

## Acceptance Criteria

- [ ] `.venv/bin/python tools/validate_content.py` exits 0; long-line warnings are listed separately.
- [ ] `.venv/bin/python -m pytest -q` passes.
- [ ] `.venv/bin/python tools/gen_what_comes_out.py` twice gives no git diff on the second run.
- [ ] `cd app && npm run lint && npm test && npm run build` pass. Content data includes the outputs files.
- [ ] No `titanic` left outside `content/extraction/` and `.cache/`.

## Verification

```
.venv/bin/python tools/gen_what_comes_out.py && git status --short content/cutscenes
.venv/bin/python tools/validate_content.py
.venv/bin/python -m pytest -q
cd app && npm run lint && npm test && npm run build
```
Baseline before this task: validator 0 errors, 1659 pytest, 247 unit tests passing.
