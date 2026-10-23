# T011 — Content validator and relationship derivation

**Status:** Backlog

**Epic:** E02

## Objective

Build `tools/validate_content.py` and `tools/derive_relationships.py`.

## Context

Schema and derivation rules: `docs/CONTENT_SCHEMA.md`, `content/schema/`.
Spec §5.2–5.3: relationships are derived from schema fields, never hand-written.

## Dependencies

- T010

## Implementation Contract

### Outputs

- `tools/validate_content.py`: validates every `content/items/**/*.yaml` and
  `content/questions/*.yaml` against the schemas, then referential integrity:
  every page/family/question reference resolves; every `targets` id exists in the
  inventory and has an extraction record; `id`/`stage`/`family`/`archetype`
  agree with the inventory; snippets start with the version stamp of the pinned
  version; `key_settings` names exist as parameters in the target's extraction
  record; question cap per stem per stage. Also report counts of reviewed vs unreviewed records. Prints all
  errors (file, path, message); exit non-zero on any.
- `tools/derive_relationships.py`: writes `content/derived/relationships.json`
  (`[{source, target, type, via}]`, deterministic order) using the spec §5.3 table.
- `tests/test_validate_content.py`, `tests/test_derive_relationships.py` with small
  fixture records (valid, and each error class).

## Acceptance Criteria

- [ ] Each referential check has a failing-fixture test.
- [ ] Derivation produces each of the 5 relationship types from fixtures.

## Verification

`.venv/bin/python -m pytest -q tests/test_validate_content.py tests/test_derive_relationships.py`
