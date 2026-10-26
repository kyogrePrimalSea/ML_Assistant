# T049 — Rich model pages: linear foundations

**Status:** Done

## Objective

Migrate six foundational regression model pages to the reviewed rich model-page
template.

## Context

Read `docs/CONTENT_SCHEMA.md` section “Reviewed model-page template” and use
`content/items/model/xgboost.yaml` only as the structural/style reference. Facts must
come from each page's existing record, extraction JSON, installed pinned library, and
official docs in or added to `source_urls`.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/linear-regression.yaml`
- `content/items/model/wls.yaml`
- `content/items/model/gls.yaml`
- `content/items/model/ridge.yaml`
- `content/items/model/ridge-cv.yaml`
- `content/items/model/pls-regression.yaml`

## Implementation Contract

- Edit only the six owned records. Do not edit schema, UI, docs, state, tasks,
  cutscenes, generated public data, or another item record.
- Preserve placement, relationships, source provenance, animation value, and
  `reviewed: false`.
- Complete the reviewed template on every page: deterministic fit/predict code and
  exact output; rich What-comes-out metadata/examples/shape explanations and prediction
  snippet/output; setting controls/trade-offs; goal/steps/model-specific mathematics.
- For multi-library pages, preserve meaningful tabs and explain library differences.
- Every factual claim must be source-grounded. Add an official URL when the mathematical
  explanation requires an official guide beyond the existing API URL.
- Run every stored snippet in the pinned environment and compare stdout exactly.
- Examples marked fictional need not execute but must match their declared type/shape.
- Keep prose novice-friendly and equations technically accurate.

## Acceptance Criteria

- [x] All six pages meet every applicable item in the reviewed template.
- [x] No assigned page leaves a listed key setting without `controls` and `effect`.
- [x] Formal shapes, fictional examples, and shape explanations agree.
- [x] Stored outputs byte-match exact snippet runs.
- [x] The content validator reports no errors or warnings for the assigned ids.

## Verification

Run assigned snippets from a scratch directory with `.venv/bin/python -I -W ignore`,
then run `.venv/bin/python tools/validate_content.py`. Do not run npm commands while
parallel writers are active.
