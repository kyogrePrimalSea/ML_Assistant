# T014 — Verifier and override fixes; regenerate all extractions

**Status:** Ready

**Epic:** E01

## Objective

Fix the tool limitations found in T006–T008 so verification statuses reflect real
discrepancies only, then regenerate and re-verify every library.

## Dependencies

- T006, T007, T008, T013

## Context

Per-library findings: `content/extraction/verification/*-report.md`.
Contracts: `docs/ARCHITECTURE.md`.

## Fixes

`tools/verify_docs.py`:
1. Attribute `<dt>` entries rendered as `<code class="xref">name</code>` (property-backed
   attributes on scikit-learn pages) are parsed, not just `<strong>name</strong>`.
2. Documented properties/attributes outside the Attributes field list (Sphinx
   `dl.py.property` / `dl.py.attribute` members inside the object's section, as on
   statsmodels pages) count as documented attributes.
3. Classes with no constructor parameters, and headers with no parentheses
   (`class X[source]`, e.g. LeaveOneOut, LabelEncoder, optuna NopPruner) parse as an
   empty parameter set instead of `unparsed`.
4. Docs-side malformed names `name:type` (no space before colon) are split.

`tools/extract.py`:
5. Objects with no retrievable signature at all (e.g. exception classes such as
   `optuna.TrialPruned`) produce a record with empty parameters and a warning,
   not a failure.
6. Override list operations: each patch may have `op: set` (default, current
   behaviour), `append` (path names a list; value is a list of entries to add; error
   if a name already exists), or `remove` (path selects a list entry like
   `attributes[name=x]`; error if absent). Document in `docs/ARCHITECTURE.md`
   (overrides paragraph) — this task may edit that paragraph only.
7. A default-repr warning (memory address) is dropped when an override sets that
   parameter's `default`.

## Then regenerate

- Convert the 4 statsmodels attribute overrides (OLSInfluence, ARIMA, ETSModel,
  UnobservedComponents) from full-list `set` to `append` of only the missing
  attributes (keep their source_url and reason).
- Add a `remove` override for `sklearn.preprocessing.TargetEncoder`
  `attributes[name=infrequent_categories_]` citing its doc page (undocumented,
  inherited from a private base class) — confirm on the page first.
- Re-run `tools/extract.py` (all) and `tools/verify_docs.py` (all libraries).
- Update the "after" counts in each `content/extraction/verification/<library>-report.md`
  (append a "T014 re-run" section; do not delete history).

## Outputs

- `tools/verify_docs.py`, `tools/extract.py`, their tests, regenerated
  `content/extraction/**`, updated reports, the ARCHITECTURE.md overrides paragraph.

## Acceptance Criteria

- [ ] Each fix has a test; full suite passes.
- [ ] Every inventory item has an extraction record (0 failures).
- [ ] Remaining non-matches are only genuine docs/installed-version differences or
  upstream docstring defects, each listed in the reports.

## Verification

`.venv/bin/python -m pytest -q && .venv/bin/python tools/extract.py && .venv/bin/python tools/verify_docs.py`
