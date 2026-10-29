# T072 — Build view polish (globe labels, ranking, layout, wording)

**Status:** Backlog

**Epic:** E15

## Objective

Fix the four problems found in the first Build (beta) screenshots (1440 and 1024), without touching the existing Journey view.

## Context

User review of `#/build`: (1) globe stage labels overlap and say "(skipped)" while the user is still choosing; (2) first Transform proposal was `add_dummy_feature` because ties sort alphabetically; (3) at 1024 wide with both panels open the options column is about 324px; (4) the globe says Valid/Warning/Blocked while panels say Compatible/Not recommended/Incompatible.

## Dependencies

- T070

## Implementation Contract

1. **Globe labels:** do NOT edit `JourneyGlobe.tsx` (used by the demoed Journey view). Create `app/src/views/BuildGlobeCanvas.tsx` that renders the globe for Build only (copy what is needed, reuse `journey.ts` positions by import). Requirements: stage labels never overlap (fewer, shorter labels; show the stage name only, abbreviate or hide the lowest-priority labels as space requires, full name on hover/focus and in the stage stepper); stages with no pick read "Not picked yet", never "(skipped)", unless the user chose to skip that stage (add a Skip button per optional stage: Clean, Select, Tune, Interpret, Explore); globe is larger (fills the available left column height).
2. **Ranking:** in `app/src/build/proposals.ts`, within equal mark, rank pages that have a notebook template (`TEMPLATED_PAGE_IDS` from notebookV2.ts) before pages that do not, then profile fit, then the existing stable order. No new content facts. Keep existing tests passing; add tests (a templated page outranks an untemplated one at equal mark; a yellow templated page does not outrank a green untemplated page). In the UI, mark templated proposals with a small "Notebook code ready" label (icon plus text) and non-templated with "Notebook cell: TODO".
3. **Layout at 1024:** when both the journey panel and the page panel are open, the page panel overlays the journey panel (instead of squeezing the workbench), keeping the globe and options at least 480px wide; at 1440 the three columns stay. Verify both widths with Playwright screenshots in `app/test-results/screens/`.
4. **Wording:** one vocabulary everywhere in Build: Compatible (green tick), Not recommended (yellow ?), Incompatible (red cross). Globe stops use the same words in their labels and tooltips.

## Demo safety (hard rules)

- New/edited files only: `BuildGlobeCanvas.tsx`, `BuildGlobe.tsx`, `BuildPanel.tsx`, `BuildGlobe.css`, `buildModel.ts`, their tests, `app/e2e/build.spec.ts`, and `app/src/build/proposals.ts` + test (ranking only; same exports).
- Do not change `JourneyGlobe.tsx`, `Journey.tsx`, `validate.ts`, `journey.ts`, `journey.css`, or any existing Journey test/e2e.
- Branch `feature/globe-build`; no commit or push.

## Acceptance Criteria

- [ ] At 1440 and 1024 screenshots show no overlapping globe labels and no "(skipped)" for unpicked stages.
- [ ] Ranking tests pass; the first Transform proposal for a regression profile is a templated page.
- [ ] `cd app && npx vitest run && npx tsc -b && npx eslint .` pass, and `npx playwright test e2e/journey.spec.ts e2e/build.spec.ts` pass.

## Verification

Run the commands above; report screenshot paths.
