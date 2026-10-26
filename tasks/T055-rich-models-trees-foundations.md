# T055 — Rich model pages: single trees, bagging, and forests

**Status:** Done

## Objective

Migrate six foundational tree and bagging pages to the reviewed rich model-page template.

## Context

Use `docs/CONTENT_SCHEMA.md` section “Reviewed model-page template” and
`content/items/model/xgboost.yaml` as the structural/style reference. Facts must come
from each owned record, extraction JSON, the pinned runtime, and official documentation.

**Epic:** E14

## Dependencies

- T048

## Relevant Files and Owned Outputs

- `content/items/model/extra-tree-regressor.yaml`
- `content/items/model/decision-tree-classifier.yaml`
- `content/items/model/decision-tree-regressor.yaml`
- `content/items/model/random-forest.yaml`
- `content/items/model/extra-trees.yaml`
- `content/items/model/bagging.yaml`

## Implementation Contract

- Edit only the six owned YAML records. Do not edit schema, UI, docs, state, tasks,
  generated app content, cutscenes, or another record.
- Preserve taxonomy placement, relationships, animation fields, and `reviewed: false`.
- Complete every applicable template field: deterministic code and exact output;
  prediction methods and important fitted attributes with kind/task/type/shape/example/
  novice explanation; setting controls/effects; and model-specific goal/steps/math.
- Represent regression values, class labels, class probabilities, multi-output axes,
  tree structures, estimator collections, feature importances, and OOB values accurately.
- Distinguish deterministic tree splitting, random split thresholds, bootstrap sampling,
  random feature subsets, and averaging/voting. Do not reuse generic forest prose.
- Examples must be values of their declared types and reconcile with symbolic dimensions.

## Scope

In scope: the six YAML records and official source URLs needed to support their claims.
Out of scope: animation work, renderer/schema changes, taxonomy changes, or reviewed flags.

## Acceptance Criteria

- [x] All six pages meet every applicable item in the reviewed template.
- [x] Classifier/regressor and single-/multi-output shapes are accurate.
- [x] Important fitted outputs and every listed setting have meaningful explanations.
- [x] Each fitting mechanism and prediction rule is distinct and technically grounded.
- [x] Every stored snippet byte-matches the pinned runtime; validator has no diagnostics.

## Verification

Run every owned `code` and `what_comes_out.snippet` from a scratch directory with
`.venv/bin/python -I -W ignore`, compare stdout byte-for-byte, then run
`.venv/bin/python tools/validate_content.py`. Baseline: 343 records, 0 errors, 0 warnings.
