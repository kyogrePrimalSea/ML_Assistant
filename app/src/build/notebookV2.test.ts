import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { rec } from './fixtures.ts'
import { toIpynb, type Cell } from './notebook.ts'
import { buildNotebookV2, TEMPLATED_PAGE_IDS, type Notebook } from './notebookV2.ts'
import { DEMO_PROFILE } from './demoPipeline.ts'
import { STAGE_ORDER, type DataProfile, type Pick } from './validate.ts'
import { VOCAB, VOCAB_BY_NAME, VOCAB_NAMES } from './vocab.ts'
import type { ItemRecord, StageId } from '../content/types.ts'

// The page records (content/items/<stage>/<id>.yaml) that the templates were written from.
const ITEMS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content', 'items')

/** A pick built from the page's real record, so the test uses its own stage and snippet. */
function realPick(id: string): Pick {
  for (const stage of readdirSync(ITEMS)) {
    const file = join(ITEMS, stage, `${id}.yaml`)
    if (existsSync(file)) return { record: load(readFileSync(file, 'utf8')) as ItemRecord }
  }
  throw new Error(`no record for ${id}`)
}

const CLASSIFICATION: DataProfile = { ...DEMO_PROFILE, task_type: 'classification' }

const picks = (): Pick[] => [
  rec('r2-score', 'evaluate', 'Regression metrics'),
  rec('train-test-split', 'split', 'Splitters'),
  rec('onehotencoder', 'transform', 'Categorical encoding'),
  rec('xgboost', 'model', 'Gradient boosting'),
]

// Python's ast module parses each cell (no execution). Per top-level statement it lists the names
// read (Load), the names bound (Store) and the names imported, in source order.
const PY_ANALYSE = `
import ast, json, sys
cells = json.load(sys.stdin)
out = []
for src in cells:
    stmts = []
    for node in ast.parse(src).body:
        loads, stores, imports = set(), set(), set()
        for n in ast.walk(node):
            if isinstance(n, ast.Name):
                (loads if isinstance(n.ctx, ast.Load) else stores).add(n.id)
            elif isinstance(n, (ast.Import, ast.ImportFrom)):
                imports.update((a.asname or a.name).split('.')[0] for a in n.names)
        stmts.append({'loads': sorted(loads), 'stores': sorted(stores), 'imports': sorted(imports)})
    out.append(stmts)
print(json.dumps(out))
`

interface Stmt { loads: string[]; stores: string[]; imports: string[] }

/** Throws if any source does not parse (python3 exits non-zero on a syntax error). */
function analyse(sources: string[]): Stmt[][] {
  const out = execFileSync('python3', ['-c', PY_ANALYSE], { input: JSON.stringify(sources), encoding: 'utf8' })
  return JSON.parse(out) as Stmt[][]
}

const BUILTINS = new Set(['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple'])
const stageFromLabel = (label: string): StageId | undefined =>
  STAGE_ORDER.find((s) => label.endsWith(`: ${s[0].toUpperCase()}${s.slice(1)}`))

/** Each code cell with its stage (the setup cell is 'explore') and its analysed statements. */
function analysedCells(nb: Notebook): { cell: Cell; stage: StageId | undefined; stmts: Stmt[] }[] {
  const codeCells = nb.cells.filter((c) => c.kind === 'code')
  const analysed = analyse(codeCells.map((c) => c.source))
  return codeCells.map((cell, i) => ({
    cell,
    stage: cell.label === 'Setup' ? 'explore' : stageFromLabel(cell.label),
    stmts: analysed[i],
  }))
}

