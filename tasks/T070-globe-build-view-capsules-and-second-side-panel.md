# T070 — Globe build view, capsules and second side panel

**Status:** Done

## Objective

A new Build view on the globe: entry choice (know my model / don't), questions, proposals with tooltips, "Choose from the full list", compatibility marks on the globe stops, a journey side panel with expandable capsules, a second side panel for page links, and notebook v2 download (spec §7.3 note, §8.1).

## Context

Reuse `JourneyGlobe.tsx` rendering code by import, not by editing it. The new view lives at a NEW route (`#/build`) and a NEW top-bar entry labelled "Build (beta)". The existing "Journey" view and route stay exactly as they are until the user decides to switch. Follow §10 tokens, §11 accessibility (icon plus label, never colour alone), desktop first (check 1440 and 1024).

**Epic:** E15

## Dependencies

- T065
- T066
- T067
- T068
- T069

## Relevant Files

- `docs/spec.md` §7.3, §8, §8.1, §10, §11
- `app/src/build/validate.ts`, `journey.ts`, `notebook.ts`, `shape.ts`
- `app/src/content/types.ts`, `docs/CONTENT_SCHEMA.md`

## Implementation Contract

### Outputs

- `app/src/views/BuildGlobe.tsx`, `BuildPanel.tsx` (capsules), `BuildGlobe.css`, tests, one e2e `app/e2e/build.spec.ts`.
- Minimal edits allowed in `App.tsx` and `TopBar.tsx` to add the route and entry only.
- Capsule write-ups are built from page data (idea / `solves.line`), with page links that open the page in the second panel.
- Notebook download uses `buildNotebookV2`.

### Rules and Invariants

- Existing Journey e2e (`app/e2e/journey.spec.ts`) must pass unchanged.
- Screenshot at 1440 and 1024 for the user (they review remotely).

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
