# T010 — Content schema and vocabulary

**Status:** Backlog

**Epic:** E02

## Objective

Define the content record form (spec §5): one record per page, the fixed 11 slots
with archetype-specific variants, metadata, relationship fields, question records,
and the shared vocabulary.

## Context

Spec §5 is the source of truth ("Every page is a filled-in form… relationship lines
and validation rules are derived from schema fields, never hand-written
separately"). Also read §3 (tracks, hierarchy, questions), §4 (archetypes), §7.3
(passport, tickets: data shape after the step), §8 (validation rules table), §9
(toy datasets). Inventory and extraction contracts: `docs/ARCHITECTURE.md`.

## Dependencies

- T009 (E01 complete; families and pages come from the inventory)

## Implementation Contract

### Outputs

- `content/schema/vocab.yaml`: stages (ordered, with icon and colours from spec
  §10.4), tracks (with `wave: 1|later`), archetypes (with Tabler icon, spec §4),
  relationship types (spec §5.3, with line style from §10.5), prep statuses
  (`required|recommended|not_needed`), severities (`block|warn|tip|valid`), data
  profile flags (spec §7.3 passport: `task_type` enum regression|classification|forecasting,
  `track`, `has_categoricals`, `has_missing`, `time_ordered`, `imbalanced`),
  toy datasets (spec §9), question stems (`my_data_is|my_model_is|i_want_to_know`).
- `content/schema/item.schema.json` (JSON Schema 2020-12) for
  `content/items/<stage>/<page>.yaml`.
- `content/schema/question.schema.json` for `content/questions/<stage>.yaml`.
- `docs/CONTENT_SCHEMA.md`: field-by-field explanation with one short example per
  archetype variant; how each spec §5.3 relationship and each §8 validation rule
  is derived from fields.

### Record requirements

- Metadata (spec §5.2): `id` (= inventory `page`), `plain_name`, `code_name`,
  `aliases`, `stage`, `family`, `tracks`, `archetype`, `question_tags`,
  `targets` (inventory ids on this page), `source_urls`, `library_versions`
  (per library), `reviewed` (boolean; agents always write `false`).
- All 11 slots are required keys in fixed order (spec §5.1). An empty slot is
  explicit (`none: true` or empty list as the schema defines) — never omitted.
  `header` holds no data duplicated from metadata.
- Slot variants by archetype where spec says so: `quick_facts` (hyperparameter:
  default and typical range, default may differ per target; model: task types,
  data-size sweet spot; others: what the spec implies, keep small);
  `solves.hero` (archetype-specific hero visual parameters, spec §4 table);
  `intuition` (model: one idea, analogy, animation ref, good at / bad at tags, vs
  siblings, read-more steps; others: short form).
- `prep` (slot 5): entries `{step: page id or family ref, status, why (≤ 12 words),
  condition: data-profile expression or null, unless: e.g. a parameter setting or null}`.
- `code` (slot 6): tabs `{library, target, why_this_library (one line), snippet}`;
  version stamp is derived from `library_versions`, snippet must start with it.
- `key_settings` (slot 8): `tier1|tier2|tier3`, each a list of `{name, page or null}`.
- `watch_it_work` (slot 9): dataset from vocab plus one slider control.
- `next` (slot 11): question ids.
- Validation-rule inputs (spec §8): task types supported; `blocked_when` profile
  conditions with reason (e.g. random K-fold when `time_ordered`); `fits_on_data`
  for leakage checks; `shape_effect` (rows/columns: same|grows|shrinks|expands) for
  journey tickets. Redundant / missing requirement / missing recommendation come
  from `prep` — not new fields.
- Explicit relationship fields only for what can't be derived: `pairs_with`, `clashes`.
- Hyperparameter and output records carry `applies_to` (page ids).
- Questions: `{id, stem, text (user wording), stage, tracks, answers: [page or
  setting refs], next: [question ids]}`; ≤ 7 per stem per stage (validator enforces).

### Rules

- Positions for views are NOT part of this task (E06/E07 store them in `content/derived/`).
- Keep the schema as small as the spec allows; no speculative fields.

## Acceptance Criteria

- [ ] Schemas are valid JSON Schema (checked with `jsonschema` metaschema validation in a test).
- [ ] `docs/CONTENT_SCHEMA.md` maps every §5.3 relationship and §8 rule to fields.
- [ ] Spec §5.4 (XGBoost) is expressible without extra fields (T012 proves it).

## Verification

`.venv/bin/python -m pytest -q tests/test_schema.py`
