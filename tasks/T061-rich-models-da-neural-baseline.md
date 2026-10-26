# T061 — Rich model pages: discriminant analysis, neural nets, and baselines

**Status:** Done

## Objective

Migrate six discriminant-analysis, neural-network, and baseline model pages.

## Context

Use the reviewed template, official docs, extraction JSON, and the pinned runtime.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/linear-discriminant-analysis.yaml`
- `content/items/model/quadratic-discriminant-analysis.yaml`
- `content/items/model/mlp-regressor.yaml`
- `content/items/model/mlp-classifier.yaml`
- `content/items/model/dummyclassifier.yaml`
- `content/items/model/dummyregressor.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve placement, relationships, animation, and `reviewed: false`.
- Complete deterministic code/output, output metadata/shapes/examples, setting consequences,
  and family-specific intuition/math.
- Distinguish shared versus class-specific covariance and resulting linear/quadratic boundaries.
- Explain MLP layer shapes, activations, forward prediction, loss/optimizer iterations, and
  labels/probabilities versus regression values without claiming causal interpretation.
- Explain each dummy strategy as a baseline rule, not a learned feature relationship; include
  correct prior/constant/quantile outputs and classifier/regressor score meanings.

## Acceptance Criteria

- [x] Six pages meet every applicable template item.
- [x] Output shapes and family mechanisms are accurate and non-generic.
- [x] Settings, exact snippets, and validator pass.

## Verification

Exact-run all snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
