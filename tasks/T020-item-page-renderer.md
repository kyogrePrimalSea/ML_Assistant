# T020 — Item page renderer (the 11 slots)

**Status:** Backlog

**Epic:** E03

## Objective

Render any content record as a page in the panel, drawing all 11 slots in fixed
order from the page JSON (spec §5: "every page is a filled-in form… the app draws
pages from the forms").

## Context

Spec §5.1 (slots, order, "None" for empty, tiers, collapsed intuition, model
variant), §4 (archetype icons and badges), §10 (styles), §11 (tags over sentences,
plain English first, code names underneath). `docs/CONTENT_SCHEMA.md` and
`app/src/content/types.ts` for the data. Components: StatusChip, Callout,
StageBadge (T016), CodeTabs (T019). Shell and `PagePanel` placeholder (T018).

## Dependencies

- T018, T019

## Implementation Contract

### Outputs

- `app/src/page/PagePanel.tsx` (replace placeholder) and one component per slot in
  `app/src/page/slots/`: Header, Solves, QuickFacts, UseAvoid, Prep, Code, CatchOuts,
  KeySettings, WatchItWork, Intuition, Next.
- Header: archetype icon (Tabler, from vocab), plain name, code name underneath in
  mono, archetype badge, stage badge, `reviewed: false` shown as a quiet "Draft" chip.
- Solves: one line + hero area. The hero visual is a placeholder frame labelled with
  the hero kind (cutscenes are E09).
- Prep: each entry as a row with status chip Required / Recommended / Not needed
  (distinct icons; not severity colours), the `why`, condition shown as plain tags
  ("if: has categoricals"), `unless` shown as "unless enable_categorical=True"; step
  links go to `#/page/<id>` (family refs link to the first page of that family in the
  catalogue list or show the family name if none).
- Code: CodeTabs. CatchOuts: Warn callout directly after Code.
- KeySettings: Tier 1 visible; Tier 2 behind one "More settings" tap; Tier 3 in a
  collapsed section. Each setting shows name, default (and effective default when
  set: "None → 6 (booster default)"), linking to its page when `page` is set.
- WatchItWork: placeholder frame naming dataset and slider (E09 builds it).
- Intuition: collapsed by default; model variant shows one idea, analogy, animation
  placeholder, good at / bad at tags, vs siblings, and a nested collapsed "Read
  more" with numbered steps.
- Next: question chips (question text) — link to `#/question/<id>` placeholder route.
- Every slot always renders; an empty slot shows "None".
- Loading and error states; unknown page id → friendly not-found.
- Tests: render each of the 11 current records (from `public/data` built by the
  content script) without errors and with all 11 slot headings in order; XGBoost
  shows `max_depth` with effective default 6 and the prep rows of spec §5.4.
- Playwright: screenshots of XGBoost, StandardScaler and `max-depth` pages at 1440
  and 1024 in light and dark (to `app/test-results/screens/`), plus an axe check on the
  XGBoost page with no serious/critical violations.

### Rules

- Only edit `app/src/page/`, routes in `App.tsx` for the question placeholder, and tests.
- Max reading width 68ch in the panel; no drop shadows; left-aligned; sentence case.
- No new npm dependencies.

## Acceptance Criteria

- [ ] All 11 example records render with 11 slots in order; empty slots say "None".
- [ ] Spec §5.4 visible on the XGBoost page; axe clean; lint, tests, build, e2e pass.

## Verification

`cd app && npm run lint && npm test && npm run build && npm run e2e`
