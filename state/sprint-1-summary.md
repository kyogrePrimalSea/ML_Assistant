# Sprint 1 summary (E01–E02), 2026-10-24

Status: complete. E01 and E02 Done. 14 tasks (T001–T014), all reviewed and committed.

## What exists now

- **Pinned environment:** `requirements.txt` (scikit-learn 1.9.1, statsmodels 0.15.0,
  SciPy 1.18.1, XGBoost 3.4.1, LightGBM 4.7.0, imbalanced-learn 0.14.2, Optuna 5.0.0,
  SHAP 0.54.1, matplotlib 3.11.2).
- **Inventory:** 383 objects. 122 are from the spec §6 catalogue, mapped against all
  104 catalogue names. 261 are supporting cast.
- **Extraction:** one record per object in `content/extraction/<library>/`, built
  by introspecting the pinned packages. Each record is cross-checked against its
  official doc page. 381 match. The 2 non-matches are explained docs quirks.
  There are 38 hand overrides, each citing its source page. The output is
  byte-identical when re-run.
- **Audit:** `content/extraction/E01-REPORT.md` (independent 15-item spot check, coverage).
- **Content schema:** `content/schema/` plus `docs/CONTENT_SCHEMA.md`. It has the
  11 fixed slots, archetype variants, relationship fields and validation-rule
  inputs.
- **Tools:** `tools/extract.py`, `verify_docs.py`, `coverage.py`, `validate_content.py`,
  `derive_relationships.py`.
- **Example pages:** 11 records, one per archetype (XGBoost as in spec §5.4), plus
  3 chained questions. All snippets run. All are `reviewed: false`.

## Needs you

- `docs/OPEN_QUESTIONS.md`: 13 working defaults to confirm or change. The most
  important are the proposed page groupings, the classification toy dataset and the
  thin Explore stage.
- Review the 11 example pages in `content/items/`. They set the pattern for 300+ pages.

## Next

E03 (app foundation and Observatory design system), then E04 (Boosting slice).
Tasks for those aren't written yet.
