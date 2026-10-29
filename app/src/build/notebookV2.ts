// Notebook v2 (spec section 8.1): one cell per stage that holds a pick, in stage order. Every
// template reads and writes only the names in vocab.ts, so each cell's output is the next cell's
// input. Deterministic: the same picks in the same order give a byte-identical .ipynb.
// notebook.ts stays the v1 output the Build view uses; this file is additive.
import type { ItemRecord, StageId } from '../content/types.ts'
import type { Cell } from './notebook.ts'
import { STAGE_ORDER, sortPicks, type DataProfile, type Pick } from './validate.ts'

/** A pick with no fixed template. Its stage gets a TODO cell, and it is listed here. */
export interface Gap {
  id: string
  stage: StageId
  plain_name: string
}

export interface Notebook {
  cells: Cell[]
  gaps: Gap[]
}

interface Ctx {
  profile: DataProfile
  record: ItemRecord
  /** Page ids in the pipeline, pipeline order. */
  ids: string[]
}
interface Part { imports: string[]; code: string }

const estimator = (ctx: Ctx) => (ctx.profile.task_type === 'classification' ? 'Classifier' : 'Regressor')

/** Fixed templates per page, written in the shared vocabulary. Pages not listed here are gaps. */
const TEMPLATES: Record<string, (ctx: Ctx) => Part> = {
  onehotencoder: () => ({
    imports: ['from sklearn.compose import ColumnTransformer', 'from sklearn.preprocessing import OneHotEncoder'],
    code: `# Transform: turn text categories into 0/1 columns.
# It is fitted inside the Pipeline below, on training rows only, so no test rows leak in.
preprocess = ColumnTransformer(
    [("onehot", OneHotEncoder(handle_unknown="ignore"), categorical_cols)],
    remainder="passthrough",
)`,
  }),
  'train-test-split': () => ({
    imports: ['from sklearn.model_selection import train_test_split'],
    code: `# Split: hold rows out for testing.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)`,
  }),
  xgboost: (ctx) => {
    const est = `XGB${estimator(ctx)}`
    const steps = ctx.ids.includes('onehotencoder')
      ? `    ("preprocess", preprocess),\n    ("model", ${est}(n_estimators=300, learning_rate=0.05, max_depth=4, random_state=42)),`
      : `    ("model", ${est}(n_estimators=300, learning_rate=0.05, max_depth=4, random_state=42)),`
    return {
      imports: ['from sklearn.pipeline import Pipeline', `from xgboost import ${est}`],
      code: `# Model: XGBoost, chained after the earlier steps in one Pipeline.
model = Pipeline([
${steps}
])
model.fit(X_train, y_train)`,
    }
  },
  'r2-score': () => ({
    imports: ['from sklearn.metrics import r2_score'],
    code: `# Evaluate: R-squared on the held-out rows (1.0 is perfect).
y_pred = model.predict(X_test)
print("R2:", r2_score(y_test, y_pred))`,
  }),
}

/** Page ids that have a fixed template, so a pick with one is not a gap. */
export const TEMPLATED_PAGE_IDS: readonly string[] = Object.keys(TEMPLATES)

function gapPart(record: ItemRecord): Part {
  const tab = record.slots.code[0]
  const lines = tab ? tab.snippet.replace(/\n$/, '').split('\n').map((l) => `# ${l}`) : []
  return {
    imports: [],
    code: [`# ${record.stage}: ${record.plain_name}`, '# TODO: no fixed template for this step yet. Guide snippet:', ...lines].join('\n'),
  }
}

const importKey = (l: string) => (l.startsWith('import ') ? `0${l}` : `1${l}`)

function versionStamp(records: ItemRecord[]): string {
  const v = new Map<string, string>()
  for (const r of records) for (const [lib, ver] of Object.entries(r.library_versions)) v.set(lib, ver)
  return [...v.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([l, x]) => `${l} ${x}`).join(', ')
}

const flag = (b: boolean, yes: string, no: string) => (b ? yes : no)
const stageName = (s: StageId) => s[0].toUpperCase() + s.slice(1)

/** Title, setup, then one cell per stage that holds a pick (stage order, picks in the order given within a stage). */
export function buildNotebookV2(picks: Pick[], profile: DataProfile): Notebook {
  const ordered = sortPicks(picks)
  const ids = ordered.map((p) => p.record.id)
  const parts = ordered.map((p) => {
    const ctx: Ctx = { profile, record: p.record, ids }
    return Object.prototype.hasOwnProperty.call(TEMPLATES, p.record.id) ? TEMPLATES[p.record.id](ctx) : gapPart(p.record)
  })
  const gaps: Gap[] = ordered
    .filter((p) => !Object.prototype.hasOwnProperty.call(TEMPLATES, p.record.id))
    .map((p) => ({ id: p.record.id, stage: p.record.stage, plain_name: p.record.plain_name }))

  const imports = [...new Set(['import pandas as pd', ...parts.flatMap((p) => p.imports)])].sort(
    (a, b) => (importKey(a) < importKey(b) ? -1 : importKey(a) > importKey(b) ? 1 : 0),
  )

  const title = `# Pipeline from ML Field Guide

Data profile: ${profile.task_type}, ${profile.track} track, ${flag(profile.has_categoricals, 'has', 'no')} text categories, ${flag(profile.has_missing, 'has', 'no')} missing values, ${flag(profile.time_ordered, 'time-ordered', 'not time-ordered')}, ${flag(profile.imbalanced, 'imbalanced', 'balanced')}.

Steps, in order: ${ordered.map((p) => p.record.plain_name).join(', ')}.

Replace each \`TODO\` below, then run the cells from top to bottom.`

  const setup = `# Setup: libraries and data. Edit only the lines marked TODO.
# ${versionStamp(ordered.map((p) => p.record))}
${imports.join('\n')}

# TODO: path to your data file.
df = pd.read_csv("TODO_path_to_data.csv")
# TODO: name of the column you want to predict.
target = "TODO_target_column"
# TODO: names of the text (categorical) columns.
categorical_cols = ["TODO_categorical_column"]
# TODO: names of the number columns.
numeric_cols = ["TODO_numeric_column"]

X = df.drop(columns=[target])
y = df[target]`

  // One cell per stage that holds a pick: the stage's codes, in the order given.
  const byStage = new Map<StageId, string[]>()
  ordered.forEach((p, i) => {
    const list = byStage.get(p.record.stage) ?? []
    list.push(parts[i].code)
    byStage.set(p.record.stage, list)
  })
  const stopCells: Cell[] = STAGE_ORDER.filter((s) => byStage.has(s)).map((s, i) => ({
    kind: 'code',
    label: `Stop ${i + 1}: ${stageName(s)}`,
    source: (byStage.get(s) ?? []).join('\n\n'),
  }))

  return {
    cells: [
      { kind: 'markdown', label: 'Title', source: title },
      { kind: 'code', label: 'Setup', source: setup },
      ...stopCells,
    ],
    gaps,
  }
}
