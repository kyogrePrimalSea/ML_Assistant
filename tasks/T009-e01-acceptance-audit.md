# T009 — E01 acceptance audit

**Status:** Backlog

**Epic:** E01

## Objective

Independently confirm E01 is complete: every Wave 1 item is inventoried, extracted
from the pinned version, and checked against its official doc page.

## Dependencies

- T006, T007, T008

## Implementation Contract

### Outputs

- `tools/coverage.py` — prints, per library and overall: inventory count, extraction
  count, verification status counts, overrides count, items with warnings; exits
  non-zero if any inventory item lacks an extraction record or a verification entry.
- `content/extraction/E01-REPORT.md` — the coverage table, all unresolved items,
  all `proposed` page groupings (for user confirmation), inventory issues raised by
  T006–T008, and an independent spot-check of 15 random items (fixed seed,
  recorded) compared field by field against their doc pages.

### Rules

- Read-only on everything except the two outputs. Report problems; don't fix them.

## Acceptance Criteria

- [ ] `tools/coverage.py` exits 0.
- [ ] Every catalogue checklist name is covered; supporting-scope exclusions are reasoned.
- [ ] Spot-check finds no unrecorded discrepancy (or each is listed as a defect).

## Verification

`.venv/bin/python tools/coverage.py && .venv/bin/python -m pytest -q`
