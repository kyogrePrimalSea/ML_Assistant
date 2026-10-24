# T040 — Search across both label sets and the symptom questions

**Status:** Backlog

**Epic:** E11

## Objective

Global search matches Names labels, Questions labels, `question_sentence`, `pick_when`, aliases,
code names and the symptom questions, including `we_need_but` (spec §3.5, A3).

## Context

- The existing search dialog is opened from `app/src/shell/TopBar.tsx` (find its component and
  index). The data is `index.json` (`taxonomy`, `pages`, `questions`).
- Results show stage and goal or track. Selecting a page flies the tree to it: the open path is
  set from the taxonomy view, and the panel opens. Selecting a group or family opens that node
  in the tree. Selecting a question opens a small result panel listing its answers (links to
  the pages, with `setting` and `note` where present). Drawing question → answer lines is E06,
  not this task.
- Respect the current goal. Results outside the goal view are shown in a separate "Other goals"
  group, with a switch-goal action, and are never hidden silently.

## Dependencies

- T036, T039.

## Implementation Contract

- Index each taxonomy node (group, family, page) for every field above, and each question by
  `text` and its stem's name. Use the fuzzy library already in the app, or add MiniSearch or
  Fuse.js if there's none. If you add a dependency, pin the exact version and record it in
  `docs/ARCHITECTURE.md`.
- Results show the label in the current mode, plus a muted second line (the other mode's label,
  or the `pick_when`), the stage icon and colour, and the goal.
- Keyboard: arrow keys, Enter and Escape. The result count is announced politely.

## Tests

- Unit: "overfit" finds `model-overfitting`; "outliers" finds `robustscaler` (by `pick_when`)
  and `model.awkward.robust` (by label); "max_depth" finds `max-depth`; "We need XGBoost" finds
  `but-xgb-text`; a forecast-only page searched in the Predict a number goal appears under
  "Other goals".
- e2e: Ctrl+K, type "rare class", Enter on a question, see its answers; axe on the dialog.

## Acceptance Criteria

- [ ] `cd app && npm run lint && npm test && npm run build && npx playwright test --output /tmp/pw-T040` pass.
