import { realIndex } from '@/test-data'
import { buildSearchDocs, displayOf, norm, runSearch } from './search'

const docs = buildSearchDocs(realIndex)
const ids = (q: string, goal = 'predict-number') => {
  const r = runSearch(docs, q, goal)
  return { here: r.here.map((x) => x.doc.id), other: r.other.map((x) => x.doc.id) }
}

test('"overfit" finds the overfitting question', () => {
  expect(ids('overfit').here).toContain('model-overfitting')
})

test('"outliers" finds RobustScaler by pick_when and the robust family by its Questions label', () => {
  const r = ids('outliers').here
  expect(r).toContain('robustscaler')
  expect(r).toContain('model.awkward.robust')
})

test('a code name finds its page, with punctuation ignored', () => {
  expect(ids('max_depth').here[0]).toBe('max-depth')
})

test('the we_need_but stem is searchable', () => {
  expect(ids('We need XGBoost').here).toContain('but-xgb-text')
  expect(ids('rare class', 'predict-category').here).toEqual(expect.arrayContaining(['but-rare-class-model', 'but-rare-class-split']))
})

test('a question follows the goals of its answers, not just its track', () => {
  const r = ids('rare class is under')
  expect(r.here).not.toContain('but-rare-class-model')
  expect(r.other).toContain('but-rare-class-model')
})

test('one typo is tolerated for longer words, and the other label set is searched', () => {
  expect(ids('overfiting').here).toContain('model-overfitting')
  const q = realIndex.taxonomy.labels['model.awkward.robust']
  expect(ids(q.names_label).here).toContain('model.awkward.robust')
})

test('a forecast-only page appears under Other goals when another goal is current', () => {
  const inView = (g: string) => {
    const out = new Set<string>()
    const walk = (n: { id: string; level: string; children: never[] }) => {
      if (n.level === 'page') out.add(n.id)
      n.children.forEach(walk)
    }
    realIndex.taxonomy.views[g].forEach((n) => walk(n as never))
    return out
  }
  const only = [...inView('forecast')].find((id) => !inView('predict-number').has(id))!
  expect(only).toBeTruthy()
  const name = realIndex.pages.find((p) => p.id === only)!.plain_name
  expect(ids(name, 'predict-number').other).toContain(only)
  expect(ids(name, 'predict-number').here).not.toContain(only)
  expect(ids(name, 'forecast').here).toContain(only)
})

test('display lines follow the label mode', () => {
  const d = docs.find((x) => x.id === 'model.awkward.robust')!
  const q = realIndex.taxonomy.labels['model.awkward.robust']
  expect(displayOf(d, 'names', 'predict-number')).toEqual({ label: q.names_label, second: 'We have outliers' })
  expect(displayOf(d, 'questions', 'predict-number').label).toBe('We have outliers')
  expect(displayOf(docs.find((x) => x.id === 'robustscaler')!, 'names', 'predict-number').second).toMatch(/outlier/i)
  expect(norm('Max_Depth!')).toBe('max depth')
})
