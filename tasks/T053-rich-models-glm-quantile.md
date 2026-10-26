# T053 — Rich model pages: GLMs and quantile regression

**Status:** Done

## Objective

Migrate six generalized-linear and quantile-regression pages to the reviewed rich template.

## Context

Use the documented template and XGBoost reference. Ground all facts in the record,
extraction JSON, pinned runtime, and official documentation.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/negative-binomial-regression.yaml`
- `content/items/model/gamma-regressor.yaml`
- `content/items/model/tweedie-regressor.yaml`
- `content/items/model/glm.yaml`
- `content/items/model/poisson-regression.yaml`
- `content/items/model/quantile-regression.yaml`

## Implementation Contract

- Edit only the six owned records; preserve relationships, animations, and `reviewed: false`.
- Complete every applicable template field with deterministic code/output, accurate fitted
  outputs, novice shapes/examples, settings consequences, and distinct intuition/math.
- Explain response support, distribution/variance assumptions, link functions, exposure or
  offset where applicable, and quantile pinball loss. Do not imply that all GLMs are the same.
- Do not invent inverse-log guidance unless the demonstrated code actually transforms the target.
- Verify stored stdout byte-for-byte and run the content validator.

## Acceptance Criteria

- [x] All six pages meet every applicable template item.
- [x] Distribution, link, prediction scale, and target-domain guidance are technically accurate.
- [x] Listed settings have controls/effects and examples reconcile with formal shapes.
- [x] Exact outputs and the content validator pass.
