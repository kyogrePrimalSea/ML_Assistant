# T065 — Shared variable vocabulary and notebook v2

**Status:** Done

## Objective

Produce notebook output where each cell's output is the next cell's input, by giving every template one shared variable vocabulary (spec §8.1).

## Context

Spec §8.1 table: `df, target, X, y, X_train, X_test, y_train, y_test, numeric_cols, categorical_cols, preprocess, model, y_pred, y_proba, cv, scores`. User edits only the first cell (file path, `target`, column lists), each with a TODO comment saying what to call it. Fixed templates stay deterministic. Do not run notebooks on toy datasets (user decision); chaining is guaranteed by names only.

**Epic:** E15

## Dependencies

- None

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/build/vocab.ts`: the table above as data (`VOCAB: {name, holds, producedBy: StageId, consumedBy: StageId[]}[]`).
- `app/src/build/notebookV2.ts`: `buildNotebookV2(picks, profile): Notebook` (same `Notebook` shape as `notebook.ts` so the existing download code can serve it), first cell = data-loading cell with TODOs, then one cell per stage in `STAGE_ORDER`, each cell reading only names produced by earlier cells and writing its own name, a comment line above each section.
- `app/src/build/notebookV2.test.ts`: per-stage tests, plus a static chain check: parse each cell for names it reads and assert each was assigned in an earlier cell; and that the generated code parses (no execution).
- Code lines come from the pages' existing code snippets or fixed templates; never write library facts from memory. If a pick has no usable template, emit a cell with a TODO and list it in the returned `gaps`.

### Rules and Invariants

- Names are only from the vocabulary; a new name needs an edit to `vocab.ts` first.
- Same inputs give byte-identical output.
- Relative paths only; no secrets.

## Demo safety (hard rules for this task)

The current Build/Journey view is being demoed. It must keep working unchanged.
- Add NEW files. Do not change the exported names, signatures or behaviour of
  `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `demoPipeline.ts`,
  `app/src/views/Journey.tsx`, `JourneyGlobe.tsx`, `NotebookView.tsx`, or any existing
  `*.test.ts(x)`. If a change to one of them seems necessary, STOP and report it.
- Work only on branch `feature/globe-build`. Never merge to `main` or push.
- Before reporting done run `cd app && npx vitest run` and `npx tsc -b`; every test that
  passed before must still pass. Report the counts.

## Scope

### In Scope

- The outputs above only.

### Out of Scope

- Any change to existing public behaviour; animations; content-page edits; `reviewed` flags.

## Acceptance Criteria

- [ ] All outputs exist and are unit-tested.
- [ ] `cd app && npx vitest run` and `npx tsc -b` pass; no previously passing test changed or removed.
- [ ] No existing file listed in the demo-safety rules was modified.

## Verification

`cd app && npx vitest run && npx tsc -b`; `git diff --stat main` lists only new files plus any allowed minimal edits.
