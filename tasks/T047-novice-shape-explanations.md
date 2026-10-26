# T047 — Novice-friendly output shape explanations

**Status:** Done

## Objective

Keep formal output shapes on the XGBoost prototype while explaining each one in
plain language for readers who are new to Python and NumPy.

## Context

The user reviewed T046 and found the shape information still too terse. Symbols such
as `(n_samples, n_classes)`, `(n_samples,)`, and `scalar` must not assume prior coding
knowledge. Each output row should explain its dimensions and connect the symbolic
shape to that row's fictional example.

**Epic:** E13

## Dependencies

- T046

## Relevant Files

- `tasks/T046-output-row-clarity-and-examples.md`
- `content/schema/item.schema.json`
- `content/items/model/xgboost.yaml`
- `docs/CONTENT_SCHEMA.md`
- `docs/ARCHITECTURE.md`
- `app/src/content/types.ts`
- `app/src/page/slots/WhatComesOut.tsx`
- `app/src/page/slots/WhatComesOut.test.tsx`
- `app/src/page/PagePanel.test.tsx`
- `tests/test_schema.py`
- `tests/test_validate_content.py`

## Implementation Contract

### Inputs and Existing Interfaces

- Extend `WhatComesOutItem` additively with optional `shape_explanation: string`.
- Existing rich and legacy rows without it remain valid and retain their rendering.
- Keep formal `shape`, `object_type`, and fictional `example` fields unchanged.

### Outputs

- Shared schema, TypeScript, documentation, renderer, and tests for
  `shape_explanation`.
- All six XGBoost output rows contain novice-friendly explanations connected to
  their existing fictional examples.

### Public Interfaces and Types

- `WhatComesOutItem.shape_explanation?: string`: complete plain-English prose that
  explains dimensionality, the meaning of each symbolic axis, and the concrete
  example size where applicable.

### Rules and Invariants

- Render the prose directly below the formal shape under the visible label “How to
  read this shape”. It is always visible on rich XGBoost rows, not hidden in the
  example disclosure.
- Explain `n_samples` as the number of input rows/cases being predicted.
- Explain `n_classes` as the number of possible categories and `n_features` as the
  number of input columns/features.
- Explain `(n,)` as a one-dimensional array with one value per relevant item and
  explicitly say the trailing comma means one dimension.
- Explain `(rows, columns)` as a two-dimensional table in that order.
- Explain `scalar` as one value, not an array, with no rows or columns.
- Tie each XGBoost explanation to the concrete size of its existing fictional
  example: `(2, 2)`, `(3,)`, `(2,)`, `(3,)`, `(2,)`, or scalar respectively.
- Use one idea per sentence, plain language, and natural wrapping. Do not truncate,
  clamp, or put the explanation in a fixed-height container.
- Preserve the separate task guidance, example disclosures, exact captured output,
  animation, Watch-it-work, taxonomy, and every other item record.

### Dependencies and Consumers

- `build-content.mjs` transports the field unchanged.
- `WhatComesOut` renders it.
- Future page migrations may reuse the optional field.

### Behaviour Examples

- `predict_proba`: “A two-dimensional table. Each row is one case… each column is
  one class… the example is 2 rows by 2 classes, so its shape is (2, 2).”
- classification `predict`: explains one label per case and why `(3,)` contains a
  comma.
- `best_iteration`: explains that scalar means one integer with no array dimensions.

## Scope

### In Scope

- Additive shape-explanation field and renderer.
- XGBoost content only.
- Focused schema, rendering, reflow-friendly layout, and legacy tests.

### Out of Scope

- Changing formal shapes, fictional values, or executable output.
- Adding a global glossary or modifying other pages.

## Acceptance Criteria

- [ ] Every XGBoost result explains its shape without requiring NumPy knowledge.
- [ ] Every symbolic dimension is defined where it appears.
- [ ] One-dimensional and scalar notation are explicitly explained.
- [ ] Every explanation matches its fictional example's concrete size.
- [ ] Text wraps naturally without truncation or fixed-height clipping.
- [ ] Legacy records remain valid and render as before.
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
