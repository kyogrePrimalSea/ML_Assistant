# T018 — Desktop layout shell and navigation

**Status:** Backlog

**Epic:** E03

## Objective

Build the app shell from spec §7.4: top bar, canvas area and side panel (bottom
sheet below 900px), with routing that opens a page in the panel.

## Context

Spec §7.4 (layout), §3.1–3.3 (stages, tracks, hierarchy), §7 intro (three views;
positions never move), §10.6 (static star field on canvas), §10.7 (motion), §11
(keyboard navigation). Memory note: the user designs and reviews at 1440 and 1024px
wide; phone width is secondary. Tokens/components from T016, data hooks from T017.

## Dependencies

- T016, T017

## Implementation Contract

### Outputs

- `app/src/shell/TopBar.tsx`: app name; search trigger button showing "Search" and
  the Ctrl/Cmd+K hint (opens an empty command dialog for now — search is E06); track
  selector (tracks from vocab; later-wave tracks shown disabled with "later" label);
  view switcher Tree / Constellation / Journey (Tree active; others show a "coming
  soon" empty state); theme toggle (light/dark/system); accessibility settings button
  (opens an empty sheet titled "Reading settings" — E10 fills it).
- `app/src/shell/Layout.tsx`: canvas left (~60%), panel right (~40%, min 420px, max
  560px), independent scrolling; below 900px the canvas is full screen and the panel
  is a bottom sheet. Panel open/close 240ms with the spec easing; reduced motion respected.
- `app/src/shell/StarField.tsx`: deterministic sparse star field on `--canvas`
  (seeded, ~1–2% opacity dots, never animated).
- `app/src/views/CatalogueList.tsx`: interim Tree-view placeholder until E04/E06's
  radial tree: stages in pipeline order (stage badge), families collapsed by default
  (accordion), items listed with archetype icon, plain name and code name; pages with
  a content record are links; others are shown muted with "not written yet". Filtered
  by the selected track.
- Routes (`HashRouter`): `#/` (shell), `#/page/:id` (shell + panel open on that page;
  panel content is a placeholder `<PagePanel id>` that T019 replaces), `#/styleguide`
  (keep T016's route).
- Keyboard: tab order top bar → canvas → panel; Esc closes the panel; Ctrl/Cmd+K
  opens the search dialog; visible focus everywhere.
- Playwright test: open `#/`, expand Model › Boosting (XGBoost), open XGBoost, panel
  shows the page id; at 800px wide the panel is a bottom sheet. Screenshots at 1440
  and 1024 in light and dark saved to `app/test-results/screens/` (not committed).

### Rules

- Only edit `app/src/shell/`, `app/src/views/`, `app/src/App.tsx`, `app/src/main.tsx`,
  a placeholder `app/src/page/PagePanel.tsx`, and tests. No new npm dependencies.

## Acceptance Criteria

- [ ] Layout matches §7.4 at 1440 and 1024; bottom sheet below 900.
- [ ] All 9 stages and every inventory page reachable in the list; track filter works.
- [ ] Keyboard-only navigation works; lint, unit tests, build and e2e pass.

## Verification

`cd app && npm run lint && npm test && npm run build && npm run e2e`
