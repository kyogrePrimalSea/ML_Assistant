# T035 — Taxonomy validator and record migration

**Status:** Backlog

**Epic:** E11

## Objective

Extend the content validator with the taxonomy rules (QUESTION_MAP §3 rule 9, brief §4). Then
migrate the item records and relationship derivation to the taxonomy's family ids.

## Context

- `content/taxonomy.yaml` (T034), `docs/QUESTION_MAP.md` §2–§3 and §8 (migration),
  spec §3.3 and §5.3 (A2). Brief §4.
- `tools/validate_content.py`, `tools/derive_relationships.py`,
  `content/schema/{item.schema.json,vocab.yaml}`, `docs/CONTENT_SCHEMA.md`,
  `content/items/**`, `content/derived/relationships.json`.

## Dependencies

- T034, plus T029 (E12 content, which edits the same records).

## Implementation Contract

### Goal views (shared helper)

Write a pure function in `tools/taxonomy.py`: `goal_view(taxonomy, goal_id)` returns the tree
for one goal after filtering and elision. T037's layout script mirrors it in JS, so document it
precisely in `docs/CONTENT_SCHEMA.md`:

1. Keep pages whose `for` contains the goal. Drop groups and families left with no pages.
   Stages always stay, even when empty.
2. **No single-child levels**: if a group or stage has exactly one child that is a family or
   group, remove that child and attach its children directly. If a group or family has exactly
   one child page, the page replaces that node in its parent. Repeat until nothing changes.
   Stages are never removed.
3. A node's text for a goal is its string value, or the map entry for that goal.

### Validator rules (errors unless noted)

- Every inventory page id and every content-only record id appears exactly once in the taxonomy.
- In every goal view, every node has at most 7 children, and there are no single-child levels left.
- Label limits (QUESTION_MAP §2): `question_prompt` ends in "?" and is ≤ 48 characters;
  `question_label` is ≤ 40; `question_sentence` is ≤ 110 and starts "We need" or "We have";
  `pick_when` is ≤ 60. No "&", no "!".
- A page with a record must agree with it: the record's `stage` equals the taxonomy stage, and
  the record's `family` equals the taxonomy family or group id. For each goal in the page's
  `for`, the record's `tracks` contains the goal's track, and its `rules.task_types` is empty or
  contains the goal's task.
- `we_need_but` answers resolve to pages, and `page:setting` resolves to a parameter in the
  extraction of one of the page's targets. Coordinate with T036, which adds the stem; if T036
  hasn't landed yet, write the check against the question schema and test it with a fixture.
- The whole taxonomy schema check (T034's schema) runs inside the validator.

**Violations of the 7-child, single-child or length rules caused by the question map's own
wording are not fixed here.** List them in `docs/OPEN_QUESTIONS.md` under "Design review round
1", and have the validator downgrade exactly those listed items to warnings through an explicit
allow-list file `content/taxonomy-exceptions.yaml`. Each entry carries the rule, the node and a
reason. Keep the list empty if there's nothing to report.

### Migration

- Every record's `family` becomes its taxonomy family or group id. Move a record file if its
  taxonomy stage differs from its folder.
- `prep` steps of the form `{family, stage}` become `{family: <taxonomy id>}`, with the stage
  implied by the id. Update the schema to accept the new form, and the old form no longer.
  Use QUESTION_MAP §8 for the mapping, for example `Scaling` → `transform.scale.rescale`,
  `Categorical encoding` → `transform.encode.features`, `Imputation` → `clean.impute`, and
  `Class weighting` → `transform.rebalance.weight`.
- **Tracks and task types:** where a record disagrees with the taxonomy's `for`, the taxonomy
  wins for `tracks` (placement), so update the record. Don't change `rules.task_types`: list
  each disagreement in `docs/OPEN_QUESTIONS.md` and allow-list it, as above. For example,
  hyperparameter pages marked "All" in the map but `tracks: [standard]` in the record get
  `time-series` added.
- Relationship derivation: "Alternative to" means the same taxonomy family (or the same group,
  for group-with-pages). Regenerate `content/derived/relationships.json`. After this, all four
  boosting pages are alternatives to each other. The validation-rule derivation (family steps)
  uses taxonomy family ids.
- Passport: `vocab.yaml` `data_profile.task_type` becomes `[regression, classification]`, because
  the forecast goal is time series plus regression (A1). Update the schema, docs and any app
  type that uses it. `app/src/build/validate.ts` and its fixtures read prep steps and families,
  so update them to the new form so `npm test` stays green. Don't change any behaviour beyond
  the id format.
- `docs/CONTENT_SCHEMA.md`: the record `family` meaning, the prep step form, the goal-view
  algorithm, and the new validator rules.

## Acceptance Criteria

- [ ] `.venv/bin/python tools/validate_content.py` exits 0. Any allow-listed items appear in
      `docs/OPEN_QUESTIONS.md`.
- [ ] `relationships.json` shows the 4 boosting pages as mutual alternatives.
- [ ] Pytest has tests for each new rule (pass and fail fixtures) and for `goal_view` (the
      Clean, Transform-C and Model-C examples from the question map).
- [ ] `cd app && npm run lint && npm test && npm run build` pass.
