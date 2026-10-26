# T063 — Rich model pages: multivariate, state-space, and regime forecasts

**Status:** Done

## Objective

Migrate four multivariate, state-space, and regime-switching forecast pages.

## Context

Use the reviewed template and official pinned statsmodels APIs. These pages expose
matrix- and state-shaped results that must be explained precisely for novices.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/var.yaml`
- `content/items/model/varmax.yaml`
- `content/items/model/unobserved-components.yaml`
- `content/items/model/markov-regression.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve placement, relationships, animation, and `reviewed: false`.
- Complete deterministic code/output, rich result types/shapes/examples, settings, and distinct math.
- VAR/VARMAX must define series, lags, forecast matrices, covariance/errors, and exogenous inputs.
- UnobservedComponents must distinguish observation and latent-state equations plus filtered/smoothed state outputs.
- MarkovRegression must explain regime transition probabilities, regime-specific parameters,
  smoothed probabilities, and prediction weighting without implying observed regime labels.
- Clearly distinguish rows/time steps, series, states, regimes, parameters, and confidence-bound axes.

## Acceptance Criteria

- [x] Four pages meet every applicable rich-template item.
- [x] Matrix/state/regime result types and axes are correct.
- [x] Settings, exact snippets, and validator pass.

## Verification

Exact-run all snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
