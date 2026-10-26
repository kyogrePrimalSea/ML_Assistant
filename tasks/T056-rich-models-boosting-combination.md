# T056 — Rich model pages: boosting and model combination

**Status:** Done

## Objective

Migrate the four remaining boosting pages and two model-combination pages to the reviewed template.

## Context

Use the documented template and XGBoost reference. Ground claims in owned records,
extraction JSON, official documentation, and the pinned runtime.

**Epic:** E14

## Dependencies

- T048

## Relevant Files and Owned Outputs

- `content/items/model/lightgbm.yaml`
- `content/items/model/hist-gradient-boosting.yaml`
- `content/items/model/gradient-boosting.yaml`
- `content/items/model/ada-boost.yaml`
- `content/items/model/stacking.yaml`
- `content/items/model/voting.yaml`

## Implementation Contract

- Edit only the six owned YAMLs; preserve placement, relationships, animations, and `reviewed: false`.
- Complete exact runnable prediction code/output, rich output metadata/examples/shapes,
  all listed setting consequences, and model-specific intuition/mathematics.
- For classifiers distinguish labels, probabilities, margins/raw scores, class axes, and
  binary/multiclass behavior. For regressors describe numeric prediction shapes.
- Distinguish residual/gradient boosting, histogram binning, leaf-wise LightGBM growth,
  AdaBoost reweighting, stacking out-of-fold meta-features, and hard/soft voting.
- Document important fitted outputs such as estimators, classes, scores/importances, and
  final/meta-estimator state only when verified for the owned target APIs.
- Avoid claiming one library’s API for another. Preserve meaningful multi-library tabs.

## Scope

In scope: six YAML records and official source URLs. Out of scope: animations,
renderer/schema changes, generated data, taxonomy, and reviewed flags.

## Acceptance Criteria

- [x] All six pages meet the reviewed template with distinct algorithm explanations.
- [x] Probability/score/value outputs and ensemble/member axes are accurate.
- [x] Every listed setting has controls/effect and examples reconcile with shapes.
- [x] Every stored snippet byte-matches; validator has no diagnostics.

## Verification

Exact-run all owned snippets with `.venv/bin/python -I -W ignore`, then run
`.venv/bin/python tools/validate_content.py`. Baseline: 343 records, 0 errors, 0 warnings.
