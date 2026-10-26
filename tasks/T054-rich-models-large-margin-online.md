# T054 — Rich model pages: large-margin and online linear models

**Status:** Done

## Objective

Migrate seven large-margin, online, and linear-classifier pages to the reviewed rich template.

## Context

Use the documented template and XGBoost reference. Ground facts in record evidence,
the pinned runtime, extraction JSON, and official documentation.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/sgd-regressor.yaml`
- `content/items/model/passive-aggressive-regressor.yaml`
- `content/items/model/linear-svr.yaml`
- `content/items/model/ridge-classifier.yaml`
- `content/items/model/linear-svc.yaml`
- `content/items/model/perceptron.yaml`
- `content/items/model/sgd-classifier.yaml`

## Implementation Contract

- Edit only the seven owned records; preserve relationships, animations, and `reviewed: false`.
- Complete every applicable template field with exact prediction code/output, fitted outputs,
  novice shapes/examples, setting effects, and algorithm-specific intuition/math.
- Distinguish regression predictions, class labels, margins/decision scores, and probabilities.
  Never claim `predict_proba` where the estimator/loss does not provide it.
- Explain the actual objectives and update mechanisms: epsilon-insensitive loss, margin losses,
  shrinkage, passive-aggressive updates, perceptron mistakes, and SGD learning schedules.
- Verify stored stdout byte-for-byte and run the content validator.

## Acceptance Criteria

- [x] All seven pages meet every applicable template item.
- [x] Output APIs and binary/multiclass shapes are correct for each estimator.
- [x] Listed settings have controls/effects and mathematics is estimator-specific.
- [x] Exact outputs and the content validator pass.
