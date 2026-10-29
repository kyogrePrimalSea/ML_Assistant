// @vitest-environment node
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ItemRecord } from '../content/types.ts'
import { rec } from './fixtures.ts'
import {
  FLOW2_QUESTIONS,
  SHORT_LIST_SIZE,
  nextQuestion,
  profileOf,
  recommendModels,
  type Flow2Answers,
} from './flow2.ts'
import { fullList } from './proposals.ts'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const dataDir = join(appDir, 'public', 'data', 'pages')

/** Every record from the content build output (public/data/pages), as the app loads them. */
function realRecords(): ItemRecord[] {
  return readdirSync(dataDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8')).record as ItemRecord)
}

const regression: Flow2Answers = { task_type: 'regression', time_ordered: false }
const wideRegression: Flow2Answers = { ...regression, wide: true }

describe('nextQuestion', () => {
  it('asks the task type first and the imbalance question only for a classifier', () => {
    expect(nextQuestion({})?.field).toBe('task_type')
    const asked: string[] = []
    const answers: Flow2Answers = { task_type: 'regression' }
    for (let i = 0; i < 20; i++) {
      const q = nextQuestion(answers)
      if (!q) break
      asked.push(q.field)
      answers[q.field] = null
    }
    expect(asked).not.toContain('imbalanced')
    expect(asked).toHaveLength(FLOW2_QUESTIONS.length - 2) // task type and imbalance are not in this list

    expect(nextQuestion({ task_type: 'classification', time_ordered: false, has_missing: null, has_categoricals: null })?.field).toBe(
      'imbalanced',
    )
  })

  it('returns null once every applicable question has an answer', () => {
    const answers: Flow2Answers = { task_type: 'regression' }
    for (const q of FLOW2_QUESTIONS) if (!q.task_types) answers[q.field] = null
    expect(nextQuestion(answers)).toBeNull()
  })
})

describe('profileOf', () => {
  it('is null until the task type and time order are answered', () => {
    expect(profileOf({})).toBeNull()
    expect(profileOf({ task_type: 'regression' })).toBeNull()
    expect(profileOf({ time_ordered: false })).toBeNull()
  })

  it('sets the time-series track only for time-ordered rows; a skipped answer is standard', () => {
    expect(profileOf({ task_type: 'regression', time_ordered: true })?.track).toBe('time-series')
    expect(profileOf({ task_type: 'regression', time_ordered: null })?.track).toBe('standard')
  })
})

describe('recommendModels over synthetic records', () => {
  const plain = rec('plain', 'model', 'model.linear', { tracks: ['standard'], rules: { task_types: ['regression'] } }).record
  const series = rec('series', 'model', 'model.linear', { tracks: ['time-series'], rules: { task_types: ['regression'] } }).record
  const other = rec('other', 'model', 'model.linear', { tracks: ['standard'], rules: { task_types: ['classification'] } }).record

  it('returns nothing until the task and time order are answered', () => {
    expect(recommendModels({}, [plain])).toEqual([])
  })

  it('never proposes a time-series model for rows that are not in time order, nor a standard one for time-ordered rows', () => {
    expect(recommendModels(regression, [plain, series]).map((p) => p.id)).toEqual(['plain'])
    const timed = recommendModels({ task_type: 'regression', time_ordered: true }, [plain, series])
    expect(timed.map((p) => p.id)).toEqual(['series'])
    expect(timed.every((p) => p.reasons.length === 0 || p.mark !== 'red')).toBe(true)
  })

  it('leaves a task mismatch out of the short list but keeps it in the full list', () => {
    expect(recommendModels(regression, [plain, other]).map((p) => p.id)).toEqual(['plain'])
    const full = fullList('model', [], profileOf(regression) as NonNullable<ReturnType<typeof profileOf>>, [plain, other])
    expect(full.map((p) => p.id).sort()).toEqual(['other', 'plain'])
  })

  it('lists the answer that made a model green on a use_when match', () => {
    const wide = rec('wide', 'model', 'model.linear', { tracks: ['standard'], rules: { task_types: ['regression'] } }).record
    wide.slots.use_avoid = { use_when: ['wide data'], avoid_when: [] }
    const [first] = recommendModels(wideRegression, [wide, plain])
    expect(first.id).toBe('wide')
    expect(first.mark).toBe('green')
    expect(first.notes.map((n) => n.field)).toContain('wide')
  })

  it('marks a model yellow with a note when an avoid_when phrase matches the answer', () => {
    const big = rec('big', 'model', 'model.linear', { tracks: ['standard'], rules: { task_types: ['regression'] } }).record
    big.slots.use_avoid = { use_when: [], avoid_when: ['large data'] }
    const [first] = recommendModels({ ...regression, size: 'large' }, [big])
    expect(first.mark).toBe('yellow')
    expect(first.notes.filter((n) => n.effect === 'yellow')).toEqual([expect.objectContaining({ field: 'size' })])
  })

  it('ranks the answer match first and caps the list', () => {
    const many = Array.from({ length: SHORT_LIST_SIZE + 3 }, (_, i) =>
      rec(`m${i}`, 'model', 'model.linear', { tracks: ['standard'], rules: { task_types: ['regression'] } }).record,
    )
    many[5].slots.use_avoid = { use_when: ['wide data'], avoid_when: [] }
    const out = recommendModels(wideRegression, [...many, plain])
    expect(out).toHaveLength(SHORT_LIST_SIZE)
    expect(out[0].id).toBe('m5')
    expect(out[0].mark).toBe('green')
  })
})

describe('recommendModels over real model records (content build output)', () => {
  const records = realRecords()
  const models = records.filter((r) => r.stage === 'model')

  it('loads the model pages from the build output', () => {
    expect(models.length).toBeGreaterThan(80)
  })

  it('wide data gives a non-empty short list, with the wide-data models first (ahead of steps still to add)', () => {
    const out = recommendModels(wideRegression, records)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThanOrEqual(SHORT_LIST_SIZE)
    expect(out.every((p) => p.mark !== 'red')).toBe(true)
    // The pages say "wide data" / "more features than rows" for these three models.
    expect(out.slice(0, 3).map((p) => p.id).sort()).toEqual(['lars', 'lasso-lars', 'pls-regression'])
    expect(out.find((p) => p.id === 'lars')?.notes.map((n) => n.field)).toContain('wide')
  })

  it('time-ordered data proposes only time-series models', () => {
    const out = recommendModels({ task_type: 'regression', time_ordered: true }, records)
    expect(out.length).toBeGreaterThan(0)
    for (const p of out) {
      const r = models.find((m) => m.id === p.id) as ItemRecord
      expect(r.tracks).toContain('time-series')
    }
  })

  it('no real proposal is red, and every proposal lists the answers behind it', () => {
    const out = recommendModels({ ...wideRegression, size: 'large', need_explanation: true }, records)
    expect(out.length).toBe(SHORT_LIST_SIZE)
    for (const p of out) {
      expect(p.mark).not.toBe('red')
      expect(p.notes.length).toBeGreaterThan(0)
    }
  })

  it('every phrase the question cues use is on a real model page', () => {
    const src = readFileSync(join(appDir, 'src', 'build', 'flow2.ts'), 'utf8')
    const cueBlock = src.slice(src.indexOf('const CUES'), src.indexOf('const ANSWER_LABEL'))
    const phrases = [...cueBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((p) => !['wide', 'size', 'need_explanation', 'imbalanced', 'has_missing', 'has_categoricals', 'use_when', 'avoid_when', 'small', 'large', 'true', 'false'].includes(p) && !p.startsWith('field'))
    const listed = new Set(models.flatMap((m) => [...m.slots.use_avoid.use_when, ...m.slots.use_avoid.avoid_when].map((s) => s.trim().toLowerCase())))
    const missing = phrases.filter((p) => !listed.has(p))
    expect(missing).toEqual([])
  })
})
