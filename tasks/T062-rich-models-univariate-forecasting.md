# T062 — Rich model pages: autoregressive and smoothing forecasts

**Status:** Done

## Objective

Migrate six univariate autoregressive and smoothing forecast pages to the rich template.

## Context

Use the reviewed template, official statsmodels documentation, extraction records, and
the pinned runtime. Forecast outputs carry time indices and horizons that need novice explanations.

**Epic:** E14

## Dependencies

- T048

## Owned Outputs

- `content/items/model/auto-reg.yaml`
- `content/items/model/arima.yaml`
- `content/items/model/sarimax.yaml`
- `content/items/model/ets-model.yaml`
- `content/items/model/exponential-smoothing.yaml`
- `content/items/model/theta-model.yaml`

## Implementation Contract

- Edit only owned YAMLs; preserve taxonomy, relationships, animation, and `reviewed: false`.
- Provide deterministic fit/forecast code and exact output; distinguish model objects from fitted Results.
- Document forecast/predict/get_forecast means, horizon/index shapes, confidence intervals,
  fitted parameters/residuals and key diagnostics only when verified.
- Explain lags/differencing/MA errors/seasonality/exogenous regressors, ETS components,
  Holt-Winters recursions, and Theta decomposition distinctly.
- Explain temporal ordering, future exogenous-shape requirements, and in-sample versus
  out-of-sample semantics. Do not describe a forecast interval as ordinary class probability.

## Acceptance Criteria

- [x] Six pages meet every applicable rich-template item.
- [x] Forecast/result types, time/horizon axes, intervals, and mechanisms are accurate.
- [x] Every listed setting has controls/effect; exact snippets and validator pass.

## Verification

Exact-run all snippets with `.venv/bin/python -I -W ignore`, then run the validator.
Baseline: validator 343/0/0, pytest 1743, Vitest 662, production build passed.
