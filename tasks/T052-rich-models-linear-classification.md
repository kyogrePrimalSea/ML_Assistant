# T052 — Rich model pages: linear classification

**Status:** Done

## Objective

Migrate four linear probabilistic-classification pages to the reviewed rich model-page template.

## Context

Use `docs/CONTENT_SCHEMA.md` section “Reviewed model-page template” and
`content/items/model/xgboost.yaml` as the structural/style reference. Facts must come
from each record, extraction JSON, the pinned runtime, and official documentation.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/logistic-regression.yaml`
- `content/items/model/logistic-regression-cv.yaml`
- `content/items/model/probit.yaml`
- `content/items/model/mn-logit.yaml`

## Implementation Contract

- Edit only the four owned records; preserve relationships, animations, and `reviewed: false`.
- Complete every applicable template field, including exact prediction snippets/outputs,
  novice output shapes/examples, setting consequences, and model-specific intuition/math.
- Distinguish class labels from probabilities and decision scores. State binary versus
  multiclass shapes precisely, and use probabilities/scores—not labels—for ROC AUC or PR.
- Explain likelihood/link functions and regularisation/CV differences without flattening
  statsmodels and scikit-learn APIs into one interface.
- Verify every stored snippet byte-for-byte in the pinned environment and run the validator.

## Acceptance Criteria

- [x] All four pages meet every applicable item in the reviewed template.
- [x] Probability, score, label, coefficient, and inference-result shapes/types are accurate.
- [x] Listed settings have controls/effects; math distinguishes logit, probit, and multinomial fits.
- [x] Exact outputs and the content validator pass.
