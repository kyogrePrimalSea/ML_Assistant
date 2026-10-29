// Notebook v2 (spec section 8.1): one cell per stage that holds a pick, in stage order. Every
// template reads and writes only the names in vocab.ts, so each cell's output is the next cell's
// input. Deterministic: the same picks give a byte-identical .ipynb whatever order they arrive in.
// notebook.ts stays the v1 output the Build view uses; this file is additive.
import type { ItemRecord, StageId } from '../content/types.ts'
import type { Cell } from './notebook.ts'
import { STAGE_ORDER, type DataProfile, type Pick } from './validate.ts'
import { VOCAB } from './vocab.ts'

/** A pick with no fixed template. Its stage gets a TODO cell, and it is listed here. */
export interface Gap {
  id: string
  stage: StageId
  plain_name: string
}

export interface Notebook {
  cells: Cell[]
  gaps: Gap[]
  /** Cells that read a vocabulary name no earlier cell sets. The notebook still builds. */
  warnings: string[]
}

/** What the rest of the route holds. Lets one template change its code when another page is picked. */
interface Ctx {
  profile: DataProfile
  record: ItemRecord
  /** Page ids in the pipeline, pipeline order. */
  ids: string[]
  /** A transform template is in the route, so an earlier cell sets `preprocess`. */
  preprocess: boolean
  /** A select template is in the route, so an earlier cell sets `selector`. */
  selector: boolean
  /** The time-ordered splitter is in the route, so an earlier cell sets `cv`. */
  cv: boolean
  /** A tune template is in the route, so an earlier cell sets `search`. */
  search: boolean
  /** Page id of the model pick, when it has a template. */
  modelId?: string
}

/** One ColumnTransformer entry: a transform step and the vocabulary name of the columns it works on. */
interface Step {
  name: string
  expr: string
  cols: 'numeric_cols' | 'categorical_cols'
}

interface Part {
  imports: string[]
  code: string
  /** Vocabulary names this cell reads from earlier cells. Feeds the missing-producer check. */
  reads: string[]
  /** Vocabulary names this cell sets. */
  writes: string[]
  /** Transform steps are joined into one ColumnTransformer by the transform cell, not written directly. */
  step?: Step
}

const estimator = (ctx: Ctx) => (ctx.profile.task_type === 'classification' ? 'Classifier' : 'Regressor')
const fitted = (ctx: Ctx) => (ctx.search ? 'search' : 'model')

/** The model step, chained after the earlier steps in one Pipeline and fitted on training rows. */
function modelPart(ctx: Ctx, est: string, imports: string[], label: string): Part {
  const steps = [
    ...(ctx.preprocess ? ['("preprocess", preprocess)'] : []),
    ...(ctx.selector ? ['("select", selector)'] : []),
    `("model", ${est})`,
  ]
  return {
    imports: ['from sklearn.pipeline import Pipeline', ...imports],
    code: `# Model: ${label}, chained after the earlier steps in one Pipeline.
model = Pipeline([
${steps.map((s) => `    ${s},`).join('\n')}
])
model.fit(X_train, y_train)`,
    reads: [...(ctx.preprocess ? ['preprocess'] : []), ...(ctx.selector ? ['selector'] : []), 'X_train', 'y_train'],
    writes: ['model'],
  }
}

/** A transform step. The transform cell joins these into one ColumnTransformer (see transformCode). */
const transformStep = (name: string, expr: string, cols: Step['cols'], imports: string[]): Part => ({
  imports,
  code: '',
  reads: [cols],
  writes: ['preprocess'],
  step: { name, expr, cols },
})

/** Tuning grids for the templated models. Keys name the model step inside the Pipeline. */
const GRIDS: Record<string, string> = {
  'linear-regression': '{"model__fit_intercept": [True, False]}',
  'logistic-regression': '{"model__C": [0.1, 1.0, 10.0]}',
  ridge: '{"model__alpha": [0.1, 1.0, 10.0]}',
  'elastic-net': '{"model__alpha": [0.01, 0.1, 1.0]}',
  'random-forest': '{"model__max_depth": [3, 6, 9], "model__min_samples_leaf": [1, 5]}',
  'hist-gradient-boosting': '{"model__max_iter": [100, 200], "model__learning_rate": [0.05, 0.1]}',
  xgboost: '{"model__max_depth": [3, 4, 5]}',
}

