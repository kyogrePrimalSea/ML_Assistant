# T046 — Output row clarity and illustrative examples

**Status:** Done

## Objective

Make the XGBoost “What comes out” section unambiguous: separate classification
and regression guidance, label each result's object type and shape, and let the
reader expand each row to see a small illustrative example made from fictional
values.

## Context

The user reviewed the T045 XGBoost prototype and found the combined next-step text
unclear. They also requested object type/shape and a dropdown showing what each
output looks like. This refines the existing What-comes-out slot without changing
the 12-slot page order, executable captured output, or animation.

**Epic:** E13

## Dependencies

- T045

## Relevant Files

- `tasks/T045-xgboost-rich-page-prototype.md`
- `docs/CONTENT_SCHEMA.md`
- `docs/ARCHITECTURE.md`
- `content/schema/item.schema.json`
- `content/items/model/xgboost.yaml`
- `app/src/content/types.ts`
- `app/src/page/slots/WhatComesOut.tsx`
- `app/src/page/slots/WhatComesOut.test.tsx`
- `app/src/page/PagePanel.test.tsx`
- `tests/test_schema.py`
- `tests/test_validate_content.py`

## Implementation Contract

### Inputs and Existing Interfaces

- Keep all existing What-comes-out records valid and visually compatible.
- Extend `WhatComesOutItem` additively with optional `object_type` and `example`.
- Extend `WhatComesOutBody` additively with optional `guidance`, a list of
  `{task: classification|regression, text}` entries.
- Keep the existing `next_step` field for legacy records.

### Outputs

- Shared schema, TypeScript, documentation, renderer, and tests for the new fields.
- The XGBoost record uses the new fields for all six current output rows and replaces
  the mixed next-step sentence with separate task guidance.

### Public Interfaces and Types

- `WhatComesOutItem.object_type?: string`: concrete Python-facing type such as
  `numpy.ndarray` or `int`.
- `WhatComesOutItem.example?: string`: short preformatted illustrative value.
- `WhatComesOutBody.guidance?: {task: TaskType, text: string}[]`.

### Rules and Invariants

- Each rich row visibly labels its kind, object type, and shape; do not present three
  unlabeled values in a line.
- Each rich row has its own keyboard-operable disclosure button labelled “Show
  example” / “Hide example”, with a visible focus state and native/Radix disclosure
  semantics including expanded state.
- The expanded region says “Illustrative example” and “Made-up values” so it cannot
  be confused with the exact captured run shown later in the slot.
- Examples use small, plausible fictional values, preserve whitespace, and use the
  code font. They do not need to execute and must not be stored as evidence.
- XGBoost's classification guidance says probabilities/scores are for ROC AUC and PR
  curves while predicted labels are for label-based metrics such as accuracy or a
  confusion matrix.
- XGBoost's regression guidance says to reverse a target transform before interpreting
  predictions or reporting errors, and names `np.expm1` only for a `np.log1p` target.
- Render guidance as separate labelled Classification and Regression blocks.
- Keep the exact runnable snippet and captured output from T045 unchanged.
- Do not modify animation, cutscenes, Watch-it-work, taxonomy, or another item record.
- Keep legacy output rows compact and their current behavior unchanged when the new
  fields are absent.

### Dependencies and Consumers

- `build-content.mjs` transports fields unchanged.
- `WhatComesOut` consumes them.
- Later page migrations may reuse the additive fields.

### Behaviour Examples

- `predict_proba` shows Method, `numpy.ndarray`, `(n_samples, n_classes)`, and an
  expandable two-row array of fictional probabilities.
- `best_iteration` shows Attribute, `int`, scalar, and an expandable fictional value.
- A legacy Ridge output row with no new fields renders as it did before T046.

## Scope

### In Scope

- Shared additive output metadata and disclosures.
- XGBoost content migration only.
- Focused schema, rendering, keyboard, and legacy-compatibility tests.

### Out of Scope

- Changes to the exact executable/captured output block.
- New animations or generated datasets.
- Migration of other pages.

## Acceptance Criteria

- [ ] The unclear combined sentence is gone and task guidance is visibly separated.
- [ ] All six XGBoost output rows identify object type and shape.
- [ ] Every XGBoost output row has an accessible illustrative-example disclosure.
- [ ] Examples are explicitly marked as fictional and are visually distinct from
      captured output.
- [ ] Keyboard tests cover opening and closing a disclosure.
- [ ] Legacy records remain schema-valid and keep their prior rendering.
- [ ] Full validator, Python tests, React tests, and production build pass.

## Verification

From the project root:

```bash
.venv/bin/python tools/validate_content.py
.venv/bin/python -m pytest -q
```

From `app/`:

```bash
npm test
npm run build
```
