# T023 — Radial tree view (Lookup)

**Status:** Backlog

**Epic:** E04

## Objective

Replace the interim catalogue list in the Tree view with the D3 radial tree from
spec §7.1, with positions computed once and stored with the content.

## Context

Spec §3.3, §3.6 (semantic zoom), §7 intro (positions computed once and stored; never
re-simulated), §7.1, §10.4–10.7, §11 (keyboard, screen-reader labels, reduced motion).
The catalogue list (`app/src/views/CatalogueList.tsx`) stays available as an
accessible list alternative (toggle "Tree | List" inside the view).

## Dependencies

- T020

## Implementation Contract

### Outputs

- `app/scripts/layout-radial.mjs` (run in `predev`/`prebuild` after build-content):
  deterministic positions for track › stage › family › item for every track, written
  to `content/derived/layout-radial.json` (committed) and copied into
  `public/data/`. Stable ordering (pipeline order for stages; alphabetical families
  and items) so adding a page doesn't move others more than necessary. The app
  never computes layout at runtime.
- `app/src/views/RadialTree.tsx` (D3 for scales/paths/zoom; React renders SVG):
  centre = current track; stages around it (stage colour dot + icon); opening a stage
  shows its families, opening a family shows its items (semantic zoom — never all
  items at once); accordion (opening a branch closes siblings); zoom-to-fit the opened
  branch (600–900ms flight, spec easing; jump when reduced motion); labels always
  horizontal with a background halo, Atkinson; focused node soft glow (§10.6);
  selecting an item opens the panel (`#/page/<id>`), pages without records still
  open a "not written yet" panel state.
- Keyboard: arrow keys move between siblings/levels, Enter opens, Esc collapses;
  every node has an accessible name ("Model stage, 34 pages", "XGBoost, model").
- Track switch re-centres using stored positions.
- Unit tests for the layout script (deterministic, every page placed once per
  track it belongs to) and component tests; Playwright: open Model › Boosting
  (XGBoost) › XGBoost by mouse and by keyboard; screenshots at 1440/1024 light/dark.

### Rules

- `d3`, `@types/d3`, `gsap`, `globe.gl`, `three`, `@types/three` are pre-installed; add nothing else.
- Don't edit `app/src/page/` or the content pipeline beyond adding the layout step.

## Acceptance Criteria

- [ ] Spec §7.1 behaviours (except relationship lines — T024) work at 1440 and 1024.
- [ ] Layout is deterministic and stored; lint, tests, build, e2e pass.

## Verification

`cd app && npm run lint && npm test && npm run build && npm run e2e`
