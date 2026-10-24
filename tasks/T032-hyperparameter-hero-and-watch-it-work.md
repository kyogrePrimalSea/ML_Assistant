# T032 — Hyperparameter hero and slider-driven Watch it work (F3)

**Status:** Ready

**Epic:** E12

## Objective

Replace the dashed placeholders in **Solves** and **Watch it work** on the four hyperparameter
pages (`n-estimators`, `max-depth`, `learning-rate`, `early-stopping`) with a real hyperparameter
hero cutscene and a working slider example. Then give the four boosting model pages a working
Watch it work.

## Context

- Spec §4 (Hyperparameter hero: behaviour change plus underfit/overfit curve), §5.1 slots 2 and
  10, §9 (cutscenes: code-driven, data-driven, illustrative, play once ≤ 1.2s, no loops, replay
  button, reduced motion means a static end frame), §10.7 (motion), §11.
- Existing engine: `app/src/cutscenes/CutscenePlayer.tsx`, `types.ts`,
  `scenes/BoostingFit.tsx`; data from `tools/gen_boosting_cutscene.py` →
  `content/cutscenes/boosting-fit.json`, copied by `app/scripts/build-content.mjs`. Follow
  that pattern (GSAP 3.15, already installed; D3 is available).
- Slots: `app/src/page/slots/Solves.tsx`, `WatchItWork.tsx`. Records already carry
  `solves.hero` (`{kind: hyperparameter, dataset: ames, sweep: [...]}`) and
  `watch_it_work.control` (`{name, min, max, step, default}`). **Don't edit content records**
  (T029 owns them). If a control range must change, say so in the run log and the coordinator
  will apply it.

## Dependencies

- None. It runs in parallel with T028 and T031.

## Implementation Contract

### Data

`tools/gen_hyperparameter_scenes.py` (seeded, byte-identical reruns, `.venv/bin/python` from the
project root) writes one file per hyperparameter page under `content/cutscenes/` (for example
`hyper-n-estimators.json`), using the synthetic Ames-like sample from
`tools/gen_boosting_cutscene.py` (living area → price) and a held-out validation part:

- `sweep_values`: the values for the slider, matching the record's control range. Thin it for
  size (for example n_estimators 1…200 sampled at about 40 points); the slider snaps to the
  nearest stored value.
- For each value: `train_error` and `val_error` (RMSE, rounded), and `fit` (the model's
  predicted price on a fixed x grid of about 48 points).
- `best`: the value with the lowest validation error, so the curve can mark the "sweet spot".
- Use scikit-learn `GradientBoostingRegressor` for all four pages, so one library carries the
  shape story (record this in the file as `"illustrative_library"`):
  - n_estimators: vary `n_estimators` (use `staged_predict`).
  - max_depth: vary `max_depth` 1…16.
  - learning_rate: vary `learning_rate` across the control range, with fixed rounds.
  - early stopping: one long run with staged validation error, plus the stopping round for
    each patience value in the control range (`n_iter_no_change`-style patience computed on
    the staged validation curve).
- The boosting model pages reuse the `hyper-n-estimators.json` data for their Watch it work.
  Their control is n_estimators or `max_iter`, 1…200.

### Hero (Solves) for archetype `hyperparameter`

- Two linked panels: the **behaviour** (data points plus the fit line at the current value),
  and the **under/overfit curve** (train and validation error against the setting, with
  "Underfit" and "Overfit" regions labelled in text and the best value marked).
- On open, it plays once through the record's `hero.sweep` values (≤ 1.2s total), ending on
  the last sweep value. Replay button. With reduced motion, it shows a static end frame.
- Lines are distinguished by dash and label, not colour alone: train solid and validation
  dashed, with a legend.
- Register it in the CutscenePlayer the same way BoostingFit is registered, keyed by the page or
  the hero kind. A hyperparameter page without a data file keeps the placeholder `Frame`.

### Watch it work (slider)

- `WatchItWork` renders a real slider (shadcn/Radix Slider) from `control` (name as the label
  in inline code, min, max, step, default). Moving it updates the same two-panel visual for
  that value instantly: no animation while dragging, and reduced motion is respected. The
  value appears in Atkinson with tabular figures (A8).
- A short status line reads the state in words, for example "Validation error is rising:
  overfitting", from where the value sits relative to `best`. Announce it politely
  (`aria-live`), throttled so dragging doesn't spam it.
- Pages whose `watch_it_work` has no data file show the existing placeholder `Frame`.

### Accessibility and layout

- The visual is an SVG with `role="img"` and an `aria-label` summarising it. The slider is
  fully keyboard operable. Use tokens only, AA contrast in light and dark, and no overflow at
  420px panel width or in the 1024 layout.

## Tests

- Python: the generator output shape (lengths match, `best` is in `sweep_values`), and the
  rerun is identical (`tests/test_hyperparameter_scenes.py`).
- Unit: the slider changes the rendered fit for a fixture, and the status text changes across
  `best`. The hero renders the static end frame under reduced motion.
- e2e at 1440 and 1024: `#/page/n-estimators` has no dashed placeholder in Solves or Watch it
  work; the keyboard moves the slider; axe passes. Use `--output /tmp/pw-T032`.
- Save before and after screenshots of `n-estimators` and `xgboost` (Watch it work) at 1440 dark
  and 1024 light under `/tmp/e12-shots/T032/`.

## Acceptance Criteria

- [ ] All four hyperparameter pages show a real hero and a working slider. All four boosting
      pages show a working Watch it work slider.
- [ ] `.venv/bin/python -m pytest -q`, plus `cd app && npm run lint && npm test && npm run build && npx playwright test --output /tmp/pw-T032`, all pass.
- [ ] No content records are changed.
