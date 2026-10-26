# T050 — Rich model pages: sparse linear models

**Status:** Done

## Objective

Migrate seven sparse and regularised regression model pages to the reviewed rich
model-page template.

## Context

Read `docs/CONTENT_SCHEMA.md` section “Reviewed model-page template” and use
`content/items/model/xgboost.yaml` only as the structural/style reference. Facts must
come from each page's existing record, extraction JSON, installed pinned library, and
official docs in or added to `source_urls`.

**Epic:** E14

## Dependencies

- T048

## Owned Records

- `content/items/model/lasso.yaml`
- `content/items/model/lasso-cv.yaml`
- `content/items/model/elastic-net.yaml`
- `content/items/model/elastic-net-cv.yaml`
- `content/items/model/lars.yaml`
- `content/items/model/lasso-lars.yaml`
- `content/items/model/orthogonal-matching-pursuit.yaml`

## Implementation Contract

- Edit only the seven owned records. Do not edit schema, UI, docs, state, tasks,
  cutscenes, generated public data, or another item record.
- Preserve placement, relationships, source provenance, animation value, and
  `reviewed: false`.
- Complete every applicable item in the reviewed template: deterministic prediction
  code/output; rich outputs and shape teaching; settings with consequences; intuitive
  steps and model-specific mathematics.
- Explicitly distinguish L1, mixed L1/L2, path/CV selection, and greedy sparse fitting
  where relevant; do not copy one generic explanation across unlike algorithms.
- Every claim must be source-grounded. Add official guide URLs where needed.
- Run every stored snippet in the pinned environment and compare stdout exactly.
- Fictional examples must match declared types and shapes.

## Acceptance Criteria

- [x] All seven pages meet every applicable item in the reviewed template.
- [x] Related pages explain their real algorithmic differences.
- [x] Key settings have controls/trade-offs; shapes/examples/explanations agree.
- [x] Stored outputs byte-match exact snippet runs.
- [x] The content validator reports no errors or warnings for the assigned ids.

## Verification

Run assigned snippets from a scratch directory with `.venv/bin/python -I -W ignore`,
then run `.venv/bin/python tools/validate_content.py`. Do not run npm commands while
parallel writers are active.