/** Problems with the chain: names read before any earlier cell set them, and writes outside the vocabulary or their stage. */
function chainProblems(nb: Notebook): string[] {
  const defined = new Set<string>()
  const problems: string[] = []
  for (const { cell, stage, stmts } of analysedCells(nb)) {
    for (const s of stmts) {
      for (const name of s.loads) {
        if (!defined.has(name) && !BUILTINS.has(name)) problems.push(`${cell.label}: reads ${name} before it is set`)
      }
      for (const name of s.stores) {
        const v = VOCAB_BY_NAME.get(name)
        if (!v) problems.push(`${cell.label}: writes ${name}, which is not in the vocabulary`)
        else if (v.producedBy !== stage) problems.push(`${cell.label}: writes ${name}, which vocab.ts assigns to ${v.producedBy}`)
        defined.add(name)
      }
      for (const name of s.imports) defined.add(name)
    }
  }
  return problems
}

describe('notebookV2', () => {
  it('has a title, a setup cell and one cell per stage that holds a pick, in stage order', () => {
    const nb = buildNotebookV2(picks(), DEMO_PROFILE)
    expect(nb.cells.map((c) => c.label)).toEqual([
      'Title', 'Setup', 'Stop 1: Transform', 'Stop 2: Split', 'Stop 3: Model', 'Stop 4: Evaluate',
    ])
    expect(nb.gaps).toEqual([])
  })

  it('is byte-identical for the same picks, and for the same picks given in another order', () => {
    const a = toIpynb(buildNotebookV2(picks(), DEMO_PROFILE).cells)
    expect(toIpynb(buildNotebookV2(picks(), DEMO_PROFILE).cells)).toBe(a)
    expect(toIpynb(buildNotebookV2(picks().reverse(), DEMO_PROFILE).cells)).toBe(a)
  })

  it('writes nbformat 4 JSON', () => {
    const nb = JSON.parse(toIpynb(buildNotebookV2(picks(), DEMO_PROFILE).cells))
    expect(nb.nbformat).toBe(4)
    expect(nb.cells[0].cell_type).toBe('markdown')
    expect(nb.cells[3].source.join('')).toContain('train_test_split(X, y')
  })

  it('keeps the user edits in the setup cell, each under a TODO comment', () => {
    const setup = buildNotebookV2(picks(), DEMO_PROFILE).cells[1].source
    const lines = setup.split('\n')
    const edits = lines.map((l, i) => [l, i] as const).filter(([l]) => l.includes('TODO_'))
    expect(edits.map(([l]) => l.split(' = ')[0])).toEqual([
      'df', 'target', 'categorical_cols', 'numeric_cols',
    ])
    for (const [, i] of edits) expect(lines[i - 1]).toMatch(/^# TODO: /)
  })

  it('has every stage cell read only names set by earlier cells, and write only its own', () => {
    expect(chainProblems(buildNotebookV2(picks(), DEMO_PROFILE))).toEqual([])
  })

  it('lists every cross-cell read in consumedBy in vocab.ts', () => {
    const cross: string[] = []
    const defined = new Set<string>()
    for (const { cell, stage, stmts } of analysedCells(buildNotebookV2(picks(), DEMO_PROFILE))) {
      const here = new Set<string>()
      for (const s of stmts) {
        for (const name of s.loads) {
          if (!VOCAB_NAMES.has(name) || here.has(name) || stage === 'explore') continue
          if (defined.has(name) && !VOCAB_BY_NAME.get(name)?.consumedBy.includes(stage!)) {
            cross.push(`${cell.label}: reads ${name}, not listed in its consumedBy`)
          }
        }
        for (const name of s.stores) here.add(name)
      }
      for (const name of here) defined.add(name)
    }
    expect(cross).toEqual([])
  })

  it('generated code parses (checked with python ast, not executed)', () => {
    const nb = buildNotebookV2(picks(), DEMO_PROFILE)
    const parsed = analyse(nb.cells.filter((c) => c.kind === 'code').map((c) => c.source))
    expect(parsed).toHaveLength(nb.cells.filter((c) => c.kind === 'code').length)
  })

  it('gives a pick with no fixed template a TODO cell, and lists it in gaps', () => {
    const nb = buildNotebookV2([rec('mystery', 'select', 'x')], DEMO_PROFILE)
    expect(nb.gaps).toEqual([{ id: 'mystery', stage: 'select', plain_name: 'mystery' }])
    const stop = nb.cells.find((c) => c.label === 'Stop 1: Select')
    expect(stop?.source).toContain('TODO: no fixed template')
    // The TODO cell is comments only, so it reads and writes nothing.
    expect(chainProblems(nb)).toEqual([])
    expect(analysedCells(nb).find((a) => a.cell.label === 'Stop 1: Select')?.stmts).toEqual([])
  })

  it('puts every pick of one stage in one cell, and lists the untemplated one as a gap', () => {
    const nb = buildNotebookV2(
      [rec('standardscaler', 'transform', 'Scaling'), rec('onehotencoder', 'transform', 'Categorical encoding')],
      DEMO_PROFILE,
    )
    expect(nb.cells.filter((c) => c.label.startsWith('Stop '))).toHaveLength(1)
    expect(nb.cells[2].source).toContain('ColumnTransformer')
    expect(nb.cells[2].source).toContain('TODO: no fixed template')
    expect(nb.gaps.map((g) => g.id)).toEqual(['standardscaler'])
    expect(chainProblems(nb)).toEqual([])
  })

  it('has no gaps for the demo route', () => {
    expect(buildNotebookV2(picks(), DEMO_PROFILE).gaps).toEqual([])
  })

  it('uses only pages that have a fixed template as templated', () => {
    expect([...TEMPLATED_PAGE_IDS].sort()).toEqual([
      'accuracy-score', 'confusion-matrix', 'elastic-net', 'f1-score', 'gridsearchcv', 'hist-gradient-boosting',
      'linear-regression', 'logistic-regression', 'mean-absolute-error', 'minmaxscaler', 'onehotencoder',
      'ordinalencoder', 'permutation-importance', 'precision-score', 'r2-score', 'random-forest', 'ridge',
      'robustscaler', 'roc-auc-score', 'root-mean-squared-error', 'selectkbest', 'targetencoder',
      'timeseriessplit', 'train-test-split', 'xgboost',
    ])
  })
})

describe('vocab', () => {
  it('lists the 16 spec names once each, plus selector and search (added by T071)', () => {
    expect(VOCAB.map((v) => v.name).sort()).toEqual([
      'X', 'X_test', 'X_train', 'categorical_cols', 'cv', 'df', 'model', 'numeric_cols',
      'preprocess', 'scores', 'search', 'selector', 'target', 'y', 'y_pred', 'y_proba', 'y_test', 'y_train',
    ])
  })

  it('names only stages from the pipeline order', () => {
    for (const v of VOCAB) {
      expect(STAGE_ORDER).toContain(v.producedBy)
      for (const s of v.consumedBy) expect(STAGE_ORDER).toContain(s)
    }
  })
})

describe('notebookV2 templates (T071)', () => {
  it('has a page record in content/items for every templated page, with the same id', () => {
    for (const id of TEMPLATED_PAGE_IDS) expect(realPick(id).record.id).toBe(id)
  })

  it('every template parses for both task types (python ast, not executed)', () => {
    const sources: string[] = []
    for (const profile of [DEMO_PROFILE, CLASSIFICATION]) {
      for (const id of TEMPLATED_PAGE_IDS) {
        const nb = buildNotebookV2([realPick(id)], profile)
        sources.push(...nb.cells.filter((c) => c.kind === 'code').map((c) => c.source))
      }
    }
    expect(analyse(sources)).toHaveLength(sources.length)
  })

  it.each([
    ['regression', DEMO_PROFILE, ['onehotencoder', 'robustscaler', 'train-test-split', 'ridge', 'gridsearchcv', 'r2-score', 'root-mean-squared-error', 'permutation-importance']],
    ['classification', CLASSIFICATION, ['onehotencoder', 'minmaxscaler', 'selectkbest', 'train-test-split', 'logistic-regression', 'accuracy-score', 'f1-score', 'roc-auc-score', 'confusion-matrix']],
    ['time-ordered split', { ...DEMO_PROFILE, time_ordered: true }, ['minmaxscaler', 'timeseriessplit', 'train-test-split', 'linear-regression', 'gridsearchcv', 'mean-absolute-error']],
  ])('the %s route passes the chain check with no warnings and no gaps', (_, profile, ids) => {
    const nb = buildNotebookV2(ids.map(realPick), profile)
    expect(nb.gaps).toEqual([])
    expect(nb.warnings).toEqual([])
    expect(chainProblems(nb)).toEqual([])
  })

  it('evaluates and interprets the tuned search when a tune step is in the route', () => {
    const nb = buildNotebookV2(['ridge', 'gridsearchcv', 'r2-score', 'permutation-importance'].map(realPick), DEMO_PROFILE)
    const source = (label: string) => nb.cells.find((c) => c.label === label)?.source ?? ''
    expect(source('Stop 3: Evaluate')).toContain('y_pred = search.predict(X_test)')
    expect(source('Stop 4: Interpret')).toContain('print(permutation_importance(search, X_test, y_test')
    expect(source('Stop 2: Tune')).toContain('GridSearchCV(model, param_grid={"model__alpha": [0.1, 1.0, 10.0]}, cv=3)')
    expect(source('Stop 1: Model')).toContain('("model", Ridge(alpha=1.0)),')
  })

  it('warns when a cell reads a name no earlier cell sets, and still builds the notebook', () => {
    const nb = buildNotebookV2([realPick('linear-regression'), realPick('r2-score')], DEMO_PROFILE)
    expect(nb.warnings).toContain('Stop 1: Model reads X_train, which no earlier cell sets')
    expect(nb.warnings).toContain('Stop 1: Model reads y_train, which no earlier cell sets')
    expect(nb.warnings).toContain('Stop 2: Evaluate reads X_test, which no earlier cell sets')
    expect(nb.cells.map((c) => c.label)).toEqual(['Title', 'Setup', 'Stop 1: Model', 'Stop 2: Evaluate'])
  })

  it('has no warnings for the existing demo route', () => {
    expect(buildNotebookV2(picks(), DEMO_PROFILE).warnings).toEqual([])
  })

  it('gives the same output for picks in any order within a stage', () => {
    const forward = [realPick('robustscaler'), realPick('onehotencoder'), realPick('train-test-split'), realPick('ridge')]
    const a = toIpynb(buildNotebookV2(forward, DEMO_PROFILE).cells)
    expect(toIpynb(buildNotebookV2([...forward].reverse(), DEMO_PROFILE).cells)).toBe(a)
    const swapped = [realPick('minmaxscaler'), realPick('robustscaler')]
    expect(toIpynb(buildNotebookV2(swapped, DEMO_PROFILE).cells)).toBe(toIpynb(buildNotebookV2([...swapped].reverse(), DEMO_PROFILE).cells))
  })

  it('joins the transform steps into one ColumnTransformer, each on its own columns', () => {
    const nb = buildNotebookV2([realPick('onehotencoder'), realPick('robustscaler')], DEMO_PROFILE)
    const transform = nb.cells.find((c) => c.label === 'Stop 1: Transform')?.source ?? ''
    expect(transform).toContain('("onehotencoder", OneHotEncoder(handle_unknown="ignore"), categorical_cols),')
    expect(transform).toContain('("robustscaler", RobustScaler(), numeric_cols),')
    expect(transform.match(/ColumnTransformer\(/g)).toHaveLength(1)
  })

  it('does not shuffle a time-ordered split', () => {
    const nb = buildNotebookV2([realPick('train-test-split')], { ...DEMO_PROFILE, time_ordered: true })
    const split = nb.cells.find((c) => c.label === 'Stop 1: Split')?.source ?? ''
    expect(split).toContain('shuffle=False')
    expect(split).not.toContain('random_state')
  })
})
