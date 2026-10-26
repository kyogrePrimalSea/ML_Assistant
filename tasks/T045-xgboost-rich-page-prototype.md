# T045 — XGBoost rich shared-page prototype

**Status:** Done

## Objective

Turn the existing XGBoost page into the reference implementation for richer learning
content: an intuitive and mathematical explanation, settings that say what they
control and why they matter, and runnable prediction code followed by its captured
output. Preserve its existing animation and output visuals.

## Context

The user approved the richer shared-page direction after reviewing the drafted Wave 1
pages. The existing 12-slot order remains unchanged (spec §5.1). This task extends the
data carried inside the existing Code, Key settings, and Intuition slots; it does not
add or reorder slots.

XGBoost is the prototype because it already has the `model/boosting-sequence`
animation, a Watch-it-work control, and classification plus regression output data.
The active classification toy dataset is breast cancer, not Titanic. Titanic was
explicitly removed in T028. The regression output visual uses an Ames-like housing
sample.

**Epic:** E13

## Dependencies

- T044

## Relevant Files

- `docs/spec.md` §5.1, §9, §13
- `docs/CONTENT_SCHEMA.md`
- `docs/ARCHITECTURE.md`
- `content/schema/item.schema.json`
- `content/items/model/xgboost.yaml`
- `content/items/model/xgboost.facts.md`
- `content/extraction/xgboost/xgboost.XGBClassifier.json`
- `content/extraction/xgboost/xgboost.XGBRegressor.json`
- `content/cutscenes/boosting-fit.json`
- `content/cutscenes/outputs/xgboost.json`
- `app/src/content/types.ts`
- `app/src/page/PagePanel.tsx`
- `app/src/page/slots/Code.tsx`
- `app/src/page/slots/KeySettings.tsx`
- `app/src/page/slots/Intuition.tsx`
- existing tests for the files above
- official XGBoost 3.4.1 docs already named by `source_urls`; for the mathematical
  explanation also use the official Introduction to Boosted Trees tutorial

## Implementation Contract

### Inputs and Existing Interfaces

- Keep the 12-slot order and all existing records valid.
- Extend the item schema additively; new rich fields are optional during this
  one-page prototype so the other 342 records do not require migration.
- Keep `animation: model/boosting-sequence`, the Watch-it-work configuration, and
  `what_comes_out.visual: both` unchanged.
- Factual model, setting, method, and attribute claims must come from the pinned
  extraction, the installed pinned packages, or the official XGBoost docs. Do not
  write model content from memory.

### Outputs

- A richer `content/items/model/xgboost.yaml` using the additive schema.
- Updated JSON Schema, TypeScript types, content-schema documentation, renderer, and
  focused tests for the new fields.
- A deterministic captured output beside the runnable prediction example. Store the
  captured output in the content record so it travels with the example and renders
  directly after its code block.
- Update `docs/ARCHITECTURE.md` only with the established additive data contract.

### Public Interfaces and Types

Extend these existing types without renaming them:

- `CodeTab`: optional captured `output: string`.
- `KeySetting`: optional `controls: string` and `effect: string`.
- Model `Intuition`: optional rich fields:
  - `goal: string` — what the algorithm is trying to do.
  - `steps: string[]` — how it does it, in chronological order.
  - `math: { notation: {symbol: string, meaning: string}[], equations:
    {expression: string, meaning: string}[], prediction: string }`.

The JSON Schema must apply sensible non-empty-string and list bounds while retaining
compatibility with existing records. Mirror the schema in `app/src/content/types.ts`.

### Rules and Invariants

- The existing short `idea`, analogy, animation, strengths, weaknesses, siblings,
  and `read_more` remain supported. The rich fields augment them.
- Render the rich explanation inside the already-collapsed Intuition slot, with clear
  headings “What we are trying to do”, “How it works”, and “The mathematics”.
- Present each equation as selectable text in a code-styled block, immediately
  followed by its plain-English meaning. Do not add a math-rendering dependency for
  this prototype.
- Key-setting prose must answer both “what does this control?” and “what trade-off
  does changing it introduce?”. Existing settings without prose keep their current
  compact rendering.
- XGBoost must explain every setting currently listed in its three tiers.
- The main XGBoost code example must fit the model and explicitly create `y_pred`.
  The What-comes-out example must explicitly demonstrate classification
  `y_proba`, `y_score`, and `y_pred`, plus regression `y_pred`; keep the arrays short
  and deterministic.
- Render captured output directly under its associated code block with a visible
  “Output” label. Preserve whitespace and make horizontal overflow keyboard
  reachable in the same manner as existing code blocks.
- Prediction output must be produced by running the exact snippet with the pinned
  environment, not transcribed from memory. Keep the existing version-stamp rule.
- Keep copy short and dyslexia-first: one idea per paragraph/list item; introduce
  every mathematical symbol before using it.
- Do not modify animation implementation or cutscene data.
- Do not change any other item page in this prototype.

### Dependencies and Consumers

- `app/scripts/build-content.mjs` transports the extended record unchanged.
- `PagePanel` and its slot components consume the new fields.
- Future branch-by-branch content review will reuse this page as the reference.

### Behaviour Examples

- A legacy setting `{name: max_iter, page: null}` renders exactly as before.
- A rich XGBoost setting additionally renders its control and trade-off prose.
- The XGBoost prediction example displays code first and the exact captured stdout
  immediately below it.
- The mathematics explains the additive prediction, regularized training objective,
  and the roles of loss and tree-complexity penalties in both symbols and plain
  English.

## Scope

### In Scope

- Additive shared schema and renderer support.
- One fully enriched XGBoost page.
- Focused schema, build, and component tests.
- Relevant content-schema and architecture documentation.

### Out of Scope

- New or changed animation.
- Migrating any page other than XGBoost.
- Reintroducing Titanic.
- KaTeX/MathJax or another new dependency.
- Changing radial-tree taxonomy, layout, or labels.

## Acceptance Criteria

- [ ] All existing records remain schema-valid.
- [ ] XGBoost shows the three rich explanation sections inside Intuition.
- [ ] Its mathematical explanation is correct, defines notation, and remains readable
      without rendered LaTeX.
- [ ] All ten existing XGBoost key settings explain control and trade-off.
- [ ] Runnable prediction code creates the requested prediction variables and shows
      exact captured output directly below the code.
- [ ] Existing XGBoost animation, Watch-it-work, and both output visuals still render.
- [ ] Focused tests cover rich and legacy rendering paths.
- [ ] No Titanic content or new dependency is introduced.
- [ ] Full Python validation and React test/build baselines pass.

## Verification

From the project root:

```bash
.venv/bin/python tools/validate_content.py
.venv/bin/python -m pytest -q
```

From `app/`:

```bash
npm test
npm run build
```

Also run the exact XGBoost snippets with `.venv/bin/python -I -W ignore` from a
scratch directory and compare stdout byte-for-byte with the stored output.
