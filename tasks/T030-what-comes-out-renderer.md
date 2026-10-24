# T030 — "What comes out" renderer and visuals

**Status:** Backlog

**Epic:** E12

## Objective

Render slot 7, **What comes out**, on every page. On model pages, add its two small
interactive visuals: a `predict_proba` table with a threshold slider, and regression
predictions with an "undo log target" toggle.

## Context

- Spec §5.1 slot 7 (A4), §10 (tokens, motion), §11 (accessibility). The page renderer is
  `app/src/page/PagePanel.tsx`, with the slots in `app/src/page/slots/`. `shared.tsx` holds
  `Slot`, `None` and `Frame`.
- Types: `app/src/content/types.ts` (`WhatComesOut`, from T028). Data: the record's
  `slots.what_comes_out`, plus `public/data/.../outputs/<page>.json` (path and format in
  T028 and `docs/ARCHITECTURE.md`).
- The visual style should match Watch it work and the data-frame diff
  (`app/src/components/DataFrameDiff.tsx`).
- **A8 applies:** numbers and shapes in this slot use Atkinson with
  `font-variant-numeric: tabular-nums`, not JetBrains Mono. Method and attribute names are
  inline code (Mono).

## Dependencies

- T028.

## Implementation Contract

- `PagePanel` renders 12 slots. `WhatComesOut` sits between `Code` and `CatchOuts`, and the
  doc comment says 12. Slot title: "What comes out". `{none: true}` renders `None`, like the
  other slots.
- Items appear as a compact list: name (inline code), kind, task tag (when set), shape and
  note. `next_step` appears below as a plain line with an arrow icon. `snippet` renders with
  the existing `CodeBlock` (whatever T031 does to `CodeBlock`, consume it as is).
- **`proba_table`**: the toy rows from the outputs file, laid out as columns `row`,
  `P(<class_names[0]>)`, `P(<class_names[1]>)` (headed `y_score`), `predicted` and `actual`.
  The class-1 column is highlighted with an accent tint and a 2px left bar, like changed cells
  in the diff. A threshold slider (Radix/shadcn Slider, 0.05–0.95, step 0.05, default 0.5)
  recomputes `predicted` from `proba[1] >= threshold`. Rows whose label flipped from the 0.5
  default get a marker that is icon plus text, never colour alone. A live region announces
  "N labels changed". The keyboard drives the slider, and its accessible label is
  "Decision threshold".
- **`regression_preds`**: columns `row`, `actual`, `predicted`. A toggle (Radix Switch or
  ToggleGroup) labelled "Undo log target" switches `predicted` between `y_pred_log` (log
  units) and `y_pred` (dollars, formatted `208,500`). When it is off, a muted line reads "Still
  in log units: undo with np.expm1 before reporting errors."
- **`both`**: one Classification | Regression toggle above a single visual. It defaults to
  Classification. E11's goal selector will later set the default, so expose the default as a
  prop.
- Value changes apply instantly; no animation is needed. If you add any transition, respect
  reduced motion.
- When the outputs file is missing or still loading, show the normal `Frame` placeholder and
  don't crash.
- Use the token colours only, and keep WCAG AA contrast in light and dark.

## Tests

- Unit: the slot renders `None` for `{none: true}`; the slider at 0.9 flips the expected rows
  for a fixture; the toggle switches units; the order is 12 slots with What comes out after
  Code.
- e2e (Playwright, 1440 and 1024): open `#/page/xgboost`, find the slot, move the slider with
  the keyboard and check a label flips; run axe on the slot. Use the `--output` and screenshot
  dirs under `/tmp` (Playwright wipes `app/test-results/`).
- Save before and after screenshots (xgboost at 1440 dark and 1024 light) under
  `/tmp/e12-shots/T030/` and list them in the run log.

## Acceptance Criteria

- [ ] `cd app && npm run lint && npm test && npm run build && npm run e2e` all pass.
- [ ] XGBoost shows the slot with a working threshold slider and the undo-log toggle.
- [ ] Pages with `{none: true}` show the slot titled "What comes out" with "None".

## Verification

```
cd app && npm run lint && npm test && npm run build
npx playwright test --output /tmp/pw-T030
```
