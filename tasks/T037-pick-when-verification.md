# T037 — Check `pick_when` lines against the docs

**Status:** Backlog

**Epic:** E11

## Objective

Check every `pick_when` line in `content/taxonomy.yaml` (343 pages) against the E01 extraction
and the official docs. Report each line the docs contradict. **Don't rewrite anything.**

## Context

- `docs/QUESTION_MAP.md` (header note), brief §4 "Verification of wording" and §7.
- Evidence: `content/extraction/<library>/<id>.json` (summary, parameter docs, defaults) and
  each inventory entry's `doc_url` (`content/inventory/*.yaml`). The cached docs are in
  `.cache/docs/` (`tools/verify_docs.py` fetches them).
- A `pick_when` is guidance ("Top accuracy on tabular data"). Flag only **factual claims the
  docs contradict**: a wrong default, a wrong parameter name, a wrong capability (for example
  "handles gaps" for an estimator that rejects NaN), or a wrong data-type requirement. Don't flag
  matters of taste or claims the docs simply don't address. Record those as "not covered by
  docs" in the table and nowhere else.

## Dependencies

- T034. Read-only on `content/taxonomy.yaml`.

## Outputs

- `content/verification/pick-when.md`: a table of page, `pick_when`, verdict
  (`supported` | `not covered` | `contradicted`), evidence (the doc sentence or extraction field,
  plus the URL).
- For each `contradicted` row, an entry in `docs/OPEN_QUESTIONS.md` under "Design review round
  1": the page, the current wording, what the docs say, the source URL, and a suggested wording
  for the user to accept or reject.

## Acceptance Criteria

- [ ] All 343 pages appear in the table.
- [ ] Every `contradicted` row has an `OPEN_QUESTIONS.md` entry with a URL.
- [ ] `git diff content/taxonomy.yaml` is empty.
