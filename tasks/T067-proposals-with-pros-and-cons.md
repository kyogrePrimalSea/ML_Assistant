# T067 — Proposals with pros and cons

**Status:** Backlog

## Objective

For each stage, produce a short list of proposed steps with pros and cons text for tooltips (spec §8.1).

## Context

Pros and cons must come from page data (`use_avoid.use_when/avoid_when`, `intuition.good_at/bad_at`, `catch_outs`), never written fresh. Proposals are ranked by compatibility mark (green first), then by fit to the profile. At most 4 per stage. A "full list" accessor returns every item of the stage with its mark.

**Epic:** E15

## Dependencies

- T066

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/build/proposals.ts`: `proposeForStage(stage, picks, profile, records): Proposal[]` and `fullList(stage, picks, profile, records): Proposal[]`, with `Proposal = {id, name, mark, pros: string[], cons: string[], reasons}`.
- `app/src/build/proposals.test.ts`: fixtures for at least model-driven transform proposals and a split-stage proposal for time-ordered data (random K-fold must not be proposed first).

### Rules and Invariants

- Pros/cons strings are copied from record fields, at most 3 each, trimmed to one line. If a record has none, return empty arrays (the UI shows "no summary yet"); do not invent.

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
