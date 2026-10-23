# T006 — Run extraction and docs cross-check: scikit-learn

**Status:** Backlog

**Epic:** E01

## Objective

Produce verified extraction records for every `library: scikit-learn` inventory item.

## Dependencies

- T002, T003, T004, T005

## Relevant Files

- `docs/ARCHITECTURE.md`, `tools/extract.py`, `tools/verify_docs.py`, both inventory files.

## Implementation Contract

### Steps

1. `.venv/bin/python tools/extract.py --library scikit-learn`
2. `.venv/bin/python tools/verify_docs.py --library scikit-learn`
3. For every item not `match`: open the official doc page and decide.
   - Extraction wrong or incomplete → write `content/extraction/overrides/<id>.yaml`
     (with `source_url` and `reason`) and re-run steps 1–2 for that id.
   - Docs page and installed version legitimately differ, or the parser is
     wrong → record in the report (do not change the tools; report parser bugs).
4. Spot-check by hand 10% of `match` items (at least 10, across families):
   compare every parameter, default, attribute and method name with the doc
   page. Record which ones.

### Outputs

- `content/extraction/scikit-learn/*.json`, any overrides, the verification JSON.
- `content/extraction/verification/scikit-learn-report.md`: counts by status,
  every non-match with its resolution, spot-check list, parser issues.

### Rules

- Do not edit tools, inventory files, or other libraries' outputs. Inventory
  errors (wrong path/URL) go in the report for the coordinator.
- Never write an override from memory: each must cite the doc page it came from.

## Acceptance Criteria

- [ ] Every scikit-learn inventory item has an extraction record.
- [ ] Every item is `match` or has a recorded resolution.
- [ ] Spot-check recorded.

## Verification

`.venv/bin/python tools/extract.py --library scikit-learn && .venv/bin/python tools/verify_docs.py --library scikit-learn`
