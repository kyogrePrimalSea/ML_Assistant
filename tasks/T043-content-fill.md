# T043 — Content fill, stage by stage (writer packet)

**Status:** Backlog

**Epic:** E05

## Objective

Turn scaffolded drafts into finished records: replace every `TODO` and trim the pre-filled
lists. One writer takes one batch of about 6–8 pages from the same family or group.

## What the writer reads (only these)

1. This file.
2. Its pages' drafts (`content/items/<stage>/<page>.yaml`) and sidecars (`<page>.facts.md`).
3. Two finished examples of the same archetype, chosen by the coordinator, for style.
4. `docs/CONTENT_SCHEMA.md`, only the slot it is unsure about.

Don't read the spec, the raw extraction JSON, the app or other tasks.

## Rules

- **Facts only from the sidecar, and from running the pinned library in `.venv`.** If a fact
  isn't there, leave the field empty (`[]` or `{none: true}`). Never invent one.
- Write in plain English: short tags, no word salad, sentence case, no italics. Limits:
  `solves.line` and catch-outs one line each; `use_when`/`avoid_when` tags of at most 5 words;
  `why` at most 12 words.
- **Snippets:** they must run when pasted. Include the imports and the stamp line, use a
  `sklearn.datasets` loader or `make_*` data, keep lines ≤ 79 characters, and put a
  `print(...)` of something meaningful last. Run each snippet with
  `.venv/bin/python -I -W ignore` from a scratch directory. Put the output, one line each, in
  `content/items/runs/<page>.txt` (one file per page, so writers don't collide).
- **What comes out:** keep only the true items, fill in shape and note, and run them to check
  the shapes.
- **Prep:** steps reference taxonomy family ids (for example `transform.scale.rescale`) or page
  ids. Mark `not_needed` where it matters (no scaling before trees).
- `hero` uses the archetype fields in `docs/CONTENT_SCHEMA.md`, with toy dataset `ames`,
  `breast-cancer` or `airline-passengers`, matching the page's goal. Keep
  `watch_it_work` `{none: true}`; E09 builds those.
- `next` and `pairs_with` only reference ids that exist (question ids and page ids).
- `reviewed: false`, always. Don't edit any file outside the batch's own drafts and run files.
- Before finishing, run `.venv/bin/python tools/validate_content.py 2>&1 | grep -E "<page ids>"`.
  The batch is done when none of its pages has errors.

## Report (short)

The pages done, any fields left empty and why, and any snippet that wouldn't run.
