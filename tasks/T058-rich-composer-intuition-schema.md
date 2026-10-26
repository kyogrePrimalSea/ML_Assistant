# T058 — Allow rich intuition on composer model pages

**Status:** Done

## Objective

Allow composer-archetype model pages such as Stacking and Voting to use the same rich
intuition structure already rendered for ordinary model pages, while preserving legacy
short composer intuition.

## Context

`stacking.yaml` and `voting.yaml` are model catalogue pages with `archetype: composer`.
The shared `Intuition` TypeScript union and renderer already support both `{text}` and
full model intuition, but the composer-specific JSON Schema clause currently permits
only `none` or `short_intuition`.

**Epic:** E14

## Dependencies

- T048

## Relevant Files

- `content/schema/item.schema.json`
- `tests/test_schema.py`
- `docs/CONTENT_SCHEMA.md`
- Existing consumers: `app/src/content/types.ts`, `app/src/page/slots/Intuition.tsx`

## Implementation Contract

### Inputs and Existing Interfaces

- Reuse `$defs.model_intuition`; do not create a parallel rich-composer structure.
- Preserve `$defs.short_intuition` and every existing composer record.
- Do not change TypeScript or renderer code unless a failing focused test proves it necessary.

### Outputs

- Composer `slots.intuition` accepts `none`, `short_intuition`, or `model_intuition`.
- Schema tests prove both short legacy and rich composer forms validate, and malformed rich
  math remains rejected by the existing model-intuition contract.
- `docs/CONTENT_SCHEMA.md` records that composer pages may use rich model intuition when
  they teach a model/ensemble mechanism.

### Rules and Invariants

- This changes only an allowed content shape; it must not alter runtime rendering for legacy pages.
- Rich composer intuition uses the exact existing required fields and optional goal/steps/math.
- No animation asset is created; content may use `animation: none` where none already exists.

## Scope

In scope: schema, focused schema tests, and content-contract documentation.
Out of scope: Stacking/Voting YAML content, UI redesign, animation work, or other archetypes.

## Acceptance Criteria

- [x] Legacy `{text}` composer intuition still validates and renders unchanged.
- [x] A full existing `model_intuition` object validates for `archetype: composer`.
- [x] Invalid rich math is rejected under the same rules as model intuition.
- [x] Focused schema tests and the full content validator pass.

## Verification

Run `.venv/bin/python -m pytest tests/test_schema.py tests/test_validate_content.py` and
`.venv/bin/python tools/validate_content.py`. Baseline: validator 343/0/0; full Python
suite 1742 passing before the active tree-content edits.
