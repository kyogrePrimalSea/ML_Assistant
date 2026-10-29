# T068 — Question flow 1: narrowing steps for a chosen model

**Status:** Backlog

## Objective

After the user picks a model, a short question set narrows each stage's steps; answers fill the Passport (spec §8.1 flow 1).

## Context

Questions narrow, never decide. Read existing question files in `content/questions/` and `docs/QUESTION_MAP.md` before adding anything; reuse their ids and wording style. Passport fields: task_type, track, has_categoricals, has_missing, time_ordered, imbalanced (see `DataProfile`).

**Epic:** E15

## Dependencies

- T066

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/build/flow1.ts`: `nextQuestion(model, answers): Question|null`, `applyAnswers(answers): DataProfile`, `narrow(stage, answers, model, records): string[]` (ids kept after narrowing; never empty: fall back to the full stage list).
- `content/questions/build-profile.yaml` only if no existing file covers the profile questions; it must pass `.venv/bin/python -m tools.validate_content`.
- `app/src/build/flow1.test.ts`.

### Rules and Invariants

- Skipping a question leaves its Passport field unset (treated as unknown, no rule fires on it).
- 3 to 4 questions maximum before the first proposals appear.

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
