# T038 — Content index and per-goal radial layouts with the fan (A5)

**Status:** Backlog

**Epic:** E11

## Objective

Ship the taxonomy to the app and precompute one stored radial layout per goal view. Opened
children fan outward from their parent, attached by links (spec §7.1, A2, A5; fixes F1 and F2).

## Context

- `app/scripts/build-content.mjs` (writes `public/data/index.json`) and
  `app/scripts/layout-radial.mjs` (today: columns, per track, into
  `content/derived/layout-radial.json`). The app never computes layout at runtime (spec §7).
- `content/taxonomy.yaml` (T034) and the goal-view algorithm in `docs/CONTENT_SCHEMA.md` (T035).
  The JS must produce the same views as `tools/taxonomy.py`; add a test that compares the node
  ids per goal against a Python-exported fixture.
- Today's tree: `app/src/views/RadialTree.tsx`, `radialFit.ts`, `radial-tree.css`. T039 rewrites
  the rendering. This task owns the data and geometry, with a minimal adapter so the current
  tree keeps working on the new layout until T039 lands. If an adapter is impractical, coordinate
  through the run log: T039 runs right after.

## Dependencies

- T034, T035.

## Implementation Contract

### Index

`index.json` gains `taxonomy`: goals, root/goal prompts, and per goal the elided view tree. Each
node has `{id, level: stage|group|family|page, names_label, question_label, question_sentence,
question_prompt|null, children}`, already resolved for that goal. Pages also carry `shown_as`
and `pick_when`. Inventory page entries keep their fields; `stage` and `family` now come from
the taxonomy.

### Layout (`content/derived/layout-radial.json`, version 2)

- One layout per goal id. Within a goal, stages sit at the same ring angle in every goal (9
  fixed slots, pipeline order clockwise from the top). An empty stage is flagged `empty: true`
  (rendered dimmed, "Not used for this goal").
- For every non-page node with children, store the positions of its children **for the state
  where that node is open**: a fan centred on the node's own angle, outward from it, with a
  visible link from parent to each child. Never a detached column or a comb to one side. This
  applies at every level: stage → group → family → pages.
- Fan geometry is yours to choose. These are invariants, and tests must check them:
  - children of an opened node sit farther from the centre than the node;
  - each child's angle lies within a sector around the parent's angle; the sector width grows
    with the child count and is capped at about 120°;
  - horizontal labels never overlap: label boxes are estimated from text length at the canvas
    label font size, for **both** label sets (Names and Questions, including the two-line
    wrap of a ≤ 40-character `question_label` and a page's `pick_when` second line). Check
    every goal and every open path;
  - the other eight stage labels stay visible (dimmed) and don't overlap the opened fan.
    Resolve collisions in the layout (push the fan outward, adjust the radius, nudge ring
    labels), never by hiding labels;
  - the positions are identical for Names and Questions, so toggling moves nothing. Size the
    boxes for the larger of the two label sets.
- For each open path, store a zoom-to-fit box (the bounding box of the stage ring plus the
  opened path), so the app frames it without runtime layout.
- Deterministic output, committed. The `predev`/`prebuild`/`pretest` hooks keep running it.

## Tests

- Node or Vitest tests for the invariants above, over all 3 goals and every open path (root →
  each stage → each group → each family): no overlaps, outward, within sector, ≤ 7 children,
  and fixed stage angles across goals.
- The JS goal views equal the Python fixture.

## Acceptance Criteria

- [ ] The layout file holds 3 goal layouts; every invariant test passes.
- [ ] `cd app && npm run lint && npm test && npm run build` pass.
- [ ] The run log has a rendered sanity image or SVG dump of Model › Trees (Predict a number) and
      Transform › Rebalance (Sort things into categories), saved under `/tmp/e11-shots/T038/`.
