# T069 — Question flow 2: recommend a model from data and goal

**Status:** Done

## Objective

For users without a model: questions about the prediction wanted and the data produce a short list of model proposals with pros and cons (spec §8.1 flow 2).

## Context

Use only fields the model pages already carry (`rules.task_types`, `blocked_when`, `fits_on_data`, `tracks`, `use_avoid`, `shape_effect`). Data questions include row/column balance (more columns than rows), size, missing values, categories, time order, imbalance, interpretability need. If the pages lack a field a question needs (e.g. class count), STOP that question and report; do not invent field values.

**Epic:** E15

## Dependencies

- T066
- T068

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/build/flow2.ts`: `recommendModels(answers, records): Proposal[]` (reuses `Proposal` from T067 and marks from T066; red models are excluded from the short list but remain in `fullList('model', ...)`).
- `app/src/build/flow2.test.ts`: wide data (more columns than rows) deprioritises models that need more rows than columns where pages say so; time-ordered data never proposes models blocked for the time-series track.

### Rules and Invariants

- Ranking is deterministic and explainable: each proposal lists which answers made it green or yellow.

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
