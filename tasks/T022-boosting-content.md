# T022 — Boosting family content records

**Status:** Backlog

**Epic:** E04

## Objective

Write the content records for the first shippable slice (spec §13 step 3): the four
boosting pages and the hyperparameter pages their Tier 1 settings link to.

## Context

Pattern to follow: `content/items/model/xgboost.yaml` and `content/items/tune/max-depth.yaml`
(T012). Schema: `docs/CONTENT_SCHEMA.md`. Facts only from extraction records
(`content/extraction/<library>/<id>.json`, incl. `effective_default`). Spec §1, §5, §11
for tone. Working defaults from `docs/OPEN_QUESTIONS.md` (one page for Regressor +
Classifier pairs; classification toy dataset Titanic).

## Dependencies

- T020 (E03 renderer exists so pages can be checked visually)

## Implementation Contract

### Outputs

- `content/items/model/`: `gradient-boosting.yaml`, `hist-gradient-boosting.yaml`,
  `lightgbm.yaml` (inventory page ids — check them); re-check `xgboost.yaml` against
  its extraction record and spec §5.4, fixing only factual errors.
- `content/items/tune/`: hyperparameter pages for the Tier 1 settings shared by the
  family — `n-estimators`, `learning-rate`, and `early-stopping` (covering
  `early_stopping_rounds` / `n_iter_no_change` / LightGBM callbacks as appropriate) —
  plus extend `max-depth.yaml`'s `applies_to` to all four pages. Per-target defaults
  in quick facts (they differ between libraries).
- Link each model page's key settings to these pages; `vs_siblings` cross-link the four.
- Every snippet runs in `.venv`; results appended to `content/items/EXAMPLES-RUN.md`.
- Re-run `tools/derive_relationships.py`; validator must exit 0.

### Rules

- `reviewed: false`. No schema or tool changes; report gaps instead.

## Acceptance Criteria

- [ ] `.venv/bin/python tools/validate_content.py` exits 0; all snippets run; pytest passes.
- [ ] Each page renders in the app with no "None" in slots the spec says the archetype has.

## Verification

`.venv/bin/python tools/validate_content.py && .venv/bin/python -m pytest -q && cd app && npm test`
