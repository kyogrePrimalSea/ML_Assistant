# T033 — E12 acceptance and deploy

**Status:** Backlog

**Epic:** E12

## Objective

Check E12 end to end against `docs/BRIEF_DESIGN_REVIEW_1.md` §2 (F3–F10) and the A4, A8, A9
and A10 parts of §6, then deploy. Run by the coordinator.

## Dependencies

- T028, T029, T030, T031, T032.

## Checks

- Clean `npm ci`: lint, unit, build, full e2e (1440 and 1024, light and dark, axe). Pytest,
  validator (0 errors, no long-line warnings), coverage.
- `#/page/n-estimators`: real hero animation, working slider, connections to learning rate and
  early stopping, and "Used by".
- `#/page/xgboost`: one Model badge with a stage dot; readable defaults; code wraps rather than
  clipping; numbers not in Mono; the What comes out slot with a working threshold slider.
- Phone width (600px): the sheet is titled with the page name.
- Before and after screenshots from T030–T032 are listed in `state/runs.jsonl`.
- Push to `main`; the deploy run is green; live smoke test on
  `https://kyogreprimalsea.github.io/ML_Assistant/`.

## Acceptance Criteria

- [ ] Every check above passes, and the deploy is green.
- [ ] `state/backlog.json` shows E12 Done, and there's a summary for the user of what to look at.
