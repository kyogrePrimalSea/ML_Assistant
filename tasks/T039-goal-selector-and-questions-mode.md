# T039 — Goal selector, Names | Questions toggle, and the fanned tree

**Status:** Backlog

**Epic:** E11

## Objective

Replace the track selector with the goal question (A1), add the `Names | Questions` label toggle
(A3), and render the radial tree from the per-goal stored layout with the A5 fan.

## Context

- Spec §3.2 (goal table), §3.4 (Questions mode), §7.1, §7.4, §10.7, §11, plus
  `docs/QUESTION_MAP.md` §1 (how Questions mode works).
- `app/src/shell/{TopBar,ShellState,Layout}.tsx`, `app/src/views/{RadialTree,radialFit,
  RelationshipLines,connections}.tsx`, `radial-tree.css`, `app/src/views/CatalogueList.tsx`.
  Data: `index.json` `taxonomy` and `layout-radial.json` v2 (T038).
- **Positions come only from the stored layout.** No runtime layout, collision solving or
  force simulation.

## Dependencies

- T038.

## Implementation Contract

### Goal selector (top bar)

- The prompt is "What are we trying to do?" (visible label, or the accessible name if space is
  tight at 1024). The options are the 3 v1 goals, showing `question_label` in Questions mode and
  `names_label` in Names mode ("Standard · Regression").
- The goal replaces `track` in shell state. Expose `goal`, plus derived `track` and `task`,
  because the Passport (E08) and What comes out (default task, T030's prop) read them.
- Switching goals swaps the stored layout. The stages stay put, and an empty stage shows dimmed
  with "Not used for this goal". The open path resets to the root, or keeps the open stage if it
  still has children.

### Names | Questions toggle

- It sits where `Tree | List` sits now; a Radix ToggleGroup is suitable. The default is
  **Questions**. The choice is remembered in `localStorage` (key `mlfg.labels`) inside
  try/catch, and the app works when storage throws.
- Toggling changes text only. A test asserts that every node's `transform` and position are
  identical before and after the toggle.
- The `Tree | List` toggle leaves the top bar. Keep the list view reachable by a "Show as list"
  link in the tree canvas corner, because it is the screen-reader and keyboard fallback. Add
  this working default to `docs/OPEN_QUESTIONS.md`.

### Tree rendering

- Nodes, links and fans come from the stored layout for the current goal and open path. The
  accordion rule holds: one path open at a time. Zoom to fit uses the stored box, with flights
  of 600–900ms on the spec easing; with reduced motion it jumps.
- Labels are always horizontal, with the canvas label font and a halo:
  - Names mode: `names_label`.
  - Questions mode: `question_label`, wrapped to at most 2 lines.
  - Pages always show `shown_as`; in Questions mode `pick_when` appears underneath, muted.
  - Other stages stay labelled and dimmed while one is open (no hiding on hover).
- The centre shows, in Questions mode, the open node's `question_prompt`. With no open node it
  shows `root.question_prompt` "Where are we in the work?". If the open node has no prompt, it
  shows "Which one fits?" (a working default; add it to `OPEN_QUESTIONS.md`). In Names mode it
  shows the open node's `names_label`, or the goal's `names_label` at the root.
- The breadcrumb is a chain of labels in the current mode. In Questions mode it reads like
  "Predict a number › Get strong accuracy on tables › Get the best accuracy we can › XGBoost".
- Accessible names: each node's accessible name is its full `question_sentence`, in both modes.
  Pages get `shown_as` plus `pick_when`. The keyboard order follows the stored order. Enter or
  Space opens; Escape goes up one level.
- Selecting a page opens the panel, as today. Relationship lines on demand keep working on the
  new positions.
- The icons and colours are the stage colour plus icon, as today. Group and family nodes get
  the stage colour.

## Tests

- Unit: the goal switch changes visible families (C shows Transform › "Rebalance lopsided
  classes"; R doesn't); the toggle doesn't move anything; storage that throws still renders;
  the centre prompt is correct per mode; the breadcrumb chain is correct.
- e2e at 1440 and 1024, light and dark, with axe:
  - On each goal, open Model: at most 7 children; the fan is attached (each child has a link
    to its parent); the other 8 stage labels are visible.
  - Open Tune › "Know which settings matter" › "Control how long it learns": attached fan, no
    label overlaps. Add a bounding-box overlap check like the current e2e label-overlap test.
  - Flip Names ↔ Questions: node bounding boxes are unchanged.
- Save before and after screenshots (F1: Tune › boosting rounds; F2: Model on Predict a number;
  Questions vs Names; goal switch) under `/tmp/e11-shots/T039/`. Use `--output /tmp/pw-T039`.

## Acceptance Criteria

- [ ] The brief §6 tree checks pass by inspection and by the tests above.
- [ ] `cd app && npm run lint && npm test && npm run build && npx playwright test --output /tmp/pw-T039` pass.