/** Fixed templates per page, written in the shared vocabulary. Pages not listed here are gaps. */
const TEMPLATES: Record<string, (ctx: Ctx) => Part> = {
  // Transform: one ColumnTransformer entry per step.
  onehotencoder: () =>
    transformStep('onehotencoder', 'OneHotEncoder(handle_unknown="ignore")', 'categorical_cols', [
      'from sklearn.preprocessing import OneHotEncoder',
    ]),
  ordinalencoder: () =>
    transformStep('ordinalencoder', 'OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)', 'categorical_cols', [
      'from sklearn.preprocessing import OrdinalEncoder',
    ]),
  targetencoder: () =>
    transformStep('targetencoder', 'TargetEncoder()', 'categorical_cols', ['from sklearn.preprocessing import TargetEncoder']),
  minmaxscaler: () =>
    transformStep('minmaxscaler', 'MinMaxScaler()', 'numeric_cols', ['from sklearn.preprocessing import MinMaxScaler']),
  robustscaler: () =>
    transformStep('robustscaler', 'RobustScaler()', 'numeric_cols', ['from sklearn.preprocessing import RobustScaler']),

  // Select: one selector, fitted inside the model Pipeline on training rows.
  selectkbest: (ctx) => {
    const score = ctx.profile.task_type === 'classification' ? 'f_classif' : 'f_regression'
    return {
      imports: [`from sklearn.feature_selection import SelectKBest, ${score}`],
      code: `# Select: keep the 5 columns with the strongest link to the target. The Pipeline fits it on training rows only.
selector = SelectKBest(score_func=${score}, k=5)`,
      reads: [],
      writes: ['selector'],
    }
  },

  // Split.
  'train-test-split': (ctx) =>
    ctx.profile.time_ordered
      ? {
          imports: ['from sklearn.model_selection import train_test_split'],
          code: `# Split: hold out the latest rows for testing. Rows are not shuffled, so future rows never land in training.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, shuffle=False)`,
          reads: ['X', 'y'],
          writes: ['X_train', 'X_test', 'y_train', 'y_test'],
        }
      : {
          imports: ['from sklearn.model_selection import train_test_split'],
          code: `# Split: hold rows out for testing.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)`,
          reads: ['X', 'y'],
          writes: ['X_train', 'X_test', 'y_train', 'y_test'],
        },
  timeseriessplit: () => ({
    imports: ['from sklearn.model_selection import TimeSeriesSplit'],
    code: `# Split: time-ordered folds for tuning. Each fold trains on the past and tests on the block after it.
cv = TimeSeriesSplit(n_splits=3)`,
    reads: [],
    writes: ['cv'],
  }),

  // Model: every model is a Pipeline whose last step is named "model", so tuning keys stay the same.
  'linear-regression': (ctx) =>
    modelPart(ctx, 'LinearRegression()', ['from sklearn.linear_model import LinearRegression'], 'linear regression'),
  'logistic-regression': (ctx) =>
    modelPart(ctx, 'LogisticRegression(max_iter=1000)', ['from sklearn.linear_model import LogisticRegression'], 'logistic regression'),
  ridge: (ctx) => modelPart(ctx, 'Ridge(alpha=1.0)', ['from sklearn.linear_model import Ridge'], 'ridge regression'),
  'elastic-net': (ctx) =>
    modelPart(ctx, 'ElasticNet(alpha=0.1, l1_ratio=0.5)', ['from sklearn.linear_model import ElasticNet'], 'elastic net'),
  'random-forest': (ctx) =>
    modelPart(
      ctx,
      `RandomForest${estimator(ctx)}(n_estimators=200, random_state=42)`,
      [`from sklearn.ensemble import RandomForest${estimator(ctx)}`],
      'random forest',
    ),
  'hist-gradient-boosting': (ctx) =>
    modelPart(
      ctx,
      `HistGradientBoosting${estimator(ctx)}(max_iter=200, learning_rate=0.05, random_state=42)`,
      [`from sklearn.ensemble import HistGradientBoosting${estimator(ctx)}`],
      'histogram gradient boosting',
    ),
  xgboost: (ctx) =>
    modelPart(ctx, `XGB${estimator(ctx)}(n_estimators=300, learning_rate=0.05, max_depth=4, random_state=42)`, [`from xgboost import XGB${estimator(ctx)}`], 'XGBoost'),

  // Tune: grid search over the model's Pipeline keys, on training rows only.
  gridsearchcv: (ctx) => {
    const grid = ctx.modelId !== undefined && has(GRIDS, ctx.modelId) ? GRIDS[ctx.modelId] : '{}'
    const todo = grid === '{}' ? '# TODO: set the settings to try, for example {"model__<setting>": [...]}\n' : ''
    return {
      imports: ['from sklearn.model_selection import GridSearchCV'],
      code: `# Tune: try each setting in param_grid with cross-validation on training rows only, then keep the best.
${todo}search = GridSearchCV(model, param_grid=${grid}, cv=${ctx.cv ? 'cv' : '3'})
search.fit(X_train, y_train)`,
      reads: ['model', 'X_train', 'y_train', ...(ctx.cv ? ['cv'] : [])],
      writes: ['search'],
    }
  },

  // Evaluate: predictions come from the tuned search when one is in the route.
  'r2-score': (ctx) => ({
    imports: ['from sklearn.metrics import r2_score'],
    code: `# Evaluate: R-squared on the held-out rows (1.0 is perfect).
y_pred = ${fitted(ctx)}.predict(X_test)
print("R2:", r2_score(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'accuracy-score': (ctx) => ({
    imports: ['from sklearn.metrics import accuracy_score'],
    code: `# Evaluate: share of held-out rows predicted correctly.
y_pred = ${fitted(ctx)}.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'f1-score': (ctx) => ({
    imports: ['from sklearn.metrics import f1_score'],
    code: `# Evaluate: F1 on the held-out rows, the balance of precision and recall (for a yes/no target).
y_pred = ${fitted(ctx)}.predict(X_test)
print("F1:", f1_score(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'precision-score': (ctx) => ({
    imports: ['from sklearn.metrics import precision_score'],
    code: `# Evaluate: of the rows predicted positive, the share that really are (for a yes/no target).
y_pred = ${fitted(ctx)}.predict(X_test)
print("Precision:", precision_score(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'confusion-matrix': (ctx) => ({
    imports: ['from sklearn.metrics import confusion_matrix'],
    code: `# Evaluate: rows are the true classes, columns the predicted ones.
y_pred = ${fitted(ctx)}.predict(X_test)
print(confusion_matrix(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'roc-auc-score': (ctx) => ({
    imports: ['from sklearn.metrics import roc_auc_score'],
    code: `# Evaluate: class probabilities, then ROC AUC from the positive-class column (1.0 is perfect).
y_proba = ${fitted(ctx)}.predict_proba(X_test)
print("ROC AUC:", roc_auc_score(y_test, y_proba[:, 1]))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_proba'],
  }),
  'root-mean-squared-error': (ctx) => ({
    imports: ['from sklearn.metrics import root_mean_squared_error'],
    code: `# Evaluate: typical size of a prediction error, in the target's own units (lower is better).
y_pred = ${fitted(ctx)}.predict(X_test)
print("RMSE:", root_mean_squared_error(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),
  'mean-absolute-error': (ctx) => ({
    imports: ['from sklearn.metrics import mean_absolute_error'],
    code: `# Evaluate: average size of a prediction error, in the target's own units (lower is better).
y_pred = ${fitted(ctx)}.predict(X_test)
print("MAE:", mean_absolute_error(y_test, y_pred))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: ['y_pred'],
  }),

  // Interpret.
  'permutation-importance': (ctx) => ({
    imports: ['from sklearn.inspection import permutation_importance'],
    code: `# Interpret: how much the held-out score drops when one column is shuffled. A bigger drop means a more useful column.
print(permutation_importance(${fitted(ctx)}, X_test, y_test, n_repeats=10, random_state=42).importances_mean.round(2))`,
    reads: [fitted(ctx), 'X_test', 'y_test'],
    writes: [],
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
    reads: [],
    writes: [],
  }
}

/** The transform cell: one ColumnTransformer, one entry per column group (steps on the same columns chain). */
function transformCode(steps: Step[]): { code: string; imports: string[] } {
  const groups = new Map<Step['cols'], Step[]>()
  for (const s of steps) groups.set(s.cols, [...(groups.get(s.cols) ?? []), s])
  const entries = [...groups].map(([cols, list]) =>
    list.length === 1
      ? `        ("${list[0].name}", ${list[0].expr}, ${cols}),`
      : `        ("${cols === 'categorical_cols' ? 'categorical' : 'numeric'}", Pipeline([${list
          .map((s) => `("${s.name}", ${s.expr})`)
          .join(', ')}]), ${cols}),`,
  )
  const chained = [...groups.values()].some((list) => list.length > 1)
  return {
    code: `# Transform: each step works on its own columns. It is fitted inside the Pipeline below, on training rows only, so no test rows leak in.
preprocess = ColumnTransformer(
    [
${entries.join('\n')}
    ],
    remainder="passthrough",
)`,
    imports: ['from sklearn.compose import ColumnTransformer', ...(chained ? ['from sklearn.pipeline import Pipeline'] : [])],
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
const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** Title, setup, then one cell per stage that holds a pick (stage order, then page id within a stage). */
export function buildNotebookV2(picks: Pick[], profile: DataProfile): Notebook {
  const ordered = [...picks].sort(
    (a, b) => STAGE_ORDER.indexOf(a.record.stage) - STAGE_ORDER.indexOf(b.record.stage) || byId(a.record.id, b.record.id),
  )
  const ids = ordered.map((p) => p.record.id)
  const templated = (p: Pick) => has(TEMPLATES, p.record.id)
  const stageHas = (s: StageId) => ordered.some((p) => p.record.stage === s && templated(p))
  const modelPick = ordered.find((p) => p.record.stage === 'model' && templated(p))
  const shared = {
    profile,
    ids,
    preprocess: stageHas('transform'),
    selector: stageHas('select'),
    cv: ordered.some((p) => p.record.id === 'timeseriessplit' && templated(p)),
    search: stageHas('tune'),
    modelId: modelPick?.record.id,
  }
  const parts = ordered.map((p) => (templated(p) ? TEMPLATES[p.record.id]({ ...shared, record: p.record }) : gapPart(p.record)))
  const gaps: Gap[] = ordered
    .filter((p) => !templated(p))
    .map((p) => ({ id: p.record.id, stage: p.record.stage, plain_name: p.record.plain_name }))

  // One stop per stage that holds a pick. Transform steps are joined into one ColumnTransformer.
  const stops = STAGE_ORDER.filter((s) => ordered.some((p) => p.record.stage === s)).map((s, i) => {
    const stagePicks = ordered.map((p, j) => ({ p, part: parts[j] })).filter(({ p }) => p.record.stage === s)
    const stagePartsList = stagePicks.map((x) => x.part)
    const steps = stagePartsList.flatMap((part) => (part.step ? [part.step] : []))
    const codes = stagePartsList.filter((part) => !part.step).map((part) => part.code)
    const extra = steps.length ? transformCode(steps) : undefined
    return {
      label: `Stop ${i + 1}: ${stageName(s)}`,
      parts: stagePartsList,
      source: [...codes, ...(extra ? [extra.code] : [])].join('\n\n'),
      extraImports: extra?.imports ?? [],
    }
  })

  const imports = [
    ...new Set([
      'import pandas as pd',
      ...parts.flatMap((p) => p.imports),
      ...stops.flatMap((s) => s.extraImports),
    ]),
  ].sort((a, b) => (importKey(a) < importKey(b) ? -1 : importKey(a) > importKey(b) ? 1 : 0))

  // Missing-producer check: a cell may read a name only if an earlier cell (or the setup) sets it.
  const defined = new Set(VOCAB.filter((v) => v.producedBy === 'explore').map((v) => v.name))
  const warnings: string[] = []
  for (const stop of stops) {
    const reads = [...new Set(stop.parts.flatMap((p) => p.reads))]
    for (const name of reads) if (!defined.has(name)) warnings.push(`${stop.label} reads ${name}, which no earlier cell sets`)
    for (const p of stop.parts) for (const name of p.writes) defined.add(name)
  }

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

  const cells: Cell[] = [
    { kind: 'markdown', label: 'Title', source: title },
    { kind: 'code', label: 'Setup', source: setup },
    ...stops.map((s): Cell => ({ kind: 'code', label: s.label, source: s.source })),
  ]
  return { cells, gaps, warnings }
}
