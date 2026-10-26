# T057 — Rich model pages: balanced ensembles

**Status:** Done

## Objective

Migrate four imbalanced-learn ensemble classifier pages to the reviewed rich template.

## Context

Use the documented template and XGBoost reference. Ground all content in the pinned
imbalanced-learn runtime, extraction JSON, and official imbalanced-learn documentation.

**Epic:** E14

## Dependencies

- T048

## Relevant Files and Owned Outputs

- `content/items/model/balancedrandomforestclassifier.yaml`
- `content/items/model/easyensembleclassifier.yaml`
- `content/items/model/rusboostclassifier.yaml`
- `content/items/model/balancedbaggingclassifier.yaml`

## Implementation Contract

- Edit only the four owned YAMLs; preserve placement, relationships, animations, and `reviewed: false`.
- Complete deterministic code/exact output, prediction and fitted-output metadata with
  novice shapes/examples, setting controls/effects, and model-specific intuition/math.
- Distinguish resampling inside each estimator, balanced bootstraps, EasyEnsemble subsets,
  RUSBoost’s sampling-plus-boosting, and BalancedBagging’s sampler/base estimator pipeline.
- Treat labels, probabilities, class ordering, sampled indices/counts, estimator collections,
  and feature importances accurately. Never present resampled training rows as predictions.
- Use small deterministic imbalanced datasets and fixed random states.

## Scope

In scope: four YAML records and official source URLs. Out of scope: resampling-method
pages, animations, schema/UI/taxonomy changes, generated data, and reviewed flags.

## Acceptance Criteria

- [x] All four pages meet every applicable reviewed-template item.
- [x] Outputs and shapes match the pinned imbalanced-learn APIs.
- [x] Sampling/ensemble mechanisms and settings are distinct and accurate.
- [x] Every stored snippet byte-matches; validator has no diagnostics.

## Verification

Exact-run all owned snippets with `.venv/bin/python -I -W ignore`, then run
`.venv/bin/python tools/validate_content.py`. Baseline: 343 records, 0 errors, 0 warnings.
