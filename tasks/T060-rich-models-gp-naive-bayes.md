# T060 — Rich model pages: Gaussian processes and Naive Bayes

**Status:** Done

## Objective

Migrate two Gaussian-process and five Naive Bayes pages to the reviewed rich template.

## Context

Use the documented template and pinned official APIs. These families share probabilistic
outputs but have different assumptions; do not flatten them into generic probability prose.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/gaussian-process-regressor.yaml`
- `content/items/model/gaussian-process-classifier.yaml`
- `content/items/model/gaussian-nb.yaml`
- `content/items/model/multinomial-nb.yaml`
- `content/items/model/complement-nb.yaml`
- `content/items/model/bernoulli-nb.yaml`
- `content/items/model/categorical-nb.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve placement, relationships, animation, and `reviewed: false`.
- Complete exact runnable outputs, object/shape teaching, setting effects, and distinct math.
- For Gaussian processes cover kernel covariance, posterior mean/uncertainty or class probability,
  learned kernel parameters, log marginal likelihood, and computational scaling.
- For each Naive Bayes variant state the feature likelihood, smoothing/count requirements,
  class log priors, labels/probabilities/joint log likelihood semantics, and feature-shape constraints.
- Keep prediction probabilities separate from labels and uncertainty standard deviations.

## Acceptance Criteria

- [x] Seven pages meet every applicable template item.
- [x] GP uncertainty and all five NB likelihood assumptions are technically distinct.
- [x] Outputs, settings, exact snippets, and validator pass.

## Verification

Exact-run all snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
