# T013 — Extractor fixes found during extraction runs

**Status:** Ready

**Epic:** E01

## Objective

Fix `tools/extract.py` bugs reported by T007 (and any reported by T006/T008),
keeping the extraction record contract in `docs/ARCHITECTURE.md` unchanged.

## Dependencies

- T004

## Fixes

1. Functions with `**kwargs` crash (code reads `obj.__mro__`). Affected:
   `scipy.optimize.curve_fit`, `statsmodels.graphics.tsaplots.plot_acf`, `plot_pacf`.
   MRO merging applies to classes only.
2. `inspect.signature` fails on Cython classes (`statsmodels.tsa.seasonal.STL`).
   Fallback order: `__text_signature__`; the signature line at the top of the
   docstring (numpydoc `Signature`); else parameters from the numpydoc
   `Parameters` section as `documented_only` with defaults parsed from
   `type_doc`. Always add a warning naming the fallback used.
3. MRO `**kwargs` merging over-includes. A base-class `__init__` parameter is
   merged only if the class's own numpydoc `Parameters` section documents it.
   Undocumented base params are not added (this removes OLS `weights`, MNLogit
   `offset`, SARIMAX/VARMAX/UnobservedComponents `k_states`, `dates`, `freq`,
   `missing` unless documented). XGBoost must still get its full documented set
   with signature defaults.
4. Attributes: also collect public `property` objects defined on the class
   whose docstrings exist, when not already in the numpydoc `Attributes` section
   (description = first docstring line). Keep source order: numpydoc first.

## Outputs

- `tools/extract.py`, `tests/test_extract.py` (one test per fix, using the
  real affected objects).

## Rules

- Don't touch `content/` (other agents are running extractions). Test with a temp `--out`.

## Acceptance Criteria

- [ ] All four fixes tested; full suite passes.
- [ ] `tools/extract.py --library statsmodels --library scipy --out <tmp>` writes every item with 0 failures (if `--library` isn't repeatable, run twice).

## Verification

`.venv/bin/python -m pytest -q`
