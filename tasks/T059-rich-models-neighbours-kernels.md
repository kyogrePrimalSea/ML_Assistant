# T059 — Rich model pages: nearest neighbours and kernels

**Status:** Done

## Objective

Migrate seven nearest-neighbour and kernel model pages to the reviewed rich template.

## Context

Use `docs/CONTENT_SCHEMA.md` “Reviewed model-page template” and XGBoost as the
structural reference. Ground facts in official docs, extraction JSON, and pinned runtime.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/k-neighbors-regressor.yaml`
- `content/items/model/k-neighbors-classifier.yaml`
- `content/items/model/radius-neighbors-regressor.yaml`
- `content/items/model/svr.yaml`
- `content/items/model/nu-svr.yaml`
- `content/items/model/kernel-ridge.yaml`
- `content/items/model/svc.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve placement, relationships, animation, and `reviewed: false`.
- Supply deterministic prediction code/exact output, rich output rows, setting effects,
  and distinct model-specific intuition/math.
- Accurately explain neighbour indices/distances, weights, radius empty-neighbour behavior,
  regression values, labels, probabilities, decision margins, support vectors, dual coefficients,
  kernels, epsilon/nu/C trade-offs, and binary/multiclass axes.
- Do not claim probability APIs unless enabled/supported; explain SVC probability calibration cost.
- Examples must match declared types and symbolic shapes.

## Acceptance Criteria

- [x] Seven pages meet every applicable template item with distinct mechanisms.
- [x] Output objects/shapes and probability/score semantics match pinned APIs.
- [x] Every listed setting has controls/effect; exact snippets and validator pass.

## Verification

Exact-run all owned snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
