# T064 — Rich model pages: curve fitting and shape constraints

**Status:** Done

## Objective

Migrate Curve Fit, Least Squares, and Isotonic Regression to the reviewed rich template.

## Context

Use official SciPy/scikit-learn documentation, extraction records, and pinned runtime.
These pages mix function-return objects with estimator methods.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/curve-fit.yaml`
- `content/items/model/least-squares.yaml`
- `content/items/model/isotonic-regression.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve placement, relationships, animation, and `reviewed: false`.
- Provide deterministic code/exact output and model/tool-specific output rows.
- Curve Fit must document `popt`, `pcov`, parameter uncertainty/shape, supplied model function,
  and prediction construction without calling covariance a confidence interval.
- Least Squares must document OptimizeResult ownership and key `x`, `fun`, `cost`, `jac`,
  status/success outputs with residual/Jacobian dimensions.
- Isotonic Regression must explain monotonic projection, increasing/auto/out-of-bounds behavior,
  threshold attributes, prediction shapes, and why predictions are piecewise linear/constant as pinned.
- Every setting needs controls/effect and equations need plain-language meaning.

## Acceptance Criteria

- [x] Three pages meet every applicable rich-template item.
- [x] Return/result/estimator objects, shapes, and limitations are accurate.
- [x] Settings, exact snippets, and validator pass.

## Verification

Exact-run all snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
