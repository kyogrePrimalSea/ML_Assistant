# T024 — Relationship lines on demand (radial tree)

**Status:** Backlog

**Epic:** E04

## Objective

Add spec §7.1's "relationship lines on demand" to the radial tree.

## Context

Spec §5.3 (types), §7.1 ("What does XGBoost need?" draws curved lines through the
centre to related items, styled by type, with a legend), §10.5 (dash pattern primary
cue, colour secondary, legend with icons). Data: `relationships` in
`public/data/index.json` (derived from schema; never hand-written). Tokens for line
styles exist (T016 styleguide shows them).

## Dependencies

- T023

## Implementation Contract

### Outputs

- In the panel header of any page with a record: a "Show connections" control with
  per-type toggles (Needs, Recommended, Clashes, Alternative to, Pairs with).
- `app/src/views/RelationshipLines.tsx`: draws curved paths (through/near the centre)
  from the selected item to each related node; if the target node is hidden
  (collapsed branch), the line ends at its nearest visible ancestor (stage or family)
  and the endpoint is labelled with the target name. Family-level targets (prep refs
  to a family) end at the family node.
- Legend (icon + dash sample + label) visible while lines are shown.
- Lines respect reduced motion (no draw-on animation); keyboard accessible toggles;
  a text list of the same connections in the panel for screen readers.
- Tests: XGBoost shows its Needs/Clashes/Pairs-with lines; toggling a type hides it.
  Screenshot at 1440 light/dark.

## Acceptance Criteria

- [ ] Lines, legend and toggles work for every page with a record; tests and e2e pass.

## Verification

`cd app && npm run lint && npm test && npm run build && npm run e2e`
