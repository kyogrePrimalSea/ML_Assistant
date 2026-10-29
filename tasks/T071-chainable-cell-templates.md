# T071 — Chainable cell templates per page

**Status:** Done

**Epic:** E15

## Objective

Make notebook v2 useful beyond the demo route: add chainable cell templates for the most common pages of each stage, written in the shared variable vocabulary (spec §8.1), so output of one cell feeds the next.

## Context

`app/src/build/notebookV2.ts` currently has templates for 4 pages only (`onehotencoder`, `train-test-split`, `xgboost`, `r2-score`); every other pick becomes a TODO cell listed in `gaps`. Page snippets are standalone demos (own data, own names), so they cannot be pasted in. Templates must reuse each page's real API calls (from its code snippet and extraction) renamed to the vocabulary in `app/src/build/vocab.ts`.
User decision: do NOT run notebooks on toy datasets. Verify by parsing (python `ast`, as the existing chain test does) and by the static chain check. Never write library facts from memory.

## Dependencies

- T065

## Relevant Files

- `app/src/build/notebookV2.ts`, `notebookV2.test.ts`, `vocab.ts`
- `content/items/<stage>/*.yaml` (the pages' `slots.code` snippets), `content/extraction/`

## Implementation Contract

### Outputs

1. **Templates** for roughly 3 to 5 pages in each of: clean (missing values), transform (imputer, scaler, a categorical encoder besides one-hot), select (one), model (linear/logistic regression, ridge, random forest, plus the existing xgboost), tune (grid search), evaluate (accuracy, F1, RMSE, MAE, confusion matrix, cross-validated score), interpret (permutation importance). Choose only pages that exist as `content/items/` records; use classification and regression variants where the API differs. Aim for about 25 templates. Every template reads and writes vocabulary names only. Classification templates must produce `y_proba` where the page supports it, and CV templates produce `cv` and `scores`.
2. **Missing-producer check:** `buildNotebookV2` returns an extra `warnings: string[]` listing any cell that reads a vocabulary name no earlier cell produces (e.g. a model with no split). The notebook still builds. Add the same list to the Notebook type; keep the existing fields unchanged.
3. **Order fix:** sort picks within a stage deterministically (by page id) so input order never changes output.
4. Tests in `notebookV2.test.ts` (extend; do not remove existing tests): per-template parse check, the chain check over at least 3 realistic routes (regression, classification, time-ordered split), the warnings case, and the order-invariance case.

### Rules and Invariants

- Names only from the vocabulary; extending `vocab.ts` is allowed only to add a name with `holds/producedBy/consumedBy`, and must be reported.
- A page whose API you cannot confirm from its record or extraction gets NO template (stays a TODO gap); list these in your report.
- Preprocessing steps that learn from data must fit on training rows only (use the `preprocess` Pipeline or ColumnTransformer fitted on `X_train`), to avoid leakage. Time-ordered routes must not shuffle.
- Deterministic output.

## Demo safety (hard rules for this task)

- Edit only `app/src/build/notebookV2.ts`, `notebookV2.test.ts`, `vocab.ts` (and new files under `app/src/build/`). Do not change `validate.ts`, `journey.ts`, `notebook.ts`, `demoPipeline.ts`, any view, or any existing test other than extending `notebookV2.test.ts`.
- Branch `feature/globe-build` only; no commit or push.
- `cd app && npx vitest run && npx tsc -b` must pass; report counts.

## Scope

### In Scope

- The outputs above.

### Out of Scope

- UI; running notebooks on data; content-page edits.

## Acceptance Criteria

- [ ] About 25 templates, each with a parse test, and `gaps` lists the rest.
- [ ] Three realistic routes pass the static chain check with empty `warnings`.
- [ ] Existing tests unchanged and passing.

## Verification

`cd app && npx vitest run && npx tsc -b`
