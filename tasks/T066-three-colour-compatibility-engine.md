# T066 — Three-colour compatibility engine

**Status:** Done

## Objective

Give every pick, and every candidate in the full list, a green / yellow / red compatibility mark against the chosen model and the other picks (spec §8.1).

## Context

Existing `validate.ts` already derives Block / Warn / Tip from page fields. Green = nothing fired. Yellow "?" = Warn or Tip (tooltip says which). Red = Block. Block can be overridden with a one-line acknowledgement.

**Epic:** E15

## Dependencies

- None

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/build/compat.ts`: `type Mark = 'green'|'yellow'|'red'`; `markFor(candidate, picks, profile): {mark, severity: 'none'|'tip'|'warn'|'block', reasons: Issue[]}` implemented by calling the existing `validatePipeline` on `picks + candidate` and keeping the issues about the candidate; `markAll(candidates, picks, profile)`; `overall(marks)` returns the worst.
- `app/src/build/compat.test.ts`: the spec §7.3 behaviour examples (XGBoost + scaling gives yellow; Ridge removes it; no encoder with categories is red; early stopping with random forest is red; leakage is yellow), plus green when nothing fires.

### Rules and Invariants

- Pure functions; no UI. Reuse `validate.ts`; do not copy its rules.
- Every non-green mark carries at least one reason with the "Why" link target (`sourceId`).

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
