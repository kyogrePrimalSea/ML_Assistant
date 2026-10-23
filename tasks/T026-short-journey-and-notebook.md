# T026 — Short journey (globe) and notebook output

**Status:** Backlog

**Epic:** E04

## Objective

Prove the Build path end to end with a short fixed pipeline: Passport → stops on the
globe journey → notebook view → `.ipynb` download. The full builder is E08.

## Context

Spec §7.3 (passport, regions/stops, legs valid green / warning amber / blocked red,
fly-overs labelled "(skipped)", ticket per stop incl. data shape after the step,
itinerary list, play journey once, arrival = notebook), §8 (validation rules derived
from schema; output: one cell per stop with copy button, `.ipynb` download, fixed
templates, deterministic, `Pipeline`/`ColumnTransformer` in fixed stage order,
comment per section, TODO placeholders). globe.gl/three pre-installed.

## Dependencies

- T022 (boosting content)

## Implementation Contract

### Outputs

- `app/src/build/validate.ts`: pure functions implementing the spec §8 rules that
  the schema supports (missing requirement, wrong for track, task mismatch, leakage
  risk, redundant step, missing recommendation) from record fields only (`prep`,
  `rules`, profile). Unit-tested per rule. E08 reuses it.
- `app/src/build/demoPipeline.ts`: a fixed demo: profile {task: regression, track:
  standard, has_categoricals: true, has_missing: true, time_ordered: false,
  imbalanced: false, shape 1,460 × 81}; stops: train-test-split → one-hot encoding
  (or the inventory's encoder page) → XGBoost → an R²/RMSE metric page;
  Select/Tune/Interpret stages flown over "(skipped)". Use only pages that exist as
  records (write minimal records for the encoder and metric if missing, following
  T012/T022 rules, via the content pipeline — validator must pass).
- `app/src/views/Journey.tsx` (globe.gl): passport card at route start, stages as
  regions, stops within; leg colours from `validate.ts`; ticket on stop select (stage,
  stop number, status, why, code, data shape after step from `shape_effect`);
  itinerary list beside the globe (read-only here); "Play journey" once, reduced
  motion respected. Journey view reachable from the view switcher.
- `app/src/build/notebook.ts` + `app/src/views/NotebookView.tsx`: deterministic cells
  from fixed templates per stop (imports, comment per section, TODO placeholders,
  scikit-learn `Pipeline`/`ColumnTransformer` in stage order); copy per cell;
  "Download .ipynb" producing valid nbformat 4 JSON. A Python test in `tests/`
  validates a generated `.ipynb` exported by a node script and executes it with
  toy data substituted for TODOs (nbconvert not required — run the cells' code in
  sequence).
- Playwright: open Journey, select a stop, see its ticket, arrive at the notebook,
  download works. Screenshots 1440/1024 light/dark.

## Acceptance Criteria

- [ ] Demo journey renders with correct leg colours and shapes; notebook downloads and runs.
- [ ] Lint, tests, build, e2e, pytest pass.

## Verification

`cd app && npm run lint && npm test && npm run build && npm run e2e && cd .. && .venv/bin/python -m pytest -q`
