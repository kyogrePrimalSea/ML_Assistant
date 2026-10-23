# T027 — E04 acceptance and deploy

**Status:** Backlog

**Epic:** E04

## Objective

Confirm the Boosting slice end to end (spec §13 step 3 "tests every system early"),
deploy, and prepare the user review.

## Dependencies

- T022, T023, T024, T025, T026

## Steps (coordinator-run)

1. Clean install, full app + Python checks.
2. Walk the slice at 1440 and 1024, light and dark: tree → Boosting → each page →
   connections → cutscene → journey → notebook download.
3. Push; confirm the deploy and the live site.
4. Write `state/sprint-2-summary.md` and update `docs/OPEN_QUESTIONS.md`.

## Acceptance Criteria

- [ ] All checks pass; live site shows the slice.
