# T044 — E05 acceptance and deploy

**Status:** Backlog

**Epic:** E05

## Checks (main session)

- Every taxonomy page has a record; no `TODO`s; validator 0 errors and 0 warnings; pytest
  passes; app lint, unit, build and e2e pass.
- The coordinator's spot-review log covers at least 2 pages per batch.
- `content/derived/relationships.json` is regenerated.
- Commits are per stage. Push, deploy is green, live smoke test.
- The user reviews stage by stage afterwards (`reviewed` flags are theirs to set).
