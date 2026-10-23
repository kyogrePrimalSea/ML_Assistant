# T019 — Code block and data-frame diff components

**Status:** Backlog

**Epic:** E03

## Objective

Build the two reusable display components the item page and later cutscenes need.

## Context

Spec §10.9 (code blocks), §10.8 (data-frame diff), §5.1 slot 6 (code tabs by library
with a one-line "why this library"), §3.3. Tokens from T016.

## Dependencies

- T016

## Implementation Contract

### Outputs

- `app/src/components/CodeBlock.tsx`: JetBrains Mono 13px, line-height 1.6, ligatures
  off; Python highlighting with prism-react-renderer using a token-driven theme
  (keywords `--accent`, strings Clean teal, numbers Transform pink, comments
  `--text-muted`); first line is the version stamp comment (already in the snippet —
  do not add another); copy button top right (copies exact snippet; announces
  "Copied" to screen readers); horizontal scroll inside the block, never the page.
- `app/src/components/CodeTabs.tsx`: tabs per library (Radix tabs from
  `components/ui`), each tab showing `why_this_library` above its CodeBlock; keyboard
  arrow navigation.
- `app/src/components/DataFrameDiff.tsx`: props `{before: {columns, rows}, after:
  {columns, rows}, changed: [[row, col]...], added: [col], removed: [col]}`; shape
  line above (`1,460 × 81 → 1,460 × 262`, thousands separators); changed cells with
  accent-tinted background and 2px accent left bar; added columns with Valid-tinted
  header and `+` icon; removed columns muted, struck through, `−` icon; monospaced
  values; accessible table semantics with a caption describing the change.
- Unit tests for each (copy behaviour, tab switching, diff rendering incl. shape line).
- Add all three to `#/styleguide` with sample data (Ames-style columns).

### Rules

- Only edit those component files, their tests, and the styleguide file. No new npm dependencies.

## Acceptance Criteria

- [ ] Components match §10.8–10.9 in both themes; tests, lint and build pass.

## Verification

`cd app && npm run lint && npm test && npm run build`
