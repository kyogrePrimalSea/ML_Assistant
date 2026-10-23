# T005 — Official docs cross-check tool

**Status:** Ready

**Epic:** E01

## Objective

Build `tools/verify_docs.py`, which fetches each item's official `doc_url`,
parses the documented parameters (names and defaults) and attributes from the
HTML, and compares them with the extraction record.

## Context

Spec §13.1 requires extraction from official docs. Extraction comes from
introspection (T004); this tool proves it matches the published pages.
Contracts: `docs/ARCHITECTURE.md`. Doc sites are Sphinx-built (scikit-learn,
statsmodels, SciPy, XGBoost, LightGBM, imbalanced-learn, Optuna, SHAP) but
rendering differs; XGBoost and LightGBM document many classes on one long page
(anchor in the URL).

## Dependencies

- T001

## Implementation Contract

### Inputs

- Inventory files and `content/extraction/<library>/<id>.json` (built by T004, in
  parallel — use fixture extraction JSON in `tests/fixtures/` for tests).

### Outputs

- `tools/verify_docs.py`, `tests/test_verify_docs.py`, saved HTML fixtures in
  `tests/fixtures/html/` (one real page per doc site, fetched once and committed,
  so tests run offline).
- Writes `content/extraction/verification/<library>.json`: per item
  `{id, doc_url, status: match|mismatch|unparsed|fetch_error, missing_in_extraction: [],
  missing_in_docs: [], default_mismatches: [{name, docs, extraction}], attribute_diff: {...}}`.
- Prints a per-library summary table.

### CLI

- `--library <slug>`, `--id <id>` filters; `--cache <dir>` (default
  `.cache/docs/`, git-ignored — add to `.gitignore`) so pages are fetched once;
  polite fetching (≤ 2 requests/second, a User-Agent string, retries with backoff).

### Rules and Invariants

- Use only the Python standard library plus installed packages (no new
  dependencies); `html.parser` or regex over Sphinx structures is fine.
- For anchored URLs, parse only the section for that object.
- Defaults: compare normalised text (`default=1.0` vs `"1.0"`, quotes stripped).
- If a page layout cannot be parsed, status `unparsed` — never guess a match.

## Acceptance Criteria

- [ ] Parses parameters from at least one fixture page per doc site (8 sites).
- [ ] Mismatch detection tested (fixture extraction with a wrong default and a missing param).
- [ ] No network access in tests.

## Verification

`.venv/bin/python -m pytest -q tests/test_verify_docs.py`
