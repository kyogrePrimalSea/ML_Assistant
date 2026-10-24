# T034 — `content/taxonomy.yaml` from the question map

**Status:** Backlog

**Epic:** E11

## Objective

Convert `docs/QUESTION_MAP.md` into the machine-readable `content/taxonomy.yaml` (spec §3.3,
A2), with a JSON Schema and a sync test that keeps the two files' page placements identical.

## Context

- `docs/QUESTION_MAP.md` §3–§6 (structure, goals, stages, groups, families, pages, `For`
  tags, labels, prompts, `pick_when`). The markdown stays as the human-readable reference;
  after this task the YAML is maintained directly (brief §4).
- **Copy wording exactly.** Don't fix, shorten or reword any label. Any length or rule
  violations are T035's validator's job to report.
- Page ids already match the inventory exactly (343 pages, no duplicates; the coordinator
  checked on 2026-10-24).

## Dependencies

- None. T035, T036, T037, T038 and T039 consume this file.

## Implementation Contract

### File shape

```yaml
version: 1
source: docs/QUESTION_MAP.md
root: {question_prompt: Where are we in the work?}
goal_prompt: What are we trying to do?
goals:                                    # v1 goals only, in order
  - {id: predict-number, question_label: Predict a number, names_label: Standard · Regression,
     question_sentence: "...", track: standard, task: regression}
later_goals:                              # listed, not built
  - {id: find-structure, question_label: Find groups or odd ones out, names_label: Unsupervised}
stages:                                   # pipeline order = ring order (all 9, always)
  - id: model
    names_label: Model
    question_label: {predict-number: Predict the number, predict-category: Predict the category, forecast: Make the forecast}
    question_sentence: We need a model that makes the prediction.
    question_prompt: {predict-number: How should we predict the number?, ...}
    children:                             # groups, or families when the stage has no group level
      - id: model.linear
        level: group
        names_label: Linear models
        question_label: {predict-number: Fit a line we can explain, predict-category: Get probabilities we can explain}
        question_sentence: {predict-number: "...", predict-category: "..."}
        question_prompt: {predict-number: What do we need from the line?}   # optional; may be partial
        for: [predict-number, predict-category]
        children:
          - id: model.linear.ols
            level: family
            names_label: Ordinary least squares
            question_label: Fit a plain straight line
            question_sentence: We need the simplest line, with readable coefficients and p-values.
            question_prompt: null
            for: [predict-number]
            pages:
              - {id: linear-regression, shown_as: Linear regression, for: [predict-number],
                 pick_when: "Baseline; the statsmodels tab gives p-values"}
```

- Any text field is either a string (the same for every goal) or a map from goal id to
  string. A map may leave a goal out only where the node isn't shown for that goal.
- `for` lists goal ids. Map the markdown codes like this: **R** = `predict-number`,
  **C** = `predict-category`, **TS** = `forecast`, **R·C** = both standard goals,
  **R·TS** = `predict-number` + `forecast`, **All** = all three.
- A "group with pages directly" (for example `model.neural`, `evaluate.explained`,
  `tune.threshold`) is `level: group` with `pages:` instead of `children:`. Its id also
  serves as the family id for its pages (records use it as `family`).
- Stage prompts that differ by goal ("R·C: … · TS: …") become maps.
- Child order is the order in the markdown (most common first).
- Group or family `for` is the union of its pages' `for` unless the markdown table states it.
  Where both exist, they must agree; disagreements are reported, not fixed.

### Outputs

- `content/taxonomy.yaml` (generated once by a small script, `tools/gen_taxonomy.py`, which
  parses the markdown; commit both the script and the YAML).
- `content/schema/taxonomy.schema.json`, and a test that the YAML validates against it.
- `tests/test_taxonomy_sync.py`: parse the page tables in `docs/QUESTION_MAP.md` §6 and assert
  that the set of `(page id, family or group id, stage)` equals the YAML's, and that every
  `pick_when`/`shown_as`/`for` matches. A failure message names the differing pages.
- `docs/ARCHITECTURE.md`: a short "Taxonomy" section (file, owner, sync test, and the rule that
  the YAML is maintained directly from now on). `docs/CONTENT_SCHEMA.md`: a pointer to it.

## Acceptance Criteria

- [ ] All 343 pages appear exactly once in the YAML; all 9 stages are present in order.
- [ ] `.venv/bin/python -m pytest -q` passes, including the schema and sync tests.
- [ ] The labels are byte-identical to the markdown (spot-check 10 in the run log).

## Verification

`.venv/bin/python tools/gen_taxonomy.py && .venv/bin/python -m pytest -q tests/test_taxonomy_sync.py && .venv/bin/python -m pytest -q`
