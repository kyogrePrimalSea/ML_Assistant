# T042 — Record scaffolder (pre-fill the mechanical fields)

**Status:** Ready

**Epic:** E05

## Objective

Write `tools/scaffold_record.py`, which writes a draft record
`content/items/<stage>/<page>.yaml` for any taxonomy page that has none yet. It fills every
field that can be derived, so a writer only adds the judgment fields. This keeps each page's
writing cost low (token efficiency is the point of this task).

## Context

Schema: `docs/CONTENT_SCHEMA.md`, `content/schema/item.schema.json`. Inputs:
`content/taxonomy.yaml` (stage, family, `for`, `shown_as`), `content/inventory/*.yaml`
(targets by `page`, archetype, doc_url, library), `content/extraction/<library>/<id>.json`
(summary, parameters with defaults/effective defaults, methods, attributes), and
`requirements.txt` (pinned versions). Patterns: any record in `content/items/`.

## Contract

- CLI: `tools/scaffold_record.py <page-id> [...]`, plus `--stage <id>` for all unfilled pages
  of a stage. It never overwrites an existing record.
- **Derived and filled:** `id`, `plain_name` (taxonomy `shown_as`), `code_name` (the target
  class or function names joined by " / "), `stage`, `family`, `tracks` (from the goals in the
  page's `for`), `archetype`, `targets`, `source_urls` (doc_url values), `library_versions`,
  `reviewed: false`, `rules.task_types` (from the `for` goals' tasks; empty when the page is
  in all three goals), and the `header: {}` slot.
- **Placeholders** for writer fields, each set to the literal string `TODO` (or `[TODO]` for
  lists): `aliases`, `question_tags`, `solves.line`, `use_avoid`, `prep`, `catch_outs`,
  `intuition`, `code[].snippet`, `rules.blocked_when`, `fits_on_data`, `shape_effect`. The
  validator must **fail** on any remaining `TODO`; add that check.
- **Pre-filled for the writer to trim:**
  - `key_settings.tier1`: up to 4 parameter names, chosen as those whose descriptions are
    longest. `tier2` and `tier3` hold the rest, but leave out `verbose`, `n_jobs`,
    `random_state`, `copy` and `warm_start`. Every entry has `page: null`, except
    `max_depth`, `n_estimators`, `learning_rate` and `early_stopping_rounds`, which link to
    their existing pages.
  - `what_comes_out.items`: candidate methods and attributes from the extraction, chosen
    per archetype using spec §5.1's table. Shapes and notes are `TODO`.
  - `code`: one tab per library, with the stamp line `# <library> <version>` filled.
- A sidecar `content/items/<stage>/<page>.facts.md` (git-ignored) holds the compact facts a
  writer needs: the summary line, the parameters (name, default, effective default, one-line
  description cut to 100 characters), the methods, the attributes, and the doc URLs. That
  way writers never open the raw extraction JSON.
- Tests: scaffold one page per archetype into a tmp dir; the validator flags the TODOs; no
  existing record is touched.

## Acceptance

- [ ] `.venv/bin/python tools/scaffold_record.py --stage clean` creates 4 drafts and 4
      sidecars; the validator lists the TODOs and nothing else.
- [ ] pytest passes.
