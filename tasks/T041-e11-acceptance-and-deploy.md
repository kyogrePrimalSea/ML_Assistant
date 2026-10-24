# T041 — E11 acceptance and deploy

**Status:** Backlog

**Epic:** E11

## Objective

Check E11 against `docs/BRIEF_DESIGN_REVIEW_1.md` §6 (tree, toggle and goal checks), then
deploy. Run by the coordinator.

## Dependencies

- T034–T040.

## Checks

- Clean `npm ci`: lint, unit, build, full e2e (1440 and 1024, light and dark, axe). Pytest,
  validator, coverage.
- Model on every goal: at most 7 options anywhere; opening a branch keeps it attached and fanned;
  the other stages keep their labels.
- Flip Names ↔ Questions on any node: nothing moves; the centre asks a question; the breadcrumb
  reads as a chain.
- Goal switch from "Predict a number" to "Sort things into categories": classification families
  appear (Rebalance in Transform), and the stages stay put.
- `docs/OPEN_QUESTIONS.md` lists every allow-listed rule exception, contradicted `pick_when` and
  unverified answer.
- Push, green deploy, live smoke test.

## Acceptance Criteria

- [ ] All checks pass and the deploy is green; E11 is Done in `state/backlog.json`; there's a
      summary for the user.
