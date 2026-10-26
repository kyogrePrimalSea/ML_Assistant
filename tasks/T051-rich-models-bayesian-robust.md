# T051 — Rich model pages: Bayesian, mixed, and robust regression

**Status:** Done

## Objective

Migrate seven Bayesian, mixed-effects, and robust regression pages to the reviewed
rich model-page template.

## Context

Read `docs/CONTENT_SCHEMA.md` section “Reviewed model-page template” and use
`content/items/model/xgboost.yaml` only as the structural/style reference. Facts must
come from each page's existing record, extraction JSON, installed pinned library, and
official docs in or added to `source_urls`.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/bayesian-ridge.yaml`
- `content/items/model/ard-regression.yaml`
- `content/items/model/mixed-lm.yaml`
- `content/items/model/huber-regressor.yaml`
- `content/items/model/ransac-regressor.yaml`
- `content/items/model/theil-sen-regression.yaml`
- `content/items/model/rlm.yaml`

## Implementation Contract

- Edit only the seven owned records. Do not edit schema, UI, docs, state, tasks,
  cutscenes, generated public data, or another item record.
- Preserve placement, relationships, source provenance, animation value, and
  `reviewed: false`.
- Complete every applicable item in the reviewed template: deterministic prediction
  code/output; rich outputs and shape teaching; settings with consequences; intuitive
  steps and model-specific mathematics.
- Do not flatten these into a generic “robust linear model” explanation: distinguish
  Bayesian priors/evidence, group effects, robust loss, random consensus, median-slope,
  and robust norm fitting as applicable.
- Every claim must be source-grounded. Add official guide URLs where needed.
- Run every stored snippet in the pinned environment and compare stdout exactly.
- Fictional examples must match declared types and shapes.

## Acceptance Criteria

- [x] All seven pages meet every applicable item in the reviewed template.
- [x] Each page explains its distinct fitting mechanism and assumptions.
- [x] Key settings have controls/trade-offs; shapes/examples/explanations agree.
- [x] Stored outputs byte-match exact snippet runs.
- [x] The content validator reports no errors or warnings for the assigned ids.

## Verification

Run assigned snippets from a scratch directory with `.venv/bin/python -I -W ignore`,
then run `.venv/bin/python tools/validate_content.py`. Do not run npm commands while
parallel writers are active.
