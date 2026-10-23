# T004 — Extraction tool

**Status:** Ready

**Epic:** E01

## Objective

Build `tools/extract.py`, which reads the inventory and writes one extraction
record per item by introspecting the installed, pinned packages.

## Context

Approach and the exact output record contract: `docs/ARCHITECTURE.md`
§ "Source extraction approach" and § "Extraction record contract". Inventory
entry contract: same file. The inventory files are being written in parallel
(T002, T003) — build against your own fixture inventory in `tests/fixtures/`.

## Dependencies

- T001

## Relevant Files

- `docs/ARCHITECTURE.md`

## Implementation Contract

### Inputs

- `content/inventory/catalogue.yaml`, `content/inventory/supporting.yaml` (either may be absent).
- `content/extraction/overrides/<id>.yaml` (optional per item).

### Outputs

- `tools/extract.py`, `tests/test_extract.py`, `tests/fixtures/inventory-fixture.yaml`.
- Writes `content/extraction/<library>/<id>.json` per the contract.

### CLI

- `.venv/bin/python tools/extract.py` — all items.
- `--library <slug>` and `--id <id>` filters (repeatable `--id`).
- `--inventory <path>` (repeatable) to override inputs; `--out <dir>` to override output root.
- Exit non-zero if any item fails to import; still write the others; print a summary
  (items written, warnings count, failures).

### Rules and Invariants

- Parameters from `inspect.signature` (for classes: `__init__`). Merge numpydoc
  `Parameters` descriptions/types by name. Record docstring-only parameters (e.g.
  XGBoost/LightGBM `**kwargs`-documented ones) too, with `param_kind: "documented_only"`
  and default parsed from `type_doc` if `default=` is present, plus a warning.
- `allowed`: if the class has `_parameter_constraints`, translate sklearn
  constraint objects to plain JSON (StrOptions → options; Interval → `{"type","left","right","closed"}`;
  types → type names; `None` → "None"; `"boolean"`/`"array-like"` etc. as strings).
  Else parse `{'a', 'b'}` option sets from `type_doc` (source `docstring`). Else `none`.
- `attributes` from numpydoc `Attributes`; `returns` from `Returns` (functions);
  `methods`: public callables on the class (incl. inherited library methods,
  excluding `object`'s), with signature and first docstring line.
- `library_version` from the package's `__version__`.
- Deterministic output: sorted keys, 2-space indent, trailing newline; lists keep
  source order. No timestamps in the record (reproducible diffs).
- Overrides: YAML with `patches:` (list of `{path, value}` where path like
  `parameters[name=alpha].default` or `attributes`), `source_url`, `reason`.
  Apply after introspection; record each in `overrides_applied`
  (`{path, source_url, reason}`). Invalid override path = error.
- Never fabricate a value. Unparseable sections → empty list + a warning string.

### Behaviour Examples

- `sklearn.ensemble.HistGradientBoostingRegressor`: `learning_rate` default `"0.1"`,
  allowed interval `(0, inf)` style from constraints; `methods` includes `fit`, `predict`, `staged_predict`.
- `xgboost.XGBRegressor`: parameters include `n_estimators`, `max_depth`,
  `learning_rate`, `reg_lambda` even though they are `**kwargs`-documented.
- `scipy.stats.linregress` (function): `returns` non-empty, `methods` empty.

## Acceptance Criteria

- [ ] Tests cover: a sklearn class, an XGBoost class, a statsmodels class, a SciPy
  function, an override applied, an invalid override rejected, deterministic output.
- [ ] Running on the fixture produces contract-conforming JSON.

## Verification

`.venv/bin/python -m pytest -q tests/test_extract.py`
