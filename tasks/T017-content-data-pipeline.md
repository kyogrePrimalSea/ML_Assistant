# T017 — Content data pipeline for the app

**Status:** Backlog

**Epic:** E03

## Objective

Replace the stub `app/scripts/build-content.mjs` with the real build step that turns
the content files into static JSON for the app, and add TypeScript types and loaders.

## Context

`docs/ARCHITECTURE.md` § "Web app" (output layout), `docs/CONTENT_SCHEMA.md`,
`content/schema/` (item, question, vocab), the inventory/extraction contracts in
`docs/ARCHITECTURE.md`. Existing records: `content/items/**`, `content/questions/*`,
`content/derived/relationships.json`.

## Dependencies

- T015

## Implementation Contract

### Outputs

- `app/scripts/build-content.mjs` (Node, js-yaml): writes `app/public/data/index.json`
  and `app/public/data/pages/<id>.json` per the architecture layout. Every inventory
  page appears in the index, even without a content record (`has_record: false`), so
  navigation covers the whole catalogue. A page JSON exists only for records.
  Each page JSON includes, for each `key_settings` entry, the parameter's `default`,
  `effective_default` and `allowed` from the target extraction record(s) (per target
  when they differ).
  Deterministic output (sorted keys), fails loudly (non-zero exit, clear message) if a
  file doesn't parse; it does not re-validate the schema (Python validator does).
- `app/src/content/types.ts`: TypeScript types mirroring the item and question
  schemas and the index/page JSON (hand-written; keep in step with
  `content/schema/item.schema.json`).
- `app/src/content/load.ts`: `loadIndex()` and `loadPage(id)` fetching from
  `import.meta.env.BASE_URL + 'data/...'`, with a small in-memory cache; React hooks
  `useIndex()` and `usePage(id)` returning `{data, error, loading}`.
- Tests: script output for the current content (11 records, 3 questions, every
  inventory page indexed, key-setting defaults attached for XGBoost incl.
  `max_depth` effective default 6), and loader tests with mocked fetch.

### Rules

- Only edit `app/scripts/build-content.mjs`, `app/src/content/`, and their tests.
- No new npm dependencies.

## Acceptance Criteria

- [ ] `node scripts/build-content.mjs` produces the documented files; tests pass.
- [ ] `npm run build` includes the data in `dist/data/`.

## Verification

`cd app && node scripts/build-content.mjs && npm test && npm run build`
