# T031 — Review UI fixes: code wrap, typography, badges, key settings, sheet title, "Used by"

**Status:** Ready

**Epic:** E12

## Objective

Fix F4 (renderer side), F5/A8, F6/A9, F7–F8/A10, F9 and the "Used by" part of F10 from
`docs/BRIEF_DESIGN_REVIEW_1.md` §2.

## Context

- Spec §5.1 (Header, Key settings), §10.1, §10.8, §10.9, §11. Read the brief's table in §2
  for each fix.
- Relevant code: `app/src/components/CodeBlock.tsx` (and its tests),
  `app/src/page/slots/{Header,KeySettings,QuickFacts,Connections}.tsx`,
  `app/src/components/StageBadge.tsx`, `app/src/components/DataFrameDiff.tsx`,
  `app/src/styles/*.css`, and the shell bottom sheet in `app/src/shell/` (find where
  "Page panel" is set). The content data shape is in `app/src/content/types.ts`; `key_setting_facts`
  carries defaults and effective defaults.

## Dependencies

- None. It runs in parallel with T028 and T032. Don't touch `PagePanel.tsx` slot order,
  `WatchItWork.tsx`, `Solves.tsx` or `src/cutscenes/` (T030 and T032 own those).

## Implementation Contract

1. **F4 code wrap.** Code blocks soft-wrap long lines by default, with a hanging indent so
   continuation lines sit indented under the start of the code. A continuation marker (for
   example a small `↪` in the gutter or at the wrap point) is visual only and `aria-hidden`.
   The copy button copies the original, unwrapped text exactly. Keep the version stamp first
   line and the syntax colours. No horizontal scrollbar at 420px panel width.
2. **F5 / A8 typography.** JetBrains Mono is for code only: code blocks, inline `<code>`, and
   the cell values of the data-frame diff. Everything else that shows numbers (quick facts,
   key settings defaults and ranges, shapes like `1,460 × 81 → 1,460 × 262`, tables) uses
   Atkinson Hyperlegible with `font-variant-numeric: tabular-nums`. Add a utility class or
   token if there isn't one, and find every current Mono use that isn't code.
3. **F6 / A9 badges.** When the stage badge's label equals the archetype badge's label (Model +
   Model), hide the stage badge and put a small stage-colour dot on the archetype badge. The
   badge's accessible name still says the stage, for example "Model, stage Model". Otherwise
   show both badges as now.
4. **F7–F8 / A10 key settings.**
   - Tier labels read **Most used** (visible), **Also useful** (one tap) and **Rarely
     changed** (collapsed). Remove "Tier 1", "More settings" and "Tier 3 settings"
     everywhere, including tests.
   - Defaults show the **effective** value large (for example "100"). When the signature
     default differs, for example `None` with an effective default of 100, add small muted
     text: "set as None in the signature". Never show "None → 100, effective default".
   - Apply the same rule wherever quick facts show defaults, if they use the same data.
5. **F9 sheet title.** Below 900px, the bottom sheet's visible title and accessible name are
   the open page's plain name (for example "XGBoost"), not "Page panel". It falls back to
   "Page" while loading.
6. **F10 "Used by".** Show connections on a hyperparameter or output page lists a **Used by**
   group, built from the record's `applies_to`, with links to those pages. It is styled like
   the existing connection groups, with icon plus label. Check whether the relationship lines
   on the tree need a type for it. If the existing relationship types (spec §5.3) don't cover
   it, keep "Used by" as a panel list only, and don't add a new line style.

## Tests

- Unit: CodeBlock copy returns the original text for a long line; the wrap class is present.
  The Header hides the duplicate badge for a model page and shows both for a transformer. Key
  settings tier labels are correct, with the effective-default rendering for a `None` → 100
  fact. Connections show "Used by" for `n-estimators`.
- e2e at 1440 and 1024: `#/page/xgboost` has no horizontal overflow in code blocks, and
  quick-facts numbers have a computed `font-family` that is not JetBrains Mono. At a 600px-wide
  viewport, the sheet's accessible name is "XGBoost". Run axe.
- Save before and after screenshots of XGBoost (header, code, key settings) at 1440 dark and
  1024 light, plus the phone sheet, under `/tmp/e12-shots/T031/`. Use `--output /tmp/pw-T031`.

## Acceptance Criteria

- [ ] All six fixes are visible on `#/page/xgboost` and `#/page/n-estimators`.
- [ ] `cd app && npm run lint && npm test && npm run build && npx playwright test --output /tmp/pw-T031` pass.
- [ ] No content or schema files are changed.
