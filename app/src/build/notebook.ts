// Notebook output (spec section 8): one cell per stop from fixed templates. Deterministic:
// the same picks always give a byte-identical .ipynb (no dates, no random ids).
import type { ItemRecord } from '../content/types.ts'
import type { DataProfile, Pick } from './validate.ts'
import { sortPicks } from './validate.ts'

export interface Cell {
  kind: 'markdown' | 'code'
  /** Short label shown above the cell in the notebook view. Not part of the .ipynb. */
  label: string
  source: string
}

interface Ctx {
  profile: DataProfile
  record: ItemRecord
  /** Page ids in the pipeline, pipeline order. */
  ids: string[]
}
interface Part { imports: string[]; code: string }

const estimator = (ctx: Ctx) => (ctx.profile.task_type === 'classification' ? 'Classifier' : 'Regressor')

/** Fixed templates per page. Pages without one get a TODO cell carrying the guide's snippet. */
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
    const steps = ctx.ids.some((id) => id === 'onehotencoder')
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

function fallback(record: ItemRecord): Part {
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

/** Cells in pipeline order: title, setup, then one cell per stop. */
export function buildCells(profile: DataProfile, picks: Pick[]): Cell[] {
  const ordered = sortPicks(picks)
  const ids = ordered.map((p) => p.record.id)
  const parts = ordered.map((p) => {
    const ctx: Ctx = { profile, record: p.record, ids }
    return (TEMPLATES[p.record.id] ?? (() => fallback(p.record)))(ctx)
  })
  const imports = [...new Set(['import pandas as pd', ...parts.flatMap((p) => p.imports)])].sort(
    (a, b) => (importKey(a) < importKey(b) ? -1 : importKey(a) > importKey(b) ? 1 : 0),
  )

  const title = `# Pipeline from ML Field Guide

Data profile: ${profile.task_type}, ${profile.track} track, ${flag(profile.has_categoricals, 'has', 'no')} text categories, ${flag(profile.has_missing, 'has', 'no')} missing values, ${flag(profile.time_ordered, 'time-ordered', 'not time-ordered')}, ${flag(profile.imbalanced, 'imbalanced', 'balanced')}.

Steps, in order: ${ordered.map((p) => p.record.plain_name).join(', ')}.

Replace each \`TODO\` below, then run the cells from top to bottom.`

  const setup = `# Setup: libraries and data.
# ${versionStamp(ordered.map((p) => p.record))}
${imports.join('\n')}

# TODO: path to your data file.
df = pd.read_csv("TODO_path_to_data.csv")
# TODO: name of the column you want to predict.
target = "TODO_target_column"
# TODO: names of the text (categorical) columns.
categorical_cols = ["TODO_categorical_column"]

X = df.drop(columns=[target])
y = df[target]`

  return [
    { kind: 'markdown', label: 'Title', source: title },
    { kind: 'code', label: 'Setup', source: setup },
    ...ordered.map((p, i): Cell => ({
      kind: 'code',
      label: `Stop ${i + 1}: ${p.record.plain_name}`,
      source: parts[i].code,
    })),
  ]
}

function lines(source: string): string[] {
  const ls = source.split('\n')
  return ls.map((l, i) => (i < ls.length - 1 ? `${l}\n` : l))
}

/** nbformat 4.5 JSON. Cell ids are positional so the output never varies. */
export function toIpynb(cells: Cell[]): string {
  const nb = {
    cells: cells.map((c, i) =>
      c.kind === 'markdown'
        ? { cell_type: 'markdown', id: `cell-${i}`, metadata: {}, source: lines(c.source) }
        : { cell_type: 'code', execution_count: null, id: `cell-${i}`, metadata: {}, outputs: [], source: lines(c.source) },
    ),
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }
  return JSON.stringify(nb, null, 1) + '\n'
}

export const NOTEBOOK_FILENAME = 'ml-field-guide-pipeline.ipynb'
