# Sprint 2 summary (E03–E04), 2026-10-24

Status: complete. E03 and E04 Done. 13 tasks (T015–T027), all reviewed and committed.
Live: https://kyogreprimalsea.github.io/ML_Assistant/ (GitHub Pages, deployed on push to `main`).

## What exists now

- **App** (`app/`): Vite + React + TypeScript static PWA. It works offline after the
  first load, deep links use the `#/...` form, and fonts are self-hosted.
- **Observatory design system:** spec §10 tokens for light and dark (follows the
  system, with a manual override), all text pairs at WCAG AA (3 in-hue adjustments in
  `docs/DESIGN_ADJUSTMENTS.md`), restyled shadcn components, a styleguide at
  `#/styleguide`.
- **Shell:** top bar (search trigger, track selector, view switcher, theme, reading
  settings placeholder), canvas plus side panel, and a bottom sheet below 900px.
- **Item pages:** all 11 slots rendered from the content records, with code tabs, key
  settings tiers and effective defaults ("None → 6").
- **Radial tree:** layout stored in `content/derived/layout-radial.json`; accordion,
  zoom to fit, keyboard and screen-reader access, and a List alternative.
- **Relationship lines:** "Show connections" per page; spec dash styles, a legend, and
  a text list in the panel.
- **Cutscene:** the boosting fit line forms over 5 trees (GSAP, ≤1.2s, replay,
  reduced motion handled).
- **Journey:** demo pipeline on a globe (passport, regions, stops, coloured legs,
  tickets with data shape, a one-tap fix, play once) leading to a notebook view and
  `.ipynb` download. The output is deterministic and tested by executing it in Python.
- **Validation rules:** all six spec §8 rules in `app/src/build/validate.ts`, derived
  from record fields.
- **Content:** 20 records, all `reviewed: false`. They cover the 4 boosting models,
  hyperparameter pages, an example for each archetype, and the demo's encoder, split
  and metric pages.

## Checks

App: 247 unit + 48 e2e (1440 and 1024, axe, label-overlap checks). Python: 1659 tests,
validator 0 errors, coverage OK. CI runs lint, test and build before every deploy.

## Needs you

- Walk the live site at 1440 and 1024: open the tree, then Model › Boosting (XGBoost),
  then XGBoost. Try Show connections, Journey and the notebook download.
- `docs/OPEN_QUESTIONS.md`: items 1–13 from Sprint 1 plus 14–21 from this sprint.
- Review the 20 draft pages in `content/items/`.

## Next

E05 (fill content stage by stage) and E06–E10. Tasks for those aren't written yet.
