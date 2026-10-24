# T036 — The `we_need_but` stem and question rewrite

**Status:** Backlog

**Epic:** E11

## Objective

Add the fourth question stem `we_need_but` ("We need…, but…") and seed it from
`docs/QUESTION_MAP.md` §7. Rewrite the existing question texts as full sentences in the same
voice (spec §3.4, A3).

## Context

- `content/schema/{vocab.yaml,question.schema.json}`, `content/questions/*.yaml` (3 existing
  questions), `tools/validate_content.py` (questions rules), `docs/CONTENT_SCHEMA.md` (Questions).
- Answers use page ids. `page:setting` names a constructor parameter, and its name must exist in
  the extraction of that page's targets (`content/extraction/<library>/<id>.json`).
  Pages without content records are valid answers.
- The §7 answers were written by the designer. **Verify each answer against the extraction and
  the official docs** (the doc URL is in the inventory entry). Where the docs contradict an
  answer or a parenthetical catch-out, keep the map's wording, add an entry to
  `docs/OPEN_QUESTIONS.md` ("Design review round 1") with the source URL, and leave that answer
  out until the user decides. Never rewrite silently.

## Dependencies

- T034 (taxonomy, for stage placement of forecast questions).

## Implementation Contract

- `vocab.yaml` `question_stems` gains `{id: we_need_but, name: "We need…, but…", max_per_stage: 7}`;
  the schema enum matches (`tests/test_schema.py`).
- Question `answers` entries gain an optional `note` (≤ 16 words) for parentheticals such as
  "catch-out: with big samples every test says 'not normal'; plot it too". Copy them verbatim
  from §7.
- Seed every §7 row into `content/questions/<stage>.yaml` with `stem: we_need_but`, `text`
  verbatim and `answers` in order. Stage is the section it sits under. The "Forecast" rows file
  under the stage of their first answer's page, per taxonomy. Set `tracks` from the answers'
  taxonomy `for`: a forecast-only answer set gets `[time-series]`. Set `next: []` unless the map
  says otherwise.
- The existing setting rule (a setting named in the page's `key_settings`) is relaxed to: the
  name is in that page's `key_settings` **or** is a parameter in its targets' extraction.
- Rewrite the 3 existing questions' `text` as full sentences in the same voice: for example
  `model-overfitting` → "Our model is great on training data, but poor on new data". Don't
  invent new questions for the old stems.
- Validator: the per-stem-per-stage cap still holds, and `we_need_but` texts start "We need".
- `docs/CONTENT_SCHEMA.md` Questions section is updated.

## Acceptance Criteria

- [ ] All §7 rows are present, or listed in `OPEN_QUESTIONS.md` with a source.
- [ ] The validator exits 0; pytest passes; the app build passes (the index includes the questions).
- [ ] The run log has a verification table: question id, each answer, and the extraction or doc
      evidence (parameter name found, or the doc sentence).
